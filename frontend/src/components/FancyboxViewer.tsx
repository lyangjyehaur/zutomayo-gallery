import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Fancybox as NativeFancybox } from '@fancyapps/ui';
import '@fancyapps/ui/dist/fancybox/fancybox.css';

// 將 NativeFancybox 暴露給全域，讓 analytics.ts 可以存取 API 以獲取下載檔名
if (typeof window !== 'undefined') {
  (window as any).Fancybox = NativeFancybox;
}

import { MVMedia } from '@/lib/types';
import { getProxyImgUrl, isMediaVideo } from '@/lib/image';
import { GALLERY_BREAKPOINTS } from '@/components/galleryBreakpoints';
export { GALLERY_BREAKPOINTS } from '@/components/galleryBreakpoints';
import { useTranslation } from 'react-i18next';

interface FancyboxViewerProps {
  images: MVMedia[];
  mvTitle?: string;
  mvId?: string;
  itemsPerPage?: number;
  showHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  breakpointColumns?: typeof GALLERY_BREAKPOINTS;
  className?: string;
  enablePagination?: boolean;
  autoLoadMore?: boolean; // 新增配置項：是否自動載入下一頁
  onLightboxOpen?: () => void;
  onLightboxClose?: () => void;
}

const defaultBreakpointColumns = GALLERY_BREAKPOINTS;

interface ResponsiveMasonryProps {
  children: React.ReactNode;
  breakpointColumns?: typeof GALLERY_BREAKPOINTS;
  className?: string;
  columnClassName?: string;
}

const getColumnCount = (breakpointColumns: any) => {
  if (typeof window === 'undefined') return breakpointColumns.default ?? 2;
  const viewportWidth = window.innerWidth;
  
  const breakpoints = Object.keys(breakpointColumns)
    .map(k => parseInt(k, 10))
    .filter(k => !isNaN(k))
    .sort((a, b) => b - a);

  for (const bp of breakpoints) {
    if (viewportWidth >= bp) {
      return breakpointColumns[bp];
    }
  }
  
  return breakpointColumns.default ?? 2;
};

export function ResponsiveMasonry({
  children,
  breakpointColumns = GALLERY_BREAKPOINTS,
  className = '',
  columnClassName = '',
}: ResponsiveMasonryProps) {
  const [columnCount, setColumnCount] = useState(() => getColumnCount(breakpointColumns));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let rAFId: number;

    const updateColumns = () => {
      clearTimeout(timeoutId);
      if (rAFId) cancelAnimationFrame(rAFId);

      timeoutId = setTimeout(() => {
        rAFId = requestAnimationFrame(() => {
          setColumnCount(getColumnCount(breakpointColumns));
        });
      }, 150); // Debounce resize to prevent excessive re-renders
    };

    window.addEventListener('resize', updateColumns, { passive: true });
    return () => {
      window.removeEventListener('resize', updateColumns);
      clearTimeout(timeoutId);
      if (rAFId) cancelAnimationFrame(rAFId);
    };
  }, [breakpointColumns]);

  const distributeChildren = () => {
    const safeColumnCount = columnCount || 2;
    const columns: React.ReactNode[][] = Array.from({ length: safeColumnCount }, () => []);

    React.Children.forEach(children, (child, index) => {
      if (!child) return;
      const columnIndex = index % safeColumnCount;
      const key = React.isValidElement(child) && child.key ? child.key : index;
      columns[columnIndex].push(
        <div key={key} className={`w-full ${columnClassName}`}>
          {child}
        </div>,
      );
    });

    return columns;
  };

  const columns = distributeChildren();

  return (
    <div 
      className={`grid items-start gap-2 md:gap-3 ${className}`}
      style={{ gridTemplateColumns: `repeat(${columnCount || 1}, minmax(0, 1fr))` }}
    >
      {columns.map((columnChildren, index) => (
        <div key={index} className="flex flex-col gap-2 md:gap-3 min-w-0 w-full overflow-hidden">
          {columnChildren}
        </div>
      ))}
    </div>
  );
}

interface PhotoData {
  src: string;
  full: string;
  raw: string;
  caption: string;
  richText: string;
  width?: number;
  height?: number;
  rawFilename?: string;
  isVideo?: boolean;
  isGif?: boolean;
  groupId?: string;
  tweetUrl?: string;
  [key: string]: any;
}

// 輔助函數：從 URL 提取副檔名
const getExtensionFromUrl = (urlStr: string): string => {
  if (!urlStr) return 'jpg';
  try {
    const urlObj = new URL(urlStr);
    
    // 處理 Twitter 圖片
    if (urlObj.hostname === 'pbs.twimg.com') {
      const format = urlObj.searchParams.get('format');
      if (format) return format;
    }
    
    // 處理一般圖片網址
    const match = urlObj.pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (match) return match[1].toLowerCase();

    // 如果沒有副檔名但網域是 Twitter 影片，預設為 mp4
    if (urlObj.hostname === 'video.twimg.com') {
      return 'mp4';
    }
    
    return 'jpg';
  } catch {
    return 'jpg';
  }
};

const FancyboxCaptionOverlay = ({ api, photos }: { api: any; photos: PhotoData[] }) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(api?.getCarousel?.()?.getPage()?.index || 0);
  const [isZooming, setIsZooming] = useState(false);
  const [isThumbsHidden, setIsThumbsHidden] = useState(false);
  const [captionHeight, setCaptionHeight] = useState<number | 'auto'>('auto');
  const captionScrollRef = useRef<HTMLDivElement>(null);
  const captionContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carousel = api?.getCarousel?.();
    if (!carousel) return;

    const onChange = () => {
      setActiveIndex(carousel.getPage()?.index || 0);
    };

    carousel.on?.('change', onChange);

    const container = api?.getContainer?.() as HTMLElement | undefined;
    if (!container) return;

    const observer = new MutationObserver((mutations) => {
      // Fast path: Only process if classes changed on relevant elements
      let shouldUpdate = false;
      for (const m of mutations) {
        const target = m.target as HTMLElement;
        if (target.classList && (target.classList.contains('f-panzoom__wrapper') || target.classList.contains('f-thumbs'))) {
          shouldUpdate = true;
          break;
        }
      }

      if (!shouldUpdate) return;

      let zooming = false;
      // getElementsByClassName is faster than querySelectorAll
      const wrappers = container.getElementsByClassName('f-panzoom__wrapper');
      for (let i = 0; i < wrappers.length; i++) {
        if (wrappers[i].classList.contains('can-drag') || wrappers[i].classList.contains('will-zoom-out')) {
          zooming = true;
          break;
        }
      }
      setIsZooming(zooming);

      const hasClass = container.classList.contains('ztmy-is-zooming');
      if (zooming && !hasClass) {
        container.classList.add('ztmy-is-zooming');
      } else if (!zooming && hasClass) {
        container.classList.remove('ztmy-is-zooming');
      }

      const thumbs = container.getElementsByClassName('f-thumbs')[0];
      setIsThumbsHidden(thumbs ? thumbs.classList.contains('is-hidden') : false);
    });

    observer.observe(container, { attributes: true, subtree: true, attributeFilter: ['class'] });

    return () => {
      carousel.off?.('change', onChange);
      observer.disconnect();
    };
  }, [api]);

  const title = photos[activeIndex]?.caption ?? '';
  const richText = photos[activeIndex]?.richText ?? '';

  const isHidden = isZooming || isThumbsHidden;

  useEffect(() => {
    const el = captionScrollRef.current;
    if (!el) return;
    el.scrollTop = 0;

    // Calculate actual content height to animate to
    const contentEl = captionContentRef.current;
    if (contentEl) {
      // Temporarily remove height constraint to measure true content height
      const actualHeight = contentEl.scrollHeight + 32; // add padding (16px top + 16px bottom)
      
      // Cap at max-height (260px)
      setCaptionHeight(Math.min(actualHeight, 260));
    }
  }, [activeIndex, richText]);

  return (
    <div
      className={`ztmy-fb-caption-overlay ${isHidden ? 'is-hidden' : ''}`}
      onWheelCapture={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
      onTouchMoveCapture={(e) => e.stopPropagation()}
    >
      <div 
        className="ztmy-fb-caption-inner" 
        ref={captionScrollRef}
        style={{ height: captionHeight !== 'auto' ? `${captionHeight}px` : 'auto' }}
      >
        <div ref={captionContentRef}>
          <div className="ztmy-fb-caption-header">
            <h4>{title}</h4>
          </div>
          <div className="ztmy-fb-caption-rich">
            <div className="rich-text" dangerouslySetInnerHTML={{ __html: richText || t("app.no_desc", "暫無描述 (NO_METADATA_FOUND)") }} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface SkeletonItemProps {
  width?: number;
  height?: number;
  key?: string | number;
}

// 這個獨立的骨架元件不再需要了，但我們保留它以備後用，或者直接移除
// const SkeletonItem = ({ width, height }: SkeletonItemProps) => { ... }

const SkeletonHeader = () => (
  <header className="mb-8 lg:mb-12 border-b-8 border-border bg-card p-4 sm:p-6 shadow-neo-sm">
    <div className="h-8 sm:h-10 lg:h-12 bg-gray-200 rounded animate-pulse w-3/4 mb-3" />
    <div className="h-4 sm:h-5 bg-gray-200 rounded animate-pulse w-1/2" />
  </header>
);

const loadedImagesCache = new Set<string>();
const dimensionCache = new Map<string, { width: number; height: number }>();

interface PhotoItemProps {
  photo: PhotoData;
  index: number;
  onPhotoClick?: (index: number) => void;
  delayMs?: number;
  isNewItem?: boolean;
}

const PhotoItem = React.memo(function PhotoItem({ photo, index, onPhotoClick, delayMs, isNewItem = true }: PhotoItemProps) {
  const { t } = useTranslation();
  const [isLoaded, setIsLoaded] = useState(() => loadedImagesCache.has(photo.src));
  const [actualDimensions, setActualDimensions] = useState<{ width: number; height: number } | null>(
    () => (photo.width && photo.height) 
      ? { width: photo.width, height: photo.height } 
      : (dimensionCache.get(photo.src) || null)
  );
  const containerRef2 = useRef<HTMLDivElement>(null);

  // 移除元件內部的預先加載邏輯 (useEffect 裡的 new Image())，
  // 因為真正的加載動作應該交由 img 標籤原生的 loading="lazy" 來處理，
  // 否則如果一次性給 DOM 添加太多 PhotoItem（雖然有 delayMs 錯開動畫，但 DOM 是同時建立的），
  // 就會瞬間觸發大量的 new Image() 網路請求。

  const aspectRatio = actualDimensions && actualDimensions.width && actualDimensions.height
    ? `${actualDimensions.width} / ${actualDimensions.height}` 
    : undefined;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onPhotoClick?.(index);
  };

  return (
    <div
      ref={containerRef2}
      className={`p-1 min-h-0 min-w-0 w-full ${isNewItem ? 'animate-in fade-in slide-in-from-bottom-4 duration-500 motion-reduce:animate-none' : ''}`}
      style={{
        contentVisibility: 'auto', 
        containIntrinsicSize: 'auto 300px',
        ...(isNewItem && delayMs !== undefined ? { animationDelay: `${delayMs}ms`, animationFillMode: 'both' } : {})
      }}
    >
      <div 
        className="gallery-item block cursor-pointer min-h-0 min-w-0 w-full group shadow-[4px_4px_0px_0px_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all" 
        data-index={index} 
        data-filename={photo.rawFilename || photo.caption}
        onClick={handleClick}
      >
        <div className="border-3 border-black bg-card overflow-hidden w-full h-full">
          <div className="relative bg-secondary-background overflow-hidden w-full" style={aspectRatio ? { aspectRatio } : {}}>
            {/* Loading 佔位符：在圖片尚未載入完成時顯示，且這時我們已經用 aspectRatio 撐開了空間 */}
            <div
              className={`absolute inset-0 animate-pulse bg-main/10 flex flex-col items-center justify-center gap-2 transition-opacity duration-700 pointer-events-none z-0 ${
                isLoaded ? 'opacity-0' : 'opacity-100'
              }`}
              style={{ willChange: 'opacity' }}
            >
              <div className="size-5 border-2 border-black/10 border-t-black animate-spin rounded-full" />
              <span className="text-[8px] font-black uppercase tracking-tighter flex flex-col items-center leading-tight">
                <span className="opacity-40 tracking-normal">{t("app.syncing_visual", "同步視覺中...")}</span>
                <span className="font-mono opacity-20 normal-case">Syncing_Visual...</span>
              </span>
            </div>

            <img
              alt={photo.caption}
              src={photo.src}
              className={`w-full h-auto object-cover relative z-10`}
              loading="lazy"
              decoding="async"
              style={{
                ...(aspectRatio ? { position: 'absolute', inset: 0, height: '100%' } : {}),
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'opacity'
              }}
              onLoad={(e) => {
                loadedImagesCache.add(photo.src);
                setIsLoaded(true);
                const target = e.target as HTMLImageElement;
                if (!actualDimensions && target.naturalWidth) {
                  const dims = { width: target.naturalWidth, height: target.naturalHeight };
                  dimensionCache.set(photo.src, dims);
                  setActualDimensions(dims);
                }
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
                setIsLoaded(true);
              }}
            />
            
            {photo.isGif && (
              <div className="absolute top-2 left-2 flex items-center justify-center bg-black/60 text-white rounded px-2 py-0.5 shadow-sm backdrop-blur-sm border border-white/10 z-20 pointer-events-none">
                <span className="font-black text-[10px] tracking-widest">GIF</span>
              </div>
            )}
            {photo.isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none transition-opacity group-hover:bg-black/30 z-20 backdrop-blur-[1px]">
                <div className="bg-black/70 text-white p-2 sm:p-3 border-2 border-white/20 shadow-lg flex items-center justify-center backdrop-blur-md transform transition-transform group-hover:scale-110">
                  <i className="hn hn-play-solid text-xl sm:text-2xl ml-0.5" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function FancyboxViewer({
  images = [],
  children,
  options = {},
  mvTitle = '',
  mvId = '',
  itemsPerPage = 12,
  showHeader = false,
  headerTitle,
  headerSubtitle,
  breakpointColumns = defaultBreakpointColumns,
  className = '',
  enablePagination = true,
  autoLoadMore = false, // 預設手動點擊
  onLightboxOpen,
  onLightboxClose,
}: {
  images?: any[];
  children?: React.ReactNode;
  options?: any;
  mvTitle?: string;
  mvId?: string;
  itemsPerPage?: number;
  showHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  breakpointColumns?: any;
  className?: string;
  enablePagination?: boolean;
  autoLoadMore?: boolean;
  onLightboxOpen?: () => void;
  onLightboxClose?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // 獨立模式的 Hooks
  useEffect(() => {
    if (!children) return;
    const container = containerRef.current;
    if (!container) return;

    NativeFancybox.bind(container, '[data-fancybox]', {
      ...(options || {}),
    });

    return () => {
      NativeFancybox.unbind(container);
      NativeFancybox.close();
    };
  }, [options, children]);

  // 原有邏輯的 Hooks...
  const processedImages = useMemo(() => {
    return (images || []).filter((img) => img.url && img.url.trim() !== '');
  }, [images]);

  const [displayedPhotos, setDisplayedPhotos] = useState<PhotoData[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const lastBatchStartRef = useRef(0);
  const displayedCountRef = useRef(0);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const fancyboxRef = useRef<ReturnType<typeof NativeFancybox.show> | null>(null);

  useEffect(() => {
    displayedCountRef.current = displayedPhotos.length;
  }, [displayedPhotos.length]);

  const getPhotosFromRange = useCallback(
    async (startIndex: number, count: number): Promise<PhotoData[]> => {
      const filteredImages = processedImages.slice(startIndex, startIndex + count);

      // 直接回傳圖片資料，不進行 Promise.all 預先下載
      // 尺寸會先交給 null，然後依賴後端的備用尺寸或等圖片實際載入後自己撐開
      return filteredImages.map((img, index) => {
        // 判斷是否為影片
        const isVideo = isMediaVideo(img.url, img.type);
        const isGif = !!(img.url.match(/\.gif$/i) || img.url.includes('tweet_video_thumb'));
        
        // 產生縮圖與完整圖網址
        const thumbUrl = img.thumbnail_url ? getProxyImgUrl(img.thumbnail_url, 'thumb') : getProxyImgUrl(img.url, 'thumb');
        const fullUrl = isVideo ? getProxyImgUrl(img.url, 'raw') : getProxyImgUrl(img.url, 'full');

        const caption = img.caption || `${mvTitle}_${index}`;

        // 擷取原始副檔名，並組合出包含副檔名的完整下載檔名
        const ext = getExtensionFromUrl(img.url);
        const fullFilename = `${mvTitle}_${caption.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/g, '_')}.${ext}`;

        // 我們使用原始 img.url 或 fullUrl 當作判斷重複的依據，而非縮圖
        return {
          src: thumbUrl,
          full: fullUrl,
          raw: getProxyImgUrl(img.url, 'raw', fullFilename),
          caption,
          richText: img.richText || '',
          width: img.width, // 將由後端 API 獲取的尺寸傳給元件
          height: img.height,
          rawFilename: fullFilename,
          isVideo, // 加入 isVideo 標記
          isGif,   // 加入 isGif 標記
          groupId: img.groupId,
          tweetUrl: img.group?.source_url,
          tweetText: img.group?.source_text,
          tweetAuthor: img.group?.author_name,
          tweetHandle: img.group?.author_handle,
          tweetDate: img.group?.post_date,
          originalUrl: img.url, // 加入原始網址供去重判斷
          ...img // 保留其他可能的新增欄位
        };
      });
    },
    [processedImages, mvTitle],
  );

  useEffect(() => {
    if (processedImages.length === 0) {
      setHasMore(false);
      return;
    }

    getPhotosFromRange(0, itemsPerPage).then((firstPagePhotos) => {
      lastBatchStartRef.current = 0;
      
      // 直接設定資料，不使用延遲隱藏，加入去重防護
      const existingKeys = new Set();
      const uniquePhotos = firstPagePhotos.filter(p => {
        const key = p.originalUrl || p.full;
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });

      setDisplayedPhotos(uniquePhotos);
      setCurrentPage(1);
      setHasMore(firstPagePhotos.length < processedImages.length);
    });
  }, [processedImages, itemsPerPage, getPhotosFromRange]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    const startIndex = currentPage * itemsPerPage;
    getPhotosFromRange(startIndex, itemsPerPage).then((newPhotos) => {
      // 不再需要 setTimeout 延遲，直接加載
      if (newPhotos.length > 0) {
        lastBatchStartRef.current = displayedCountRef.current;
        
        setDisplayedPhotos((prev) => {
          // 使用 originalUrl 或 full 網址作為去重依據，避免不同 MV 產生相同的 src 但其實是同一張原圖
          const existingKeys = new Set(prev.map(p => p.originalUrl || p.full));
          const uniqueNewPhotos = newPhotos.filter(p => !existingKeys.has(p.originalUrl || p.full));
          if (uniqueNewPhotos.length === 0) return prev;
          return [...prev, ...uniqueNewPhotos];
        });

        setCurrentPage((prev) => prev + 1);
      }

      setHasMore(startIndex + newPhotos.length < processedImages.length);
      setLoadingMore(false);
    });
  }, [currentPage, processedImages.length, loadingMore, hasMore, itemsPerPage, getPhotosFromRange, autoLoadMore]);

  // 實作無限滾動 (Infinite Scroll) - 僅在 autoLoadMore 開啟時生效
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasMore || loadingMore || !enablePagination || !autoLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '400px', // 提早 400px 觸發載入，讓使用者感覺不到延遲
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore, enablePagination, autoLoadMore]);

  const handleAfterOpen = useCallback(() => {
    document.dispatchEvent(new CustomEvent('lightboxBeforeOpen', { detail: { provider: 'fb' } }));
    document.dispatchEvent(new CustomEvent('fbBeforeOpen'));
    onLightboxOpen?.();
  }, [onLightboxOpen]);

  const handleAfterClose = useCallback(() => {
    document.dispatchEvent(new CustomEvent('lightboxAfterClose', { detail: { provider: 'fb' } }));
    document.dispatchEvent(new CustomEvent('fbAfterClose'));
    
    // 確保這裡不會意外觸發父層的 onClose 導致 Modal 關閉
    onLightboxClose?.();
  }, [onLightboxClose]);

  const overlayRef = useRef<{ root?: Root; host?: HTMLElement } | null>(null);

  const displayedPhotosRef = useRef(displayedPhotos);
  useEffect(() => {
    displayedPhotosRef.current = displayedPhotos;
  }, [displayedPhotos]);

  const handlePhotoClick = useCallback(
    (index: number) => {
      // Pre-query thumb elements to avoid querying inside the loop (O(N) -> O(1) inside loop)
      const containerEl = containerRef.current;
      const thumbEls = Array.from(containerEl?.querySelectorAll('.gallery-item') || []);
      const thumbMap = new Map<number, HTMLImageElement>();
      
      thumbEls.forEach((el) => {
        const idx = Number(el.getAttribute('data-index'));
        const img = el.querySelector('img');
        if (img) thumbMap.set(idx, img);
      });

      const currentPhotos = displayedPhotosRef.current;
      const slides = currentPhotos.map((photo, i) => {
        const thumbEl = thumbMap.get(i);
        return {
          src: photo.full,
          thumb: photo.src,
          triggerEl: thumbEl,
          thumbEl: thumbEl,
          $thumb: thumbEl,
          downloadSrc: photo.raw,
          downloadFilename: photo.rawFilename || photo.caption, // <-- 改用帶有副檔名的檔名
          // Do not pass caption to Fancybox API to completely prevent native caption rendering
          alt: photo.caption,     // 讓 img 標籤加上 alt 屬性，修復 DOM 備用方案
          type: photo.isVideo ? 'html5video' : 'image', // 告訴 Fancybox 這是影片
          // 針對影片加入 HTML5 Video 的屬性，解決跨域與防盜鏈問題
          ...(photo.isVideo && {
            width: photo.width,
            height: photo.height,
            ratio: (photo.width && photo.height) ? photo.width / photo.height : undefined,
            Html: {
              video: {
                autoplay: true, // 自動播放
                loop: true,     // 循環播放
                muted: true,    // 預設靜音 (避免瀏覽器阻擋自動播放)
                playsinline: true,
              },
            },
          }),
        };
      });

      fancyboxRef.current = NativeFancybox.show(slides, {
        startIndex: index,
        closeExisting: true,
        dragToClose: true,
        placeFocusBack: false,
        mainClass: 'fancybox-neo-container',
        // Disable native caption by unbinding the default plugin/template entirely
        Caption: false,
        on: {
          ready: (api) => {
            handleAfterOpen();
            const container = api?.getContainer?.() as HTMLElement | undefined;
            if (!container) return;
            const host = document.createElement('div');
            host.className = 'ztmy-fb-overlay-host';
            container.appendChild(host);
            const root = createRoot(host);
            root.render(<FancyboxCaptionOverlay api={api} photos={currentPhotos} />);
            overlayRef.current = { root, host };
            (api as any).__ztmyOverlay = { root, host };
          },
          destroy: (api) => {
            // 觸發關閉事件追蹤 (包含點擊 X 按鈕、滑動關閉、按 ESC 鍵等所有關閉方式)
            if (typeof window !== 'undefined' && (window as any).umami && typeof (window as any).umami.track === 'function') {
              let targetImageInfo = 'unknown';
              const slide = api.getSlide();
              if (slide) {
                targetImageInfo = slide.downloadFilename || slide.caption || slide.alt || (typeof slide.src === 'string' ? slide.src.split('/').pop() : 'unknown');
              }
              
              (window as any).umami.track('Z_Lightbox_Close', {
                type: 'Fancybox_Lifecycle',
                label: `Close (${String(targetImageInfo).substring(0, 30)})`,
                current_url: window.location.pathname + window.location.search
              });
            }

            const overlay = overlayRef.current || ((api as any)?.__ztmyOverlay as { root?: Root; host?: HTMLElement } | undefined);
            if (overlay) {
              overlay.root?.unmount?.();
              overlay.host?.remove?.();
              overlayRef.current = null;
            }
            fancyboxRef.current = null;
            
            // 確保在動畫結束後再觸發 onClose，避免跟其他彈窗邏輯衝突
            setTimeout(() => {
              handleAfterClose();
            }, 300); // 增加延遲，確保 Fancybox 完全清理完畢
          },
        },
        Hash: false, // 暫時關閉，以防與 SPA 路由衝突。如果未來要開啟，需特別處理與 React Router 的整合。
        Carousel: {
          infinite: true,
          transition: 'slide',
          Toolbar: {
            display: {
              left: ['counter'],
              middle: [],
              right: ['download', 'zoomIn', 'zoomOut', 'toggle1to1', 'autoplay', 'thumbs', 'close'],
            },
          },
        },
        Images: {
          initialSize: 'fit',
          Panzoom: {
            maxScale: 3,
          }
        },
      });
    },
    [handleAfterOpen, handleAfterClose],
  );

  useEffect(() => {
    return () => {
      if (overlayRef.current) {
        overlayRef.current.root?.unmount?.();
        overlayRef.current.host?.remove?.();
        overlayRef.current = null;
      }
      NativeFancybox.close(true);
    };
  }, []);

  // 移除額外的 loading 狀態，因為我們已經在每個 PhotoItem 內部處理了骨架與過渡
  // 我們只需要在 processedImages.length === 0 且仍在獲取資料時才需要顯示
  // 但由於 processedImages 是同步從 props.images 過濾出來的，所以我們可以直接渲染

  if (children) {
    return (
      <div ref={containerRef} className={className}>
        {children}
      </div>
    );
  }

  if (processedImages.length === 0) {
    return (
      <div className={`p-4 sm:p-6 lg:p-10 min-h-screen font-mono ${className}`}>
        <p className="text-sm opacity-50 italic text-center py-10 border-2 border-dashed border-white/5">{t("app.no_reference_art", "暫無設定圖資料")}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`p-4 sm:p-6 lg:p-10 min-h-screen font-mono ${className}`}>
      <style>{`
        .fancybox__container {
          z-index: 100000 !important;
        }

        .fancybox__backdrop {
          z-index: 0 !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .fancybox__container.fancybox-neo-container {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          justify-content: stretch !important;
        }

        /* Twitter 影片播放優化 */
        .fancybox__html5video {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain;
          background: transparent;
        }
        
        .fancybox__html5video-wrap {
          background: transparent !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Cyberpunk Glitch Text Animation */
        .ztmy-cyber-text {
          position: relative;
        }
        .ztmy-cyber-text::before,
        .ztmy-cyber-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          opacity: 0.8;
        }
        .ztmy-cyber-text::before {
          left: 2px;
          text-shadow: -1px 0 red;
          animation: glitch-anim-1 3s infinite linear alternate-reverse;
        }
        .ztmy-cyber-text::after {
          left: -2px;
          text-shadow: -1px 0 blue;
          animation: glitch-anim-2 4s infinite linear alternate-reverse;
        }
        @keyframes glitch-anim-1 {
          0% { clip-path: inset(20% 0 80% 0); }
          20% { clip-path: inset(60% 0 10% 0); }
          40% { clip-path: inset(40% 0 50% 0); }
          60% { clip-path: inset(80% 0 5% 0); }
          80% { clip-path: inset(10% 0 70% 0); }
          100% { clip-path: inset(30% 0 20% 0); }
        }
        @keyframes glitch-anim-2 {
          0% { clip-path: inset(10% 0 60% 0); }
          20% { clip-path: inset(30% 0 20% 0); }
          40% { clip-path: inset(70% 0 10% 0); }
          60% { clip-path: inset(20% 0 50% 0); }
          80% { clip-path: inset(50% 0 30% 0); }
          100% { clip-path: inset(5% 0 80% 0); }
        }

        .fancybox__carousel {
          flex: 1 1 auto !important;
          min-height: 0 !important;
        }

        .ztmy-fb-overlay-host {
          flex: 0 0 auto;
          width: 100%;
          order: 2 !important;
          z-index: 3 !important;
          /* Add a grid layout wrapper to animate height smoothly */
          display: grid;
          grid-template-rows: 1fr;
          transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .ztmy-fb-overlay-host:has(.ztmy-fb-caption-overlay.is-hidden) {
          grid-template-rows: 0fr;
        }

        .ztmy-fb-caption-overlay {
          width: 100%;
          display: flex;
          justify-content: center;
          /* overflow hidden required for grid height animation to work */
          overflow: hidden;
          opacity: 1;
          transition: opacity 0.2s ease 0.1s;
        }

        .ztmy-fb-caption-overlay.is-hidden {
          opacity: 0 !important;
          pointer-events: none !important;
          transition: opacity 0.2s ease;
        }

        .ztmy-fb-caption-inner {
          margin: 0 auto;
          max-width: 768px;
          width: 90%;
          background: transparent;
          padding: 16px 20px;
          max-height: 260px;
          overflow-y: auto;
          touch-action: pan-y;
          pointer-events: auto;
          /* inner element needs min-height: 0 in grid context */
          min-height: 0;
          transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .gallery-wrapper {
          position: relative;
          width: 100%;
          min-height: 200px;
        }

        /* Fix iOS Safari flexbox bug: force masonry columns and their parents to allow shrinking */
        .gallery-wrapper div {
          min-width: 0;
        }

        .gallery-item {
          display: block;
          text-decoration: none;
        }

        .gallery-item img {
          display: block;
          width: 100%;
        }

        .f-thumbs,
        .fancybox__thumbs {
          position: relative !important;
          inset: auto !important;
          z-index: 1 !important;
          order: 3 !important;
          width: 100% !important;
        }

        .f-thumbs {
          transition: var(--f-thumbs-transition), opacity 0.15s ease;
        }

        .fancybox__container.ztmy-is-zooming .f-thumbs {
          opacity: 0 !important;
          pointer-events: none !important;
          max-height: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          margin-top: 0 !important;
          overflow: hidden !important;
        }

        /* Force hide native captions if they still appear */
        .fancybox__caption,
        .f-caption,
        .fancybox__caption-wrap {
          display: none !important;
        }

        /* Responsive overrides for Fancybox neo caption */
        @media (max-width: 767px) {
          .ztmy-fb-caption-inner {
            width: 100%;
            border-radius: 0;
            max-height: 40vh; /* Smaller max-height on mobile */
          }
        }

        .ztmy-fb-caption-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .ztmy-fb-caption-header h4 {
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.02em;
        }

        .ztmy-fb-caption-rich .rich-text {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          line-height: 1.7;
        }

        .ztmy-fb-caption-rich .rich-text .author {
          position: absolute;
          top: -38px;
          right: 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .ztmy-fb-caption-rich .rich-text .post {
          grid-column: 1;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .ztmy-fb-caption-rich .rich-text .translation {
          grid-column: 2;
          color: rgba(255, 255, 255, 0.7);
          border-left: 2px solid rgba(255, 255, 255, 0.2);
          padding-left: 16px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .ztmy-fb-caption-rich .rich-text:has(.translation:empty),
        .ztmy-fb-caption-rich .rich-text:not(:has(.translation)) {
          grid-template-columns: 1fr;
        }

        .ztmy-fb-caption-rich .rich-text:has(.translation:empty) .author,
        .ztmy-fb-caption-rich .rich-text:not(:has(.translation)) .author {
          display: none;
        }

        .ztmy-fb-caption-rich .rich-text:has(.translation:empty) .post,
        .ztmy-fb-caption-rich .rich-text:not(:has(.translation)) .post {
          grid-column: 1;
        }

        .ztmy-fb-caption-rich .rich-text:has(.translation:empty) .translation,
        .ztmy-fb-caption-rich .rich-text:not(:has(.translation)) .translation {
          display: none;
        }

        .ztmy-fb-caption-rich .rich-text:empty::before {
          content: '${t("app.no_desc", "暫無詳細信息")}';
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          grid-column: 1 / -1;
        }

        @media (max-width: 767px) {
          .ztmy-fb-caption-inner {
            width: 100%;
            border-radius: 0;
            max-height: 40vh;
          }
        }
      `}</style>

      {showHeader && (
        <header className="mb-8 lg:mb-12 border-b-8 border-border bg-card p-4 sm:p-6 shadow-neo-sm">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase italic tracking-tighter text-foreground">
            {headerTitle || (
              <span className="flex flex-col leading-tight">
                <span className="tracking-normal">Fancybox {t("app.debug_terminal", "除錯終端")}</span>
                <span className="text-[10px] font-mono opacity-50 normal-case">Fancybox_Debug_Terminal</span>
              </span>
            )}
          </h1>
          <p className="font-bold opacity-50 uppercase mt-2 text-foreground text-sm sm:text-base">
            {headerSubtitle || (
              <span className="flex flex-col leading-tight">
                <span className="tracking-normal">
                  {t("app.source", "來源：")}{mvId ? `${t("app.specific_mv", "指定 MV：")}${mvId}` : t("app.site_wide", "全站資料")} ｜ {t("app.material_count", "素材數：")}{displayedPhotos.length}
                </span>
                <span className="text-[10px] font-mono opacity-50 normal-case">
                  Source: {mvId ? `Target_MV: ${mvId}` : 'Full_Archive'} | Assets_Count: {displayedPhotos.length}
                </span>
              </span>
            )}
          </p>
        </header>
      )}

      <div className="gallery-wrapper w-full max-w-full min-w-0">
        <ResponsiveMasonry breakpointColumns={breakpointColumns} className="w-full max-w-full min-w-0" columnClassName="w-full max-w-full min-w-0">
          {displayedPhotos.map((photo, index) => {
            const isNewItem = index >= lastBatchStartRef.current;
            return (
              <PhotoItem
                key={`${photo.src}-${index}`}
                photo={photo}
                index={index}
                onPhotoClick={handlePhotoClick}
                isNewItem={isNewItem}
                delayMs={isNewItem ? Math.min(index - lastBatchStartRef.current, 48) * 25 : undefined}
              />
            );
          })}
        </ResponsiveMasonry>
      </div>

      {enablePagination && hasMore && (
        <div ref={loadMoreSentinelRef} className="mt-8 lg:mt-12 flex justify-center py-10">
          {loadingMore ? (
            <div className="flex flex-col items-center leading-tight opacity-50 animate-pulse relative z-10">
              {/* Glitch / Cyberpunk 風格 Loading */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                <div className="w-2 h-2 bg-ztmy-green animate-pulse" style={{ animationDelay: '300ms' }} />
                <div className="w-2 h-2 bg-black dark:bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ animationDelay: '600ms' }} />
              </div>
              <span className="tracking-[0.2em] font-black uppercase text-sm mb-1 ztmy-cyber-text" data-text="INITIALIZING_DATA_STREAM...">
                INITIALIZING_DATA_STREAM...
              </span>
              <span className="text-[10px] font-mono normal-case tracking-widest opacity-60">
                [ ASSETS: {displayedPhotos.length} / {processedImages.length} ]
              </span>
            </div>
          ) : (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="group px-6 sm:px-8 py-3 sm:py-4 bg-card border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-2 active:translate-y-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-tighter text-sm sm:text-lg flex flex-col items-center gap-1 min-w-[200px]"
              data-umami-event="Z_Load_More_Images"
              data-umami-event-mv={mvTitle}
              data-umami-event-count={displayedPhotos.length}
            >
              <span className="flex flex-col items-center leading-tight">
                <span className="tracking-normal">
                  {loadingMore ? t("common.loading", "載入中...") : t("common.load_more", "載入更多")} ({displayedPhotos.length} / {processedImages.length})
                </span>
                <span className="text-[10px] font-mono opacity-60 normal-case">
                  {loadingMore ? 'Loading...' : 'Load_More_Assets'}
                </span>
              </span>
            </button>
          )}
        </div>
      )}

      {enablePagination && !hasMore && displayedPhotos.length > 0 && (
        <div className="w-full py-18 mt-10 flex flex-col items-center justify-center opacity-30 select-none">
          <div className="flex items-center gap-4 text-xs font-mono font-black">
            <span className="w-12 h-0.5 bg-current"></span>
            <span className="flex flex-col items-center leading-tight">
              <span className="opacity-70">{t("app.archive_boundary", "歸檔邊界")}</span>
              <span className="text-[10px] font-mono opacity-40">END_OF_ARCHIVE</span>
            </span>
            <span className="w-12 h-0.5 bg-current"></span>
          </div>
        </div>
      )}
    </div>
  );
}
