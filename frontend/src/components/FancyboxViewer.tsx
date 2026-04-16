import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Fancybox as NativeFancybox } from '@fancyapps/ui';
import '@fancyapps/ui/dist/fancybox/fancybox.css';

import { MVImage } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';
import { GALLERY_BREAKPOINTS } from '@/components/galleryBreakpoints';

interface FancyboxViewerProps {
  images: MVImage[];
  mvTitle?: string;
  mvId?: string;
  itemsPerPage?: number;
  showHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  breakpointColumns?: typeof GALLERY_BREAKPOINTS;
  className?: string;
  enablePagination?: boolean;
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
  columnClassName = '',
}: ResponsiveMasonryProps) {
  const [columnCount, setColumnCount] = useState(() => getColumnCount(breakpointColumns));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const updateColumns = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setColumnCount(getColumnCount(breakpointColumns));
      }, 150); // Debounce resize to prevent excessive re-renders
    };

    window.addEventListener('resize', updateColumns);
    return () => {
      window.removeEventListener('resize', updateColumns);
      clearTimeout(timeoutId);
    };
  }, [breakpointColumns]);

  const distributeChildren = () => {
    const safeColumnCount = columnCount || 2;
    const columns: React.ReactNode[][] = Array.from({ length: safeColumnCount }, () => []);

    React.Children.forEach(children, (child, index) => {
      if (!child) return;
      const columnIndex = index % safeColumnCount;
      columns[columnIndex].push(
        <div key={index} className={`mb-4 ${columnClassName}`}>
          {child}
        </div>,
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

interface PhotoData {
  src: string;
  full: string;
  raw: string;
  caption: string;
  richText: string;
  width?: number;
  height?: number;
}

const FancyboxCaptionOverlay = ({ api, photos }: { api: any; photos: PhotoData[] }) => {
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
            <div className="rich-text" dangerouslySetInnerHTML={{ __html: richText || 'NO_METADATA_FOUND' }} />
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

const SkeletonItem = ({ width, height }: SkeletonItemProps) => {
  const aspectRatio = width && height ? `${width} / ${height}` : '16 / 9';

  return (
    <div className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-3 border-black bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="relative bg-secondary-background overflow-hidden" style={{ aspectRatio }}>
          <div className="absolute inset-0 animate-pulse bg-main/10 flex flex-col items-center justify-center gap-2">
            <div className="size-5 border-2 border-black/10 border-t-black animate-spin rounded-full" />
            <span className="text-[8px] font-black opacity-20 uppercase tracking-tighter">Syncing_Visual...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SkeletonHeader = () => (
  <header className="mb-8 lg:mb-12 border-b-8 border-border bg-card p-4 sm:p-6 shadow-neo-sm">
    <div className="h-8 sm:h-10 lg:h-12 bg-gray-200 rounded animate-pulse w-3/4 mb-3" />
    <div className="h-4 sm:h-5 bg-gray-200 rounded animate-pulse w-1/2" />
  </header>
);

interface PhotoItemProps {
  photo: PhotoData;
  index: number;
  onPhotoClick?: (index: number) => void;
  key?: string | number;
}

const PhotoItem = ({ photo, index, onPhotoClick }: PhotoItemProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [actualDimensions, setActualDimensions] = useState<{ width: number; height: number } | null>(
    photo.width && photo.height ? { width: photo.width, height: photo.height } : null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (actualDimensions) return;

    const img = new Image();
    img.onload = () => {
      setActualDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = photo.src;
  }, [photo.src, actualDimensions]);

  const aspectRatio = actualDimensions ? `${actualDimensions.width} / ${actualDimensions.height}` : null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onPhotoClick?.(index);
  };

  return (
    <div ref={containerRef} className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="gallery-item block cursor-pointer" data-index={index} onClick={handleClick}>
        <div className="border-3 border-black bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
          <div className="relative bg-secondary-background overflow-hidden" style={{ aspectRatio: aspectRatio || '16 / 9' }}>
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
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
                setIsLoaded(true);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FancyboxViewer({
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
}: FancyboxViewerProps) {
  const [displayedPhotos, setDisplayedPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fancyboxRef = useRef<ReturnType<typeof NativeFancybox.show> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const preloadImageDimensions = useCallback((url: string): Promise<{ width: number; height: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }, []);

  const getPhotosFromRange = useCallback(
    async (startIndex: number, count: number): Promise<PhotoData[]> => {
      const filteredImages = images.slice(startIndex, startIndex + count).filter((img) => img.url && img.url.trim() !== '');

      const photosWithDimensions = await Promise.all(
        filteredImages.map(async (img, index) => {
          const thumbUrl = getProxyImgUrl(img.url, 'thumb');

          let width = img.width;
          let height = img.height;
          if (!width || !height) {
            const dimensions = await preloadImageDimensions(thumbUrl);
            if (dimensions) {
              width = dimensions.width;
              height = dimensions.height;
            }
          }

          const caption = img.caption || `${mvTitle}_${index}`;

          return {
            src: thumbUrl,
            full: getProxyImgUrl(img.url, 'full'),
            raw: getProxyImgUrl(img.url, 'raw', `${mvTitle}_${caption}`),
            caption,
            richText: img.richText || '',
            width,
            height,
          };
        }),
      );

      return photosWithDimensions;
    },
    [images, mvTitle, preloadImageDimensions],
  );

  useEffect(() => {
    if (images.length === 0) {
      setLoading(false);
      setHasMore(false);
      return;
    }

    setLoading(true);
    getPhotosFromRange(0, itemsPerPage).then((firstPagePhotos) => {
      setDisplayedPhotos(firstPagePhotos);
      setCurrentPage(1);
      setHasMore(firstPagePhotos.length < images.length);
      setLoading(false);
    });
  }, [images, itemsPerPage, getPhotosFromRange]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    const startIndex = currentPage * itemsPerPage;
    getPhotosFromRange(startIndex, itemsPerPage).then((newPhotos) => {
      if (newPhotos.length > 0) {
        setDisplayedPhotos((prev) => [...prev, ...newPhotos]);
        setCurrentPage((prev) => prev + 1);
      }

      setHasMore(startIndex + newPhotos.length < images.length);
      setLoadingMore(false);
    });
  }, [currentPage, images.length, loadingMore, hasMore, itemsPerPage, getPhotosFromRange]);

  const handleAfterOpen = useCallback(() => {
    document.dispatchEvent(new CustomEvent('lightboxBeforeOpen', { detail: { provider: 'fb' } }));
    document.dispatchEvent(new CustomEvent('fbBeforeOpen'));
    onLightboxOpen?.();
  }, [onLightboxOpen]);

  const handleAfterClose = useCallback(() => {
    document.dispatchEvent(new CustomEvent('lightboxAfterClose', { detail: { provider: 'fb' } }));
    document.dispatchEvent(new CustomEvent('fbAfterClose'));
    onLightboxClose?.();
  }, [onLightboxClose]);

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

      const slides = displayedPhotos.map((photo, i) => {
        const thumbEl = thumbMap.get(i);
        return {
          src: photo.full,
          thumb: photo.src,
          triggerEl: thumbEl,
          thumbEl: thumbEl,
          $thumb: thumbEl,
          downloadSrc: photo.raw,
          downloadFilename: photo.caption,
        };
      });

      fancyboxRef.current = NativeFancybox.show(slides, {
        startIndex: index,
        closeExisting: true,
        dragToClose: true,
        placeFocusBack: false,
        mainClass: 'fancybox-neo-container',
        on: {
          ready: (api) => {
            handleAfterOpen();
            const container = api?.getContainer?.() as HTMLElement | undefined;
            if (!container) return;
            const host = document.createElement('div');
            host.className = 'ztmy-fb-overlay-host';
            container.appendChild(host);
            const root = createRoot(host);
            root.render(<FancyboxCaptionOverlay api={api} photos={displayedPhotos} />);
            (api as any).__ztmyOverlay = { root, host };
          },
          destroy: (api) => {
            const overlay = (api as any)?.__ztmyOverlay as { root?: Root; host?: HTMLElement } | undefined;
            overlay?.root?.unmount?.();
            overlay?.host?.remove?.();
            fancyboxRef.current = null;
            handleAfterClose();
          },
        },
        Carousel: {
          infinite: true,
          transition: 'slide',
          Toolbar: {
            display: {
              left: ['counter'],
              middle: [],
              right: ['download', 'thumbs', 'zoomIn', 'zoomOut', 'toggle1to1', 'fullscreen', 'close'],
            },
          },
        },
      });
    },
    [displayedPhotos, handleAfterOpen, handleAfterClose],
  );

  useEffect(() => {
    return () => {
      NativeFancybox.close(true);
    };
  }, []);

  if (loading) {
    return (
      <div ref={containerRef} className={`p-4 sm:p-6 lg:p-10 min-h-screen font-mono ${className}`}>
        {showHeader && <SkeletonHeader />}
        <ResponsiveMasonry breakpointColumns={breakpointColumns} className="" columnClassName="">
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
        <p className="text-sm opacity-50 italic text-center py-10 border-2 border-dashed border-white/5">暫無設定圖資料</p>
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
          content: '暫無詳細信息';
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
            {headerTitle || 'Fancybox_Debug_Terminal'}
          </h1>
          <p className="font-bold opacity-50 uppercase mt-2 text-foreground text-sm sm:text-base">
            {headerSubtitle || `Source: ${mvId ? `Target_MV: ${mvId}` : 'Full_Archive'} | Assets_Count: ${displayedPhotos.length}`}
          </p>
        </header>
      )}

      <div className="gallery-wrapper">
        <ResponsiveMasonry breakpointColumns={breakpointColumns} className="" columnClassName="">
          {displayedPhotos.map((photo, index) => (
            <PhotoItem key={`${photo.src}-${index}`} photo={photo} index={index} onPhotoClick={handlePhotoClick} />
          ))}

          {loadingMore && Array.from({ length: 4 }).map((_, i) => <SkeletonItem key={`loading-${i}`} />)}
        </ResponsiveMasonry>
      </div>

      {enablePagination && hasMore && (
        <div className="mt-8 lg:mt-12 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="group px-6 sm:px-8 py-3 sm:py-4 bg-card border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-2 active:translate-y-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-tighter text-sm sm:text-lg flex flex-col items-center gap-1 min-w-[200px]"
          >
            <span>
              {loadingMore ? 'Loading...' : 'Load_More_Assets'} ({displayedPhotos.length} / {images.length})
            </span>
          </button>
        </div>
      )}

      {enablePagination && !hasMore && displayedPhotos.length > 0 && (
        <div className="mt-8 lg:mt-12 text-center font-bold opacity-50 uppercase text-sm sm:text-base">End of Archive</div>
      )}
    </div>
  );
}
