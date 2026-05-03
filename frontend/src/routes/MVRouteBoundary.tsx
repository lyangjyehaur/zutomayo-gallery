import React, { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { useParams, useOutletContext } from 'react-router-dom';
import type { MVItem } from '@/lib/types';
import { useRouteData } from '@/lib/routeData';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { MODAL_THEME } from '@/lib/theme';

type AppCommonProps = {
  mvData: MVItem[];
  isLoading: boolean;
  error: string | null;
  metadata: any;
  systemStatus: any;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err: any = new Error(res.status === 404 ? 'NOT_FOUND' : 'API_ERROR');
    err.status = res.status;
    throw err;
  }
  const result = await res.json();
  return result.data || result;
};

export function MVRouteBoundary() {
  const { mvData } = useOutletContext<AppCommonProps>();
  const { id } = useParams();
  const { setMvRoute } = useRouteData();
  
  useEffect(() => {
    return () => {
      setMvRoute({ status: 'idle', id: null, mv: null, error: null });
    };
  }, [setMvRoute]);

  const mvFromList = useMemo(() => {
    if (!id) return null;
    return mvData.find((m) => m.id === id) || null;
  }, [id, mvData]);

  const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
  const shouldFetch = !!id && !mvFromList;

  const { data, error, isLoading } = useSWR<MVItem>(
    shouldFetch ? `${apiUrl}/${encodeURIComponent(id as string)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!id) {
      setMvRoute({ status: 'idle', id: null, mv: null, error: null });
      return;
    }
    if (mvFromList) {
      setMvRoute({ status: 'success', id, mv: mvFromList, error: null });
      return;
    }
    if (isLoading) {
      setMvRoute({ status: 'loading', id, mv: null, error: null });
      return;
    }
    if (error) {
      setMvRoute({ status: 'error', id, mv: null, error });
      return;
    }
    if (data) {
      setMvRoute({ status: 'success', id, mv: data, error: null });
      return;
    }
    setMvRoute({ status: 'error', id, mv: null, error: new Error('NOT_FOUND') });
  }, [data, error, id, isLoading, mvFromList, setMvRoute]);

  if (!id) return null;

  const showLoading = shouldFetch && isLoading;
  const showNotFound = !mvFromList && !showLoading && !!error;

  if (showNotFound) {
    return (
      <div className="fixed inset-0 z-[220] overflow-auto bg-background">
        <NotFoundPage />
      </div>
    );
  }

  if (showLoading) {
    return (
      <div className={`fixed inset-0 z-[210] ${MODAL_THEME.overlay.dialog} flex items-center justify-center`}>
        <div className={`px-6 py-4 border-4 border-black bg-card shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${MODAL_THEME.content.dialog}`}>
          <div className="flex items-center gap-3 font-black uppercase tracking-widest">
            <i className="hn hn-loading text-xl animate-spin"></i>
            <span>Loading MV…</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
