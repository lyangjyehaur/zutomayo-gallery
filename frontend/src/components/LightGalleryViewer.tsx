import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import LightGallery from 'lightgallery/react';
import type { LightGallery as LightGalleryType } from 'lightgallery/lightgallery';


// 導入 lightGallery 核心與插件樣式
import 'lightgallery/css/lightgallery.css';
import 'lightgallery/css/lg-zoom.css';
import 'lightgallery/css/lg-thumbnail.css';
import 'lightgallery/css/lg-fullscreen.css';

// 導入插件
import lgZoom from 'lightgallery/plugins/zoom';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgFullscreen from 'lightgallery/plugins/fullscreen';

import { MVImage } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';

interface LightGalleryViewerProps {
  /** 圖片數據數組 */
  images: MVImage[];
  /** MV 標題（用於圖片下載命名） */
  mvTitle?: string;
  /** MV ID */
  mvId?: string;
  /** 每頁加載數量，默認 12 */
  itemsPerPage?: number;
  /** 是否顯示標題頭部 */
  showHeader?: boolean;
  /** 自定義標題 */
  headerTitle?: string;
  /** 自定義副標題 */
  headerSubtitle?: string;
  /** 響應式斷點配置 - 默認使用 GALLERY_BREAKPOINTS */
  breakpointColumns?: typeof GALLERY_BREAKPOINTS;
  /** 容器樣式類名 */
  className?: string;
  /** 是否啟用分頁 */
  enablePagination?: boolean;
  /** 燈箱開啟回調 */
  onLightboxOpen?: () => void;
  /** 燈箱關閉回調 */
  onLightboxClose?: () => void;
}

// 統一斷點配置
// 規則：
// - < 500px: 2列（手機豎屏）
// - 500px - 767px: 3列（手機橫屏/小平板）
// - >= 768px: 4列（平板/桌面）
export const GALLERY_BREAKPOINTS = {
  default: 2,
  500: 3,
  768: 4,
  1024: 4
} as const;

// 兼容舊代碼的默認導出
const defaultBreakpointColumns = GALLERY_BREAKPOINTS;

// 自定義 Masonry 組件 - 強制根據視窗寬度判斷，而非容器寬度
interface ResponsiveMasonryProps {
  children: React.ReactNode;
  breakpointColumns?: typeof GALLERY_BREAKPOINTS;
  className?: string;
  columnClassName?: string;
}

// 根據視窗寬度計算列數
const getColumnCount = (breakpointColumns: typeof GALLERY_BREAKPOINTS) => {
  const viewportWidth = window.innerWidth;
  if (viewportWidth >= 1024 && breakpointColumns[1024]) {
    return breakpointColumns[1024];
  } else if (viewportWidth >= 768 && breakpointColumns[768]) {
    return breakpointColumns[768];
  } else if (viewportWidth >= 500 && breakpointColumns[500]) {
    return breakpointColumns[500];
  }
  return breakpointColumns.default ?? 2;
};

function ResponsiveMasonry({ 
  children, 
  breakpointColumns = GALLERY_BREAKPOINTS, 
  className = '', 
  columnClassName = '' 
}: ResponsiveMasonryProps) {
  // 初始化時直接計算正確的列數，避免閃爍
  const [columnCount, setColumnCount] = useState(() => getColumnCount(breakpointColumns));

  useEffect(() => {
    const updateColumns = () => {
      setColumnCount(getColumnCount(breakpointColumns));
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [breakpointColumns]);

  // 將子元素按列分配，保持 DOM 順序與數據順序一致
  const distributeChildren = () => {
    const safeColumnCount = columnCount || 2;
    const columns: React.ReactNode[][] = Array.from({ length: safeColumnCount }, () => []);
    
    React.Children.forEach(children, (child, index) => {
      if (!child) return;
      const columnIndex = index % safeColumnCount;
      columns[columnIndex].push(
        <div key={index} className={`mb-4 ${columnClassName}`}>
          {child}
        </div>
      );
    });
    
    return columns;
  };

  const columns = distributeChildren();

  return (
    <div className={`flex gap-4 ${className}`}>
      {columns.map((columnChildren, index) => (
        <div key={index} className="flex-1 min-w-0">
          {columnChildren}
        </div>
      ))}
    </div>
  );
}

// 圖片數據類型
interface PhotoData {
  src: string;
  full: string;
  raw: string;
  caption: string;
  richText: string;
  width?: number;
  height?: number;
}

// 骨架屏組件 - 根據圖片實際寬高比
interface SkeletonItemProps {
  width?: number;
  height?: number;
  key?: string | number;
}

const SkeletonItem = ({ width, height }: SkeletonItemProps) => {
  const aspectRatio = width && height ? `${width} / ${height}` : '16 / 9';

  return (
    <div className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-3 border-black bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div
          className="relative bg-secondary-background overflow-hidden"
          style={{ aspectRatio }}
        >
          <div className="absolute inset-0 animate-pulse bg-main/10 flex flex-col items-center justify-center gap-2">
            <div className="size-5 border-2 border-black/10 border-t-black animate-spin rounded-full" />
            <span className="text-[8px] font-black opacity-20 uppercase tracking-tighter">Syncing_Visual...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 標題骨架屏
const SkeletonHeader = () => (
  <header className="mb-8 lg:mb-12 border-b-8 border-border bg-card p-4 sm:p-6 shadow-neo-sm">
    <div className="h-8 sm:h-10 lg:h-12 bg-gray-200 rounded animate-pulse w-3/4 mb-3" />
    <div className="h-4 sm:h-5 bg-gray-200 rounded animate-pulse w-1/2" />
  </header>
);

// 圖片項目組件
interface PhotoItemProps {
  photo: PhotoData;
  index: number;
  onPhotoClick?: (index: number) => void;
  key?: string | number;
}

const PhotoItem = ({ photo, index, onPhotoClick }: PhotoItemProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [actualDimensions, setActualDimensions] = useState<{width: number, height: number} | null>(
    photo.width && photo.height ? { width: photo.width, height: photo.height } : null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // 預加載圖片獲取真實尺寸
  useEffect(() => {
    if (actualDimensions) return; // 已有尺寸數據，無需預加載
    
    const img = new Image();
    img.onload = () => {
      setActualDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.src = photo.src;
  }, [photo.src, actualDimensions]);

  // 計算圖片寬高比（優先使用後端數據，其次使用預加載獲取的尺寸）
  const aspectRatio = actualDimensions 
    ? `${actualDimensions.width} / ${actualDimensions.height}` 
    : null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onPhotoClick?.(index);
  };

  return (
    <div ref={containerRef} className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div
        className="gallery-item block cursor-pointer"
        onClick={handleClick}
      >
        <div className="border-3 border-black bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
          {/* 圖片容器 - 使用預加載獲取的尺寸，避免高度跳動 */}
          <div
            className="relative bg-secondary-background overflow-hidden"
            style={{
              aspectRatio: aspectRatio || '16 / 9',
            }}
          >
            {/* 骨架屏 - 帶淡入動畫 */}
            <div 
              className={`absolute inset-0 animate-pulse bg-main/10 flex flex-col items-center justify-center gap-2 transition-opacity duration-500 ${
                isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <div className="size-5 border-2 border-black/10 border-t-black animate-spin rounded-full" />
              <span className="text-[8px] font-black opacity-20 uppercase tracking-tighter">Syncing_Visual...</span>
            </div>
            
            <img
              alt={photo.caption}
              src={photo.src}
              className={`w-full h-full object-cover transition-all duration-700 ${
                isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-110 blur-xl'
              }`}
              loading="lazy"
              decoding="async"
              onLoad={() => {
                setIsLoaded(true);
              }}
              onError={(e) => {
                // 加載失敗時顯示占位圖
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
                setIsLoaded(true);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * LightGalleryViewer - 圖片畫廊組件
 * 
 * 功能：
 * 1. 瀑布流佈局展示圖片
 * 2. 點擊圖片開啟 LightGallery 燈箱
 * 3. 支持分頁加載
 * 4. 圖片懶加載和骨架屏
 * 
 * 事件處理：
 * - 通過 lightGallery 實例方法控制燈箱
 * - 觸發自定義事件通知父組件燈箱狀態
 */
export default function LightGalleryViewer({
  images,
  mvTitle = '',
  mvId = '',
  itemsPerPage = 12,
  showHeader = false,
  headerTitle,
  headerSubtitle,
  breakpointColumns = defaultBreakpointColumns,
  className = '',
  enablePagination = true,
  onLightboxOpen,
  onLightboxClose,
}: LightGalleryViewerProps) {
  const [displayedPhotos, setDisplayedPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // lightGallery 實例引用
  const lightGalleryRef = useRef<LightGalleryType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 預加載圖片獲取真實尺寸
  const preloadImageDimensions = useCallback((url: string): Promise<{width: number, height: number} | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }, []);

  // 轉換圖片數據（過濾掉無效 URL，並預加載獲取尺寸）
  const getPhotosFromRange = useCallback(async (startIndex: number, count: number): Promise<PhotoData[]> => {
    const filteredImages = images
      .slice(startIndex, startIndex + count)
      .filter(img => img.url && img.url.trim() !== '');
    
    // 並行預加載所有圖片獲取尺寸
    const photosWithDimensions = await Promise.all(
      filteredImages.map(async (img, index) => {
        const thumbUrl = getProxyImgUrl(img.url, 'thumb');
        
        // 如果後端沒有提供尺寸，預加載獲取
        let width = img.width;
        let height = img.height;
        if (!width || !height) {
          const dimensions = await preloadImageDimensions(thumbUrl);
          if (dimensions) {
            width = dimensions.width;
            height = dimensions.height;
          }
        }
        
        return {
          src: thumbUrl,
          full: getProxyImgUrl(img.url, 'full'),
          raw: getProxyImgUrl(img.url, 'raw', `${mvTitle}_${img.caption || index}`),
          caption: img.caption || `${mvTitle}_${index}`,
          richText: img.richText || '',
          width,
          height
        };
      })
    );
    
    return photosWithDimensions;
  }, [images, mvTitle, preloadImageDimensions]);

  // 初始加載
  useEffect(() => {
    if (images.length === 0) {
      setLoading(false);
      setHasMore(false);
      return;
    }

    setLoading(true);
    getPhotosFromRange(0, itemsPerPage).then(firstPagePhotos => {
      setDisplayedPhotos(firstPagePhotos);
      setCurrentPage(1);
      setHasMore(firstPagePhotos.length < images.length);
      setLoading(false);
    });
  }, [images, itemsPerPage, getPhotosFromRange]);

  // 加載更多
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    const startIndex = currentPage * itemsPerPage;
    getPhotosFromRange(startIndex, itemsPerPage).then(newPhotos => {
      if (newPhotos.length > 0) {
        setDisplayedPhotos(prev => [...prev, ...newPhotos]);
        setCurrentPage(prev => prev + 1);
      }
      
      setHasMore(startIndex + newPhotos.length < images.length);
      setLoadingMore(false);
    });
  }, [currentPage, images.length, loadingMore, hasMore, itemsPerPage, getPhotosFromRange]);

  // lightGallery 初始化回調
  const onInit = useCallback((detail: { instance: LightGalleryType }) => {
    if (detail) {
      lightGalleryRef.current = detail.instance;
    }
  }, []);

  // 燈箱開啟回調
  const handleAfterOpen = useCallback(() => {
    // 觸發自定義事件
    const event = new CustomEvent('lgBeforeOpen');
    document.dispatchEvent(event);
    onLightboxOpen?.();
  }, [onLightboxOpen]);

  // 燈箱關閉回調
  const handleAfterClose = useCallback(() => {
    const event = new CustomEvent('lgAfterClose');
    document.dispatchEvent(event);
    onLightboxClose?.();
  }, [onLightboxClose]);

  // 處理圖片點擊 - 使用 dynamic 模式打開指定索引的圖片
  const handlePhotoClick = useCallback((index: number) => {
    if (lightGalleryRef.current) {
      lightGalleryRef.current.openGallery(index);
    }
  }, []);

  // 動態刷新 lightGallery 當圖片變化時
  useEffect(() => {
    if (lightGalleryRef.current && displayedPhotos.length > 0) {
      // 延遲刷新以確保 DOM 已更新
      const timer = setTimeout(() => {
        lightGalleryRef.current?.refresh();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [displayedPhotos.length]);

  if (loading) {
    return (
      <div ref={containerRef} className={`p-4 sm:p-6 lg:p-10 min-h-screen font-mono ${className}`}>
        {showHeader && <SkeletonHeader />}
        <ResponsiveMasonry
          breakpointColumns={breakpointColumns}
          className=""
          columnClassName=""
        >
          {Array.from({ length: Math.min(itemsPerPage, images.length || 4) }).map((_, i) => (
            <SkeletonItem key={i} />
          ))}
        </ResponsiveMasonry>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`p-4 sm:p-6 lg:p-10 min-h-screen font-mono ${className}`}>
        <p className="text-sm opacity-50 italic text-center py-10 border-2 border-dashed border-white/5">
          暫無設定圖資料
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`p-4 sm:p-6 lg:p-10 min-h-screen font-mono ${className}`}>
      {/* 全局樣式 */}
      <style>{`
        /* LightGallery 燈箱層級 - 確保高於一切 */
        .lg-backdrop {
          z-index: 99999 !important;
          pointer-events: auto !important;
        }
        .lg-outer {
          z-index: 100000 !important;
          pointer-events: auto !important;
        }
        .lg-components {
          z-index: 100001 !important;
          pointer-events: auto !important;
        }
        
        /* 修復容器高度 */
        .lg-container {
          position: relative !important;
          height: auto !important;
          min-height: 100px !important;
        }
        

        
        /* Gallery 包裝器 */
        .gallery-wrapper {
          position: relative;
          width: 100%;
          min-height: 200px;
        }
        
        /* 確保所有燈箱元素可交互 */
        .lg-toolbar,
        .lg-actions,
        .lg-thumb-outer,
        .lg-sub-html {
          pointer-events: auto !important;
        }
        
        /* 圖片項目樣式 */
        .gallery-item {
          display: block;
          text-decoration: none;
        }
        
        .gallery-item img {
          display: block;
          width: 100%;
        }
        
        /* 燈箱內部標題樣式 */
        .lg-sub-html {
          margin: 0 auto;
          max-width: 768px;
          width: 90%;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 8px 8px 0 0;
          padding: 16px 20px;
        }

        /* 標題樣式 */
        .lg-sub-html .lg-neo-caption h4 {
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          letter-spacing: 0.02em;
        }

        /* 富文本容器 - 雙欄布局 */
        .lg-sub-html .lg-neo-caption .rich-text {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          line-height: 1.7;
        }

        /* 作者 */
        .lg-sub-html .lg-neo-caption .rich-text .author {
          grid-column: 1;
          grid-row: 1;
          font-weight: 600;
          font-size: 12px;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* 原文 */
        .lg-sub-html .lg-neo-caption .rich-text .post {
          grid-column: 1;
          grid-row: 2;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        /* 翻譯 */
        .lg-sub-html .lg-neo-caption .rich-text .translation {
          grid-column: 2;
          grid-row: 1 / span 2;
          color: rgba(255, 255, 255, 0.7);
          border-left: 2px solid rgba(255, 255, 255, 0.2);
          padding-left: 16px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        /* 無翻譯時：原文獨佔一行 */
        .lg-sub-html .lg-neo-caption .rich-text:has(.translation:empty),
        .lg-sub-html .lg-neo-caption .rich-text:not(:has(.translation)) {
          grid-template-columns: 1fr;
        }

        .lg-sub-html .lg-neo-caption .rich-text:has(.translation:empty) .author,
        .lg-sub-html .lg-neo-caption .rich-text:not(:has(.translation)) .author {
          grid-column: 1;
        }

        .lg-sub-html .lg-neo-caption .rich-text:has(.translation:empty) .post,
        .lg-sub-html .lg-neo-caption .rich-text:not(:has(.translation)) .post {
          grid-column: 1;
          grid-row: 2;
        }

        .lg-sub-html .lg-neo-caption .rich-text:has(.translation:empty) .translation,
        .lg-sub-html .lg-neo-caption .rich-text:not(:has(.translation)) .translation {
          display: none;
        }

        /* 空內容提示 */
        .lg-sub-html .lg-neo-caption .rich-text:empty::before {
          content: '暫無詳細信息';
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          grid-column: 1 / -1;
        }

      `}</style>
      
      {showHeader && (
        <header className="mb-8 lg:mb-12 border-b-8 border-border bg-card p-4 sm:p-6 shadow-neo-sm">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase italic tracking-tighter text-foreground">
            {headerTitle || 'LightGallery_Debug_Terminal'}
          </h1>
          <p className="font-bold opacity-50 uppercase mt-2 text-foreground text-sm sm:text-base">
            {headerSubtitle || `Source: ${mvId ? `Target_MV: ${mvId}` : 'Full_Archive'} | Assets_Count: ${displayedPhotos.length}`}
          </p>
        </header>
      )}

      <div className="gallery-wrapper">
        <LightGallery
          elementClassNames="masonry-gallery-grid"
          dynamic={true}
          dynamicEl={displayedPhotos.map(photo => ({
            src: photo.full,
            thumb: photo.src,
            subHtml: `<div class="lg-neo-caption"><h4>${photo.caption}</h4><div class="rich-text">${photo.richText || 'NO_METADATA_FOUND'}</div></div>`,
            downloadUrl: photo.raw,
          }))}
          appendSubHtmlTo=".lg-item"
          numberOfSlideItemsInDom={5}
          plugins={[lgZoom, lgThumbnail, lgFullscreen]}
          licenseKey="GPLv3"
          onInit={onInit}
          onAfterOpen={handleAfterOpen}
          onAfterClose={handleAfterClose}
          speed={300}
          download={true}
          counter={true}
          controls={true}
          hideControlOnEnd={false}
          loop={true}
          swipeThreshold={50}
          enableSwipe={true}
          enableDrag={true}
          showZoomInOutIcons={true}
        >
          <ResponsiveMasonry
            breakpointColumns={breakpointColumns}
            className=""
            columnClassName=""
          >
            {displayedPhotos.map((photo, index) => (
              <PhotoItem key={`${photo.src}-${index}`} photo={photo} index={index} onPhotoClick={handlePhotoClick} />
            ))}

            {loadingMore && Array.from({ length: 4 }).map((_, i) => (
              <SkeletonItem key={`loading-${i}`} />
            ))}
          </ResponsiveMasonry>
        </LightGallery>
      </div>

      {enablePagination && hasMore && (
        <div className="mt-8 lg:mt-12 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="group px-6 sm:px-8 py-3 sm:py-4 bg-card border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-2 active:translate-y-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-tighter text-sm sm:text-lg flex flex-col items-center gap-1 min-w-[200px]"
          >
            <span>{loadingMore ? 'Loading...' : 'Load_More_Assets'} ({displayedPhotos.length} / {images.length})</span>
          </button>
        </div>
      )}

      {enablePagination && !hasMore && displayedPhotos.length > 0 && (
        <div className="mt-8 lg:mt-12 text-center font-bold opacity-50 uppercase text-sm sm:text-base">
          End of Archive
        </div>
      )}
    </div>
  );
}




