import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { MVItem, MVMedia } from '@/lib/types';
import FancyboxViewer from '@/components/FancyboxViewer';
import { GALLERY_BREAKPOINTS } from '@/components/galleryBreakpoints';

interface DebugFancyboxMasonryProps {
  mvid?: string;
}

const fallbackImages = [
  {
    url:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22800%22 viewBox=%220 0 1200 800%22%3E%3Crect width=%221200%22 height=%22800%22 fill=%22%2300ff9d%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23000000%22%3EFALLBACK_01%3C/text%3E%3C/svg%3E',
    caption: 'FALLBACK_01',
    richText: '<div class="author">SYSTEM</div><div class="post">未偵測到 API 回應。 (No API response detected.)</div><div class="translation"></div>',
    alt: 'FALLBACK_01',
    width: 1200,
    height: 800,
  },
  {
    url:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22900%22 height=%221200%22 viewBox=%220 0 900 1200%22%3E%3Crect width=%22900%22 height=%221200%22 fill=%22%2300aeec%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23ffffff%22%3EFALLBACK_02%3C/text%3E%3C/svg%3E',
    caption: 'FALLBACK_02',
    richText: '<div class="author">SYSTEM</div><div class="post">使用內嵌 SVG 素材。 (Using inline SVG assets.)</div><div class="translation"></div>',
    alt: 'FALLBACK_02',
    width: 900,
    height: 1200,
  },
  {
    url:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221400%22 height=%22900%22 viewBox=%220 0 1400 900%22%3E%3Crect width=%221400%22 height=%22900%22 fill=%22%23111111%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23bcff00%22%3EFALLBACK_03%3C/text%3E%3C/svg%3E',
    caption: 'FALLBACK_03',
    richText: '<div class="author">SYSTEM</div><div class="post">點擊以開啟 Fancybox。 (Click to open Fancybox.)</div><div class="translation"></div>',
    alt: 'FALLBACK_03',
    width: 1400,
    height: 900,
  },
  {
    url:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221000%22 height=%221000%22 viewBox=%220 0 1000 1000%22%3E%3Crect width=%221000%22 height=%221000%22 fill=%22%23ff4d4f%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23ffffff%22%3EFALLBACK_04%3C/text%3E%3C/svg%3E',
    caption: 'FALLBACK_04',
    richText: '<div class="author">SYSTEM</div><div class="post">背景遮罩 z-index 測試。 (Backdrop z-index test.)</div><div class="translation"></div>',
    alt: 'FALLBACK_04',
    width: 1000,
    height: 1000,
  },
] as const;

export default function DebugFancyboxMasonry({ mvid: propMvid }: DebugFancyboxMasonryProps) {
  const { mvid: urlMvid } = useParams<{ mvid?: string }>();
  const mvid = propMvid || urlMvid;

  const [fetchedData, setFetchedData] = useState<MVItem[] | MVItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = mvid ? `/api/mvs/${mvid}` : '/api/mvs';
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const json = await response.json();
        setFetchedData(json.data || json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mvid]);

  const { images, mvTitle } = useMemo(() => {
    if (!fetchedData) return { images: fallbackImages as unknown as MVMedia[], mvTitle: '' };

    if (!Array.isArray(fetchedData)) {
      return { images: fetchedData.images || [], mvTitle: fetchedData.title || '' };
    }

    const merged: MVMedia[] = fetchedData.flatMap((mv) =>
      (mv.images || []).map((img, idx) => ({
        ...img,
        caption: img.caption || `<span lang="ja">${mv.title}</span>_${idx}`,
        richText: img.richText || '',
        alt: img.alt || mv.title,
      })),
    );

    return { images: merged, mvTitle: '' };
  }, [fetchedData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono">
        <div className="text-3xl font-black animate-glitch mb-4 uppercase tracking-tighter flex flex-col items-center leading-tight">
          <span className="tracking-normal">讀取資料中...</span>
          <span className="text-[10px] font-mono opacity-60 normal-case">Fetching_Archive...</span>
        </div>
        <div className="w-72 h-4 border-2 border-border p-0.5 bg-card shadow-shadow">
          <div className="h-full bg-main animate-pulse w-1/3"></div>
        </div>
        <p className="mt-6 text-xs opacity-50 font-mono flex flex-col items-center leading-tight">
          <span className="tracking-normal">目標：{mvid ? `MV_${mvid}` : '全站資料'} ｜ 狀態：同步中</span>
          <span className="text-[10px] font-mono opacity-60 normal-case">TARGET: {mvid ? `MV_${mvid}` : 'FULL_ARCHIVE'} | STATUS: SYNCING</span>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {error && (
        <div className="p-4 sm:p-6 border-4 border-red-500 bg-red-500/10 text-red-500 font-bold uppercase tracking-tight text-sm sm:text-base">
          <span className="flex flex-col leading-tight">
            <span className="tracking-normal">[錯誤訊號]：{error}</span>
            <span className="text-[10px] font-mono opacity-60 normal-case">[FANCYBOX_ERROR_SIGNAL]</span>
          </span>
        </div>
      )}
      <FancyboxViewer
        images={images}
        mvTitle={mvTitle}
        mvId={mvid || ''}
        itemsPerPage={12}
        showHeader={true}
        enablePagination={true}
        breakpointColumns={GALLERY_BREAKPOINTS}
      />
    </div>
  );
}
