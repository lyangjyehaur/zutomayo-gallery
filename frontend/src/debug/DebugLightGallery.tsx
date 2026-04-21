import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LightGallery from 'lightgallery/react';
import Masonry from 'react-masonry-css';

// 導入 lightGallery 核心與插件樣式
import 'lightgallery/css/lightgallery.css';
import 'lightgallery/css/lg-zoom.css';
import 'lightgallery/css/lg-thumbnail.css';
import 'lightgallery/css/lg-fullscreen.css';

// 導入插件
import lgZoom from 'lightgallery/plugins/zoom';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgFullscreen from 'lightgallery/plugins/fullscreen';

import { MVItem } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';

interface DebugLightGalleryProps {
  mvid?: string;
}

const ITEMS_PER_PAGE = 12;

// 響應式斷點配置
const breakpointColumns = {
  default: 4,
  1200: 3,
  768: 2,
  480: 1
};

// 骨架屏組件 - 與實際圖片卡片結構一致
const SkeletonItem = () => (
  <div className="mb-4">
    <div className="border-3 border-black bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* 圖片區域骨架 */}
      <div className="relative w-full aspect-[4/3] bg-gray-200 overflow-hidden">
        {/* 閃光動畫效果 */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          style={{
            animation: 'shimmer 1.5s infinite',
            transform: 'translateX(-100%)',
          }}
        />
      </div>
    </div>
    <style>{`
      @keyframes shimmer {
        100% {
          transform: translateX(100%);
        }
      }
    `}</style>
  </div>
);

// 標題骨架屏
const SkeletonHeader = () => (
  <header className="mb-8 lg:mb-12 border-b-8 border-border bg-card p-4 sm:p-6 shadow-neo-sm">
    <div className="h-8 sm:h-10 lg:h-12 bg-gray-200 rounded animate-pulse w-3/4 mb-3" />
    <div className="h-4 sm:h-5 bg-gray-200 rounded animate-pulse w-1/2" />
  </header>
);

// 圖片項目組件
interface PhotoItemProps {
  photo: {
    src: string;
    full: string;
    caption: string;
    richText: string;
    width?: number;
    height?: number;
  };
  photoKey: string;
}

const PhotoItem = ({ photo }: PhotoItemProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="mb-4">
      <a
        className="gallery-item lg-item block"
        data-src={photo.full}
        data-sub-html=".caption"
        data-lg-size={photo.width && photo.height ? `${photo.width}-${photo.height}` : undefined}
      >
        <div className="border-3 border-black bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
          {/* 骨架屏占位 - 图片加载完成前显示 */}
          {!isLoaded && (
            <div className="relative w-full aspect-[4/3] bg-gray-200 overflow-hidden">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                style={{
                  animation: 'shimmer 1.5s infinite',
                  transform: 'translateX(-100%)',
                }}
              />
            </div>
          )}
          <img
            alt={photo.caption}
            src={photo.src}
            className={`w-full h-auto block ${isLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
          />
          <div className="caption hidden">
            <div className="lg-neo-caption text-left p-4 bg-white border-l-8 border-black text-black">
              <h4 className="font-black uppercase italic text-lg border-b-2 border-black pb-1 mb-2">
                {photo.caption}
              </h4>
              <div 
                className="text-xs font-bold leading-relaxed opacity-80" 
                dangerouslySetInnerHTML={{ __html: photo.richText || '暫無描述 (NO_METADATA_FOUND)' }} 
              />
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};

export default function DebugLightGallery({ mvid: propMvid }: DebugLightGalleryProps) {
  const { t } = useTranslation();
  const { mvid: urlMvid } = useParams<{ mvid?: string }>();
  const mvid = propMvid || urlMvid;

  const [allItems, setAllItems] = useState<MVItem[]>([]);
  const [displayedPhotos, setDisplayedPhotos] = useState<PhotoItemProps['photo'][]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalPhotoCount, setTotalPhotoCount] = useState(0);

  // 從 items 中提取指定範圍的 photos
  const getPhotosFromItems = useCallback((items: MVItem[], startIndex: number, count: number) => {
    const allPhotos = items.flatMap(mv =>
      (mv.images || []).map((img, index) => ({
        src: getProxyImgUrl(img.url, 'thumb'),
        full: getProxyImgUrl(img.url, 'full'),
        raw: getProxyImgUrl(img.url, 'raw', `${mv.title}_${img.caption}`),
        originalUrl: getProxyImgUrl(img.url, 'full'),
        alt: img.alt || mv.title,
        key: `${mv.id}-${index}`,
        caption: img.caption || `<span lang="ja">${mv.title}</span>`,
        richText: img.richText || '',
        // width: img.width,
        // height: img.height
      }))
    );
    return allPhotos.slice(startIndex, startIndex + count);
  }, []);

  // 初始加載數據
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const apiUrl = mvid ? `/api/mvs/${mvid}` : '/api/mvs';
        const response = await fetch(apiUrl);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const json = await response.json();
        const items = Array.isArray(json) ? json : [json];
        setAllItems(items);
        
        // 計算總圖片數
        const totalPhotos = items.flatMap((mv: MVItem) => mv.images || []).length;
        setTotalPhotoCount(totalPhotos);
        
        // 加載第一頁
        const firstPagePhotos = getPhotosFromItems(items, 0, ITEMS_PER_PAGE);
        setDisplayedPhotos(firstPagePhotos);
        setCurrentPage(1);
        setHasMore(firstPagePhotos.length < totalPhotos);
      } catch (err: any) {
        console.error("Debug LightGallery fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mvid, getPhotosFromItems]);

  // 加載更多
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    setTimeout(() => {
      const startIndex = currentPage * ITEMS_PER_PAGE;
      const newPhotos = getPhotosFromItems(allItems, startIndex, ITEMS_PER_PAGE);
      
      if (newPhotos.length > 0) {
        setDisplayedPhotos(prev => [...prev, ...newPhotos]);
        setCurrentPage(prev => prev + 1);
      }
      
      setHasMore(startIndex + newPhotos.length < totalPhotoCount);
      setLoadingMore(false);
    }, 300);
  }, [currentPage, allItems, loadingMore, hasMore, getPhotosFromItems]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-10 bg-background min-h-screen font-mono">
        <SkeletonHeader />
        <Masonry
          breakpointCols={breakpointColumns}
          className="flex w-auto -ml-4"
          columnClassName="pl-4 bg-clip-padding"
        >
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <SkeletonItem key={i} />
          ))}
        </Masonry>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 bg-background min-h-screen font-mono">
      <header className="mb-8 lg:mb-12 border-b-8 border-border bg-card p-4 sm:p-6 shadow-neo-sm">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase italic tracking-tighter text-foreground">
          <span className="flex flex-col leading-tight">
            <span className="tracking-normal">LightGallery 除錯終端</span>
            <span className="text-[10px] font-mono opacity-50 normal-case">LightGallery_Debug_Terminal</span>
          </span>
        </h1>
        <p className="font-bold opacity-50 uppercase mt-2 text-foreground text-sm sm:text-base">
          <span className="flex flex-col leading-tight">
            <span className="tracking-normal">來源：{mvid ? `指定 MV：${mvid}` : '全站資料'} ｜ 素材數：{displayedPhotos.length}</span>
            <span className="text-[10px] font-mono opacity-50 normal-case">
              Source: {mvid ? `Target_MV: ${mvid}` : 'Full_Archive'} | Assets_Count: {displayedPhotos.length}
            </span>
          </span>
        </p>
      </header>

      {error && (
        <div className="p-4 sm:p-6 border-4 border-red-500 bg-red-500/10 text-red-500 font-bold mb-6 lg:mb-8 uppercase tracking-tight text-sm sm:text-base">
          <span className="flex flex-col leading-tight">
            <span className="tracking-normal">[錯誤訊號]：{error}</span>
            <span className="text-[10px] font-mono opacity-60 normal-case">[LG_ERROR_SIGNAL]</span>
          </span>
        </div>
      )}

      <LightGallery
        elementClassNames="masonry-gallery-demo"
        selector=".gallery-item"
        numberOfSlideItemsInDom={5}
        subHtmlSelectorRelative={true}
        hideBarsDelay={3000}
        plugins={[lgZoom, lgThumbnail, lgFullscreen]}
        licenseKey="GPLv3"
      >
        <Masonry
          breakpointCols={breakpointColumns}
          className="flex w-auto -ml-4"
          columnClassName="pl-4 bg-clip-padding"
        >
          {displayedPhotos.map((photo) => (
            <PhotoItem key={photo.key} photo={photo} photoKey={photo.key} />
          ))}
          
          {loadingMore && Array.from({ length: 4 }).map((_, i) => (
            <SkeletonItem key={`loading-${i}`} />
          ))}
        </Masonry>
      </LightGallery>

      {hasMore && (
        <div className="mt-8 lg:mt-12 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="group px-6 sm:px-8 py-3 sm:py-4 bg-card border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-2 active:translate-y-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-tighter text-sm sm:text-lg flex flex-col items-center gap-1 min-w-[200px]"
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="tracking-normal">
                {loadingMore ? t("common.loading", "載入中...") : t("common.load_more", "載入更多")} ({displayedPhotos.length} / {totalPhotoCount})
              </span>
              <span className="text-[10px] font-mono opacity-60 normal-case">
                {loadingMore ? 'Loading...' : 'Load_More_Assets'}
              </span>
            </span>
          </button>
        </div>
      )}

      {!hasMore && displayedPhotos.length > 0 && (
        <div className="mt-8 lg:mt-12 text-center font-bold opacity-50 uppercase text-sm sm:text-base flex flex-col items-center leading-tight">
          <span className="tracking-normal">{t("app.reached_bottom", "已到最底")}</span>
          <span className="text-[10px] font-mono opacity-60 normal-case">End of Archive</span>
        </div>
      )}
    </div>
  );
}
