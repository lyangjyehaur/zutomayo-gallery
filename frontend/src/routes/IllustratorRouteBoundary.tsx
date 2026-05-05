import React, { useMemo } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { MVItem } from '@/lib/types';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { MODAL_THEME } from '@/lib/theme';

type AppCommonProps = {
  mvData: MVItem[];
  isLoading: boolean;
  error: string | null;
  metadata: any;
  systemStatus: any;
};

export function IllustratorRouteBoundary() {
  const { mvData, isLoading, metadata } = useOutletContext<AppCommonProps>();
  const { artistId } = useParams();

  const illustrators = useMemo(() => {
    const artistsMap = new Map<string, { name: string; meta?: any }>();
    mvData.forEach((mv) => {
      mv.creators?.forEach((c: any) => {
        const a = typeof c === 'object' ? c.name : c;
        if (!a || a.trim() === '') return;
        if (!artistsMap.has(a)) {
          const meta = metadata?.artistMeta?.[a];
          artistsMap.set(a, { name: a, meta });
        }
      });
    });
    return Array.from(artistsMap.values());
  }, [metadata, mvData]);

  const found = useMemo(() => {
    if (!artistId) return null;
    const decodedId = decodeURIComponent(artistId);
    return illustrators.find(a =>
      a.meta?.dataId === decodedId ||
      a.meta?.id?.replace('@', '') === decodedId ||
      a.name === decodedId
    ) || null;
  }, [artistId, illustrators]);

  if (!artistId) return null;

  if (isLoading && mvData.length === 0) {
    return (
      <div className={`fixed inset-0 z-[140] ${MODAL_THEME.overlay.dialog} flex items-center justify-center`}>
        <div className={`px-6 py-4 border-4 border-black bg-card shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${MODAL_THEME.content.dialog}`}>
          <div className="flex items-center gap-3 font-black uppercase tracking-widest">
            <i className="hn hn-loading text-xl animate-spin"></i>
            <span>Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!found) {
    return (
      <div className="fixed inset-0 z-[150] overflow-auto bg-background">
        <NotFoundPage />
      </div>
    );
  }

  return (
    <Helmet>
      <title>{`${found.meta?.displayName || found.name} | ZUTOMAYO Gallery`}</title>
      <meta property="og:title" content={`${found.meta?.displayName || found.name} | ZUTOMAYO Gallery`} />
      <meta property="og:type" content="profile" />
      {typeof window !== 'undefined' ? <meta property="og:url" content={window.location.href} /> : null}
    </Helmet>
  );
}
