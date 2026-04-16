import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { MVItem, MVImage } from '@/lib/types';
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
    richText: '<div class="author">SYSTEM</div><div class="post">No API response detected.</div><div class="translation"></div>',
    alt: 'FALLBACK_01',
    width: 1200,
    height: 800,
  },
  {
    url:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22900%22 height=%221200%22 viewBox=%220 0 900 1200%22%3E%3Crect width=%22900%22 height=%221200%22 fill=%22%2300aeec%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23ffffff%22%3EFALLBACK_02%3C/text%3E%3C/svg%3E',
    caption: 'FALLBACK_02',
    richText: '<div class="author">SYSTEM</div><div class="post">Using inline SVG assets.</div><div class="translation"></div>',
    alt: 'FALLBACK_02',
    width: 900,
    height: 1200,
  },
  {
    url:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221400%22 height=%22900%22 viewBox=%220 0 1400 900%22%3E%3Crect width=%221400%22 height=%22900%22 fill=%22%23111111%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23bcff00%22%3EFALLBACK_03%3C/text%3E%3C/svg%3E',
    caption: 'FALLBACK_03',
    richText: '<div class="author">SYSTEM</div><div class="post">Click to open Fancybox.</div><div class="translation"></div>',
    alt: 'FALLBACK_03',
    width: 1400,
    height: 900,
  },
  {
    url:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221000%22 height=%221000%22 viewBox=%220 0 1000 1000%22%3E%3Crect width=%221000%22 height=%221000%22 fill=%22%23ff4d4f%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23ffffff%22%3EFALLBACK_04%3C/text%3E%3C/svg%3E',
    caption: 'FALLBACK_04',
    richText: '<div class="author">SYSTEM</div><div class="post">Backdrop z-index test.</div><div class="translation"></div>',
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
    if (!fetchedData) return { images: fallbackImages as unknown as MVImage[], mvTitle: '' };

    if (!Array.isArray(fetchedData)) {
      return { images: fetchedData.images || [], mvTitle: fetchedData.title || '' };
    }

    const merged: MVImage[] = fetchedData.flatMap((mv) =>
      (mv.images || []).map((img, idx) => ({
        ...img,
        caption: img.caption || `${mv.title}_${idx}`,
        richText: img.richText || '',
        alt: img.alt || mv.title,
      })),
    );

    return { images: merged, mvTitle: '' };
  }, [fetchedData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono">
        <div className="text-3xl font-black animate-glitch mb-4 uppercase tracking-tighter">Fetching_Archive...</div>
        <div className="w-72 h-4 border-2 border-border p-0.5 bg-card shadow-shadow">
          <div className="h-full bg-main animate-pulse w-1/3"></div>
        </div>
        <p className="mt-6 text-xs opacity-50 font-mono">TARGET: {mvid ? `MV_${mvid}` : 'FULL_ARCHIVE'} | STATUS: SYNCING</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {error && (
        <div className="p-4 sm:p-6 border-4 border-red-500 bg-red-500/10 text-red-500 font-bold uppercase tracking-tight text-sm sm:text-base">
          [FANCYBOX_ERROR_SIGNAL]: {error}
        </div>
      )}
      <FancyboxViewer
        images={images}
        mvTitle={mvTitle}
        mvId={mvid || ''}
        itemsPerPage={12}
        showHeader={true}
        headerTitle="Fancybox_Debug_Terminal"
        headerSubtitle={`Source: ${mvid ? `Target_MV: ${mvid}` : 'Full_Archive'} | Assets_Count: ${images.length}`}
        enablePagination={true}
        breakpointColumns={GALLERY_BREAKPOINTS}
      />
    </div>
  );
}
