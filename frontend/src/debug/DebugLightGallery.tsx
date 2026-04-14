import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import LightGallery from 'lightgallery/react';

// 導入 lightGallery 核心與插件樣式
import 'lightgallery/css/lightgallery.css';
import 'lightgallery/css/lg-zoom.css';
import 'lightgallery/css/lg-thumbnail.css';
import 'lightgallery/css/lg-fullscreen.css';
import './style.scss'; // 引入自定義側邊欄樣式

// 導入插件
import lgZoom from 'lightgallery/plugins/zoom';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgFullscreen from 'lightgallery/plugins/fullscreen';

import { MVItem } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';

interface DebugLightGalleryProps {
  mvid?: string;
}

export default function DebugLightGallery({ mvid: propMvid }: DebugLightGalleryProps) {
  const { mvid: urlMvid } = useParams<{ mvid?: string }>();
  const mvid = propMvid || urlMvid;

  const [fetchedData, setFetchedData] = useState<MVItem[] | MVItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 向後端請求數據
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 根據是否有 mvid 決定 API 路徑
        const apiUrl = mvid ? `/api/mvs/${mvid}` : '/api/mvs';
        const response = await fetch(apiUrl);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const json = await response.json();
        setFetchedData(json);
      } catch (err: any) {
        console.error("Debug LightGallery fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mvid]);

  // 將數據轉換為展示格式
  const photos = useMemo(() => {
    if (!fetchedData) return [];
    const items = Array.isArray(fetchedData) ? fetchedData : [fetchedData];
    
    return items.flatMap(mv =>
      (mv.images || []).map((img,index) => ({
        src: getProxyImgUrl(img.url, 'thumb'),
        full: getProxyImgUrl(img.url, 'full'),
        raw: getProxyImgUrl(img.url, 'raw', `${mv.title}_${img.caption}`),
        originalUrl: getProxyImgUrl(img.url),
        alt: img.alt || mv.title,
        key: `${mv.id}-${index}`,
        caption: img.caption || mv.title,
        richText: img.richText || '',
        width: img.width,
        height: img.height
      }))
    );
  }, [fetchedData]);

  if (loading) {
    return (
      <div className="p-10 bg-background min-h-screen font-mono flex items-center justify-center">
        <div className="text-2xl font-black animate-pulse uppercase tracking-widest text-main">
          Accessing_Database_Cluster...
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 bg-background min-h-screen font-mono">
      <header className="mb-12 border-b-8 border-border bg-card p-6 shadow-neo-sm">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">LightGallery_Debug_Terminal</h1>
        <p className="font-bold opacity-50 uppercase mt-2 text-foreground">
          Source: {mvid ? `Target_MV: ${mvid}` : 'Full_Archive'} | Assets_Count: {photos.length}
        </p>
      </header>

      {error && (
        <div className="p-6 border-4 border-red-500 bg-red-500/10 text-red-500 font-bold mb-8 uppercase tracking-tight">
          [LG_ERROR_SIGNAL]: {error}
        </div>
      )}

      <LightGallery
      numberOfSlideItemsInDom={5}
      zoomFromOrigin={true}
      appendSubHtmlTo=".lg-item"
        subHtmlSelectorRelative={true}
        customSlideName={true}
        hideBarsDelay={3000}
        plugins={[lgZoom, lgThumbnail, lgFullscreen]}
        elementClassNames="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6"
        licenseKey="GPLv3"
      >
        {photos.map((photo) => (
          <a
            key={photo.key}
            className="gallery-item block border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all bg-card overflow-hidden aspect-square"
            data-src={photo.originalUrl}
            data-sub-html=".caption"
            data-slide-name={photo.alt}
            data-lg-size={`${photo.width}-${photo.height}`}
            data-download={photo.alt}
            data-download-url={photo.raw}
          >
            {/* 隱藏的標題容器，lightGallery 會在開啟時抓取這裡的內容 */}
            <div className="caption hidden">
              <div className="lg-neo-caption text-left p-4 bg-white border-l-8 border-black text-black">
                <h4 className="font-black uppercase italic text-lg border-b-2 border-black pb-1 mb-2">{photo.caption}</h4>
                <div className="text-xs font-bold leading-relaxed opacity-80" dangerouslySetInnerHTML={{ __html: photo.richText || 'NO_METADATA_FOUND' }} />
              </div>
            </div>
            <img
              alt={photo.caption}
              src={photo.src}
              className="w-full h-full object-cover block"
            />
          </a>

        ))}
      </LightGallery>
    </div>
  );
}