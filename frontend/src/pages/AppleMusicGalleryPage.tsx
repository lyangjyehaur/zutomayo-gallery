import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Music } from 'lucide-react';
import { getAppleMusicImgUrl } from '@/lib/image';
import { getAlbumApiBase, getR2Domain } from '@/lib/admin-api';

const AppleMusicTimeline = React.lazy(() => import('@/components/AppleMusicTimeline').then(m => ({ default: m.AppleMusicTimeline })));
const AppleMusicToolPage = React.lazy(() => import('./AppleMusicToolPage'));

export function AppleMusicGalleryPage() {
  const { t } = useTranslation();
  const [albums, setAlbums] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化時就立刻解析 R2 Domain，避免在 map 中重複讀取環境變數
  const r2Domain = getR2Domain();

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const targetUrl = `${getAlbumApiBase()}/apple-music`;
        const res = await fetch(targetUrl);
        const json = await res.json();
        
        if (json.success) {
          setAlbums(json.data);
        } else {
          toast.error(t('app.fetch_failed', '載入資料失敗'));
        }
      } catch (err) {
        toast.error(t('app.fetch_failed', '載入資料失敗'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchAlbums();
  }, [t]);

  const fancyboxImages: any[] = useMemo(() => {
    // 預先編譯常規表達式，避免在迴圈中重複建立 (js-hoist-regexp 最佳實踐)
    const fileNameRegex = /[^a-zA-Z0-9_\-\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/g;

    // 將所有運算合併在一個 pass 中完成，並直接過濾掉隱藏的項目 (js-combine-iterations 最佳實踐)
    const result: any[] = [];
    
    for (let i = 0; i < albums.length; i++) {
      const album = albums[i];
      if (album.is_hidden) continue;

      // 提取日期字串，避免完整 new Date() 解析的成本
      // 假設 API 傳回的是 "YYYY-MM-DD" 格式
      let year = 2000;
      let releaseDateStr = album.release_date;
      
      if (releaseDateStr) {
        if (releaseDateStr.includes('T')) {
          releaseDateStr = releaseDateStr.split('T')[0];
        }
        const yearMatch = releaseDateStr.match(/^(\d{4})/);
        if (yearMatch) year = parseInt(yearMatch[1], 10);
      }

      const losslessStatus = album.is_lossless ? 'Yes (-999.png)' : 'No';
      const richText = `<div class="author">${album.artist_name}</div><div class="post">Region: ${album.apple_region.toUpperCase()}<br/>Release Date: ${releaseDateStr}<br/>Tracks: ${album.track_count}<br/>Type: ${album.collection_type}<br/>Lossless: ${losslessStatus}</div>`;
      
      let fileExt = 'png';
      if (album.r2_url) {
        const parts = album.r2_url.split('.');
        if (parts.length > 1) fileExt = parts.pop() as string;
      }
      
      const rawFilename = `${album.album_name.replace(fileNameRegex, '_')}.${fileExt}`;
      
      // 注意：這裡我們必須手動將 r2_url 的相對路徑補全成完整網址
      const originalImageUrl = album.r2_url ? (album.r2_url.startsWith('http') ? album.r2_url : `${r2Domain}/${album.r2_url.replace(/^\//, '')}`) : album.source_url;

      result.push({
        url: originalImageUrl,
        thumb: getAppleMusicImgUrl(originalImageUrl, 'thumb'),
        src: getAppleMusicImgUrl(originalImageUrl, 'thumb'),
        full: getAppleMusicImgUrl(originalImageUrl, 'full'),
        raw: getAppleMusicImgUrl(originalImageUrl, 'raw'),
        type: 'image',
        caption: album.album_name,
        richText,
        rawFilename: rawFilename,
        originalUrl: album.source_url,
        releaseDateStr: releaseDateStr,
        year: year,
        artist: album.artist_name,
        trackCount: album.track_count,
        collectionType: album.collection_type,
        isHidden: false,
      });
    }
    
    return result;
  }, [albums, r2Domain]);

  return (
    <div className="w-full pb-16">
      {/* 標題區塊 */}
      <div className="flex flex-col items-center justify-center my-12 md:my-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 flex items-center justify-center gap-3 uppercase">
          <span className="bg-black text-main px-4 py-2 inline-flex items-center gap-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-1">
            {t('album_page_title', 'Cover Art Timeline')}
          </span>
        </h2>
        <p className="text-sm md:text-base opacity-70 font-bold max-w-2xl px-4 mt-4">
          {t('album_page_desc', 'High-res artwork gallery for all albums and singles, presented as a timeline.')}
        </p>
      </div>

      {isLoading ? (
        <div className="w-full py-20 flex flex-col items-center justify-center">
          <div className="size-8 border-4 border-black/20 border-t-black animate-spin rounded-full mb-4" />
          <p className="font-mono text-sm font-bold animate-pulse">LOADING_DATA_STREAM...</p>
        </div>
      ) : fancyboxImages.length > 0 ? (
        <Suspense fallback={<div className="text-center opacity-50 py-10 font-mono">INITIALIZING_TIMELINE...</div>}>
          <AppleMusicTimeline images={fancyboxImages} />
        </Suspense>
      ) : (
        <div className="w-full py-10 flex flex-col items-center justify-center opacity-30 text-center px-4">
          <i className="hn hn-image text-5xl mb-4"></i>
          <p className="text-sm font-bold font-mono">NO_ALBUMS_FOUND</p>
        </div>
      )}

      {/* 整合的抓取工具區塊 */}
      <div className="mt-16 md:mt-24 border-t-4 border-black/10 dark:border-white/10 pt-16 md:pt-24 px-4">
        <Suspense fallback={<div className="text-center opacity-50 py-10 text-sm font-bold font-mono">LOADING_TOOL_MODULE...</div>}>
          <AppleMusicToolPage />
        </Suspense>
      </div>
    </div>
  );
}
