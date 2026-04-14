import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar } from "@fancyapps/ui/dist/fancybox/fancybox.sidebar.js";
import "@fancyapps/ui/dist/fancybox/fancybox.sidebar.css";
import Fancybox from './Fancybox';
import { MVItem } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';

interface DebugFancyBoxProps {
  mvid?: string;
}

export default function DebugFancyBox({ mvid: propMvid }: DebugFancyBoxProps) {
  const { mvid: urlMvid } = useParams<{ mvid?: string }>();
  const mvid = propMvid || urlMvid;

  const [fancyboxIsActive, setFancyboxIsActive] = useState(false);
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
        console.error("Debug fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mvid]);

  // 將數據轉換為 Fancybox 需要的格式
  const photos = useMemo(() => {
    if (!fetchedData) return [];
    
    // 統一處理為數組以便 flatMap 運作 (不論是單個物件還是陣列)
    const items = Array.isArray(fetchedData) ? fetchedData : [fetchedData];
    
    return items.flatMap(mv =>
      (mv.images || []).map(img => ({
        src: getProxyImgUrl(img.url, 'thumb'),
        full: getProxyImgUrl(img.url, 'full'),
        raw: getProxyImgUrl(img.url, 'raw'),
        caption: img.caption || mv.title,
        alt: img.alt || mv.title,
        richText: img.richText || '',
        originalUrl: img.url
      }))
    );
  }, [fetchedData]);

  return (
    <div className="p-10 bg-background min-h-screen">
      <header className="mb-12 border-b-8 border-border pb-4">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">
          {loading ? 'Fetching_Data...' : (mvid && !Array.isArray(fetchedData) ? `Debug: ${fetchedData?.title}` : 'Fancybox_API_Terminal')}
        </h1>
        <p className="font-bold opacity-50 uppercase mt-2">
          Status: {loading ? 'SYNCING' : (error ? `ERROR: ${error}` : `ONLINE (${photos.length} Assets)`)}
        </p>
      </header>

      {loading && (
        <div className="py-20 text-center animate-pulse font-black text-main uppercase text-xl">
          Accessing_Database_Cluster...
        </div>
      )}

      {error && (
        <div className="p-6 border-4 border-red-500 bg-red-500/10 text-red-500 font-bold mb-8">
          [DATABASE_ERROR]: {error}
        </div>
      )}

      <Fancybox
        options={{
          plugins: {
            Sidebar,
          },
          Sidebar: {
            showOnStart: true,
          },
          Carousel: {
            Toolbar: {
              display: {
                left: ["counter"],
                middle: ["infobar"],
                right: ["download", "sidebar",
                  "zoomIn",
                  "zoomOut",
                  "toggle1to1", "autoplay", "thumbs",
                  "close"],
              },
            },
          },
        }}
        setFancyboxIsActive={setFancyboxIsActive}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {photos.map((photo) => {
            // 構造側邊欄 HTML 內容，保持 Neo-brutalism 風格
            const captionHtml = `
              <div class="fancy-sidebar-content">
                <div class="text-[10px] font-black uppercase bg-black text-[#bcff00] px-2 py-0.5 inline-block mb-4 border border-[#bcff00]">Asset_Metadata_Node</div>
                <h2 class="text-xl font-black italic uppercase tracking-tighter mb-4 leading-none">${photo.caption}</h2>
                <div class="rich-text-content space-y-4 text-sm leading-relaxed border-t-2 border-black pt-4">
                  ${photo.richText || '<span class="opacity-30 italic">No additional telemetry data found for this asset.</span>'}
                </div>
              </div>
            `;

            return (
              <a 
                key={photo.key}
                data-fancybox="gallery" 
                href={photo.full}
                data-slug={photo.alt}
                data-download-src={photo.raw}
                data-caption={captionHtml}
                className="block border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all bg-card overflow-hidden aspect-square"
              >
                <img
                  alt={photo.alt}
                  src={photo.src}
                  className="w-full h-full object-cover block"
                />
              </a>
            );
          })}
        </div>
      </Fancybox>
    </div>
  );
}
