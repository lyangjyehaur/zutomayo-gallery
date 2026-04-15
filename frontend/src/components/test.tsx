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
  /** 響應式斷點配置 */
  breakpointColumns?: {
    default: number;
    768?: number;
    1024?: number;
  };
  /** 容器樣式類名 */
  className?: string;
  /** 是否啟用分頁 */
  enablePagination?: boolean;
  /** 燈箱開啟回調 */
  onLightboxOpen?: () => void;
  /** 燈箱關閉回調 */
  onLightboxClose?: () => void;
}

// 默認響應式斷點配置
const defaultBreakpointColumns = {
  default: 2,
  768: 3,
  1024: 4
};

// 基於容器寬度的響應式 Hook
function useContainerColumns(
  containerRef: React.RefObject<HTMLDivElement | null>,
  breakpointColumns: { default: number; 768?: number; 1024?: number }
) {
  const [columnCount, setColumnCount] = useState(breakpointColumns.default);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const calculateColumns = () => {
      const containerWidth = container.clientWidth;
      const viewportWidth = window.innerWidth;

      // 特殊處理：視窗寬度 >= 1024 時強制使用 4 列（Modal 左右布局情況）
      if (viewportWidth >= 1024 && breakpointColumns[1024]) {
        return breakpointColumns[1024];
      }
      // 容器寬度 >= 768 時使用 3 列
      if (containerWidth >= 768) {
        return breakpointColumns[768] ?? breakpointColumns.default;
      }
      // 默認 2 列
      return breakpointColumns.default;
    };

    // 初始計算
    setColumnCount(calculateColumns());

    // 使用 ResizeObserver 監聽容器尺寸變化
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          setColumnCount(calculateColumns());
        }
      }
    });

    resizeObserver.observe(container);

    // 監聽窗口 resize（處理 Modal 等場景）
    const handleWindowResize = () => {
      setColumnCount(calculateColumns());
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [containerRef, breakpointColumns]);

  return columnCount;
}

// 基於容器寬度的瀑布流組件
interface ContainerMasonryProps {
  children: React.ReactNode;
  columnCount: number;
  className?: string;
  columnClassName?: string;
}

function ContainerMasonry({ children, columnCount, className = '', columnClassName = '' }: ContainerMasonryProps) {
  // 將子元素分配到各列
  const distributeChildren = () => {
    const columns: React.ReactNode[][] = Array.from({ length: columnCount }, () => []);
    let currentColumn = 0;

    React.Children.forEach(children, (child) => {
      if (child) {
        columns[currentColumn].push(child);
        currentColumn = (currentColumn + 1) % columnCount;
      }
    });

    return columns;
  };

  const columns = distributeChildren();

  return (
    <div key={columnCount} className={`flex ${className}`}>
      {columns.map((columnChildren, index) => (
        <div key={index} className={`flex-1 min-w-0 ${columnClassName}`}>
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
    <div className="mb-4">
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
  key?: string | number;
}

const PhotoItem = ({ photo }: PhotoItemProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // 計算圖片寬高比，用於骨架屏
  const aspectRatio = photo.width && photo.height
    ? `${photo.width} / ${photo.height}`
    : '16 / 9';

  return (
    <div className="mb-4">
      <a
        className="gallery-item lg-item block cursor-pointer"
        data-src={photo.full}
        data-sub-html={`.caption`}
        data-download-url={photo.raw}
        data-lg-size={photo.width && photo.height ? `${photo.width}-${photo.height}` : undefined}
      >
        <div className="border-3 border-black bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
          {/* 骨架屏占位 - 根據圖片實際寬高比 */}
          <div
            className="relative bg-secondary-background overflow-hidden"
            style={{ aspectRatio }}
          >
            {!isLoaded && (
              <div className="absolute inset-0 animate-pulse bg-main/10 flex flex-col items-center justify-center gap-2">
                <div className="size-5 border-2 border-black/10 border-t-black animate-spin rounded-full" />
                <span className="text-[8px] font-black opacity-20 uppercase tracking-tighter">Syncing_Visual...</span>
              </div>
            )}
            <img
              alt={photo.caption}
              src={photo.src}
              className={`w-full h-full object-cover transition-all duration-700 ${
                isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-110 blur-xl'
              }`}
              loading="lazy"
              onLoad={() => setIsLoaded(true)}
            />
          </div>
          {/* 隱藏的標題內容 */}
          <div className={`caption hidden`}>
            <div className="lg-neo-caption text-left p-4 bg-white border-l-8 border-black text-black">
              <h4 className="font-black uppercase italic text-lg border-b-2 border-black pb-1 mb-2">
                {photo.caption}
              </h4>
              <div 
                className="text-xs font-bold leading-relaxed opacity-80" 
                dangerouslySetInnerHTML={{ __html: photo.richText || 'NO_METADATA_FOUND' }} 
              />
            </div>
          </div>
        </div>
      </a>
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

  // 基於容器寬度計算列數
  const columnCount = useContainerColumns(
    containerRef,
    breakpointColumns
  );

  // 轉換圖片數據
  const getPhotosFromRange = useCallback((startIndex: number, count: number): PhotoData[] => {
    return images.slice(startIndex, startIndex + count).map((img, index) => ({
      src: getProxyImgUrl(img.url, 'thumb'),
      full: getProxyImgUrl(img.url, 'full'),
      raw: getProxyImgUrl(img.url, 'raw', `${mvTitle}_${img.caption || index}`),
      caption: img.caption || `${mvTitle}_${index}`,
      richText: img.richText || '',
      width: img.width,
      height: img.height
    }));
  }, [images, mvTitle]);

  // 初始加載
  useEffect(() => {
    if (images.length === 0) {
      setLoading(false);
      setHasMore(false);
      return;
    }

    setLoading(true);
    const firstPagePhotos = getPhotosFromRange(0, itemsPerPage);
    setDisplayedPhotos(firstPagePhotos);
    setCurrentPage(1);
    setHasMore(firstPagePhotos.length < images.length);
    setLoading(false);
  }, [images, itemsPerPage, getPhotosFromRange]);

  // 加載更多
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    setTimeout(() => {
      const startIndex = currentPage * itemsPerPage;
      const newPhotos = getPhotosFromRange(startIndex, itemsPerPage);
      
      if (newPhotos.length > 0) {
        setDisplayedPhotos(prev => [...prev, ...newPhotos]);
        setCurrentPage(prev => prev + 1);
      }
      
      setHasMore(startIndex + newPhotos.length < images.length);
      setLoadingMore(false);
    }, 300);
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
        <ContainerMasonry
          columnCount={columnCount}
          className="-mx-2"
          columnClassName="px-2"
        >
          {Array.from({ length: Math.min(itemsPerPage, images.length || 4) }).map((_, i) => (
            <SkeletonItem key={i} />
          ))}
        </ContainerMasonry>
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
        
        /* Masonry 佈局 */
        .masonry-gallery-grid {
          display: block !important;
          width: 100% !important;
        }
        
        .masonry-gallery-grid .flex {
          display: flex !important;
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
          selector=".gallery-item"
          numberOfSlideItemsInDom={5}
          subHtmlSelectorRelative={true}
          hideBarsDelay={3000}
          plugins={[lgZoom, lgThumbnail, lgFullscreen]}
          licenseKey="GPLv3"
          onInit={onInit}
          onAfterOpen={handleAfterOpen}
          onAfterClose={handleAfterClose}
          mode="lg-fade"
          speed={300}
          download={true}
          counter={true}
          controls={true}
          hideControlOnEnd={false}
          loop={true}
          swipeThreshold={50}
          enableSwipe={true}
          enableDrag={true}
        >
          <ContainerMasonry
            columnCount={columnCount}
            className="-mx-2"
            columnClassName="px-2"
          >
            {displayedPhotos.map((photo, index) => (
              <PhotoItem key={`${photo.src}-${index}`} photo={photo} />
            ))}

            {loadingMore && Array.from({ length: 4 }).map((_, i) => (
              <SkeletonItem key={`loading-${i}`} />
            ))}
          </ContainerMasonry>
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