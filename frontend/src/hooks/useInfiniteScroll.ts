import { useState, useEffect, useRef, useCallback } from 'react';
import type { MVItem } from '@/lib/types';

const PAGE_SIZE = 24;

interface UseInfiniteScrollParams {
  filteredData: MVItem[];
  filterDeps: unknown[];
}

export function useInfiniteScroll({ filteredData, filterDeps }: UseInfiniteScrollParams) {
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const totalCountRef = useRef<number>(filteredData.length);
  const lastBatchStartRef = useRef<number>(0);

  useEffect(() => {
    totalCountRef.current = filteredData.length;
  }, [filteredData.length]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    lastBatchStartRef.current = 0;
  }, filterDeps);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;
      setVisibleCount((prev) => {
        if (prev >= totalCountRef.current) return prev;
        lastBatchStartRef.current = prev;
        return Math.min(prev + PAGE_SIZE, totalCountRef.current);
      });
    },
    [],
  );

  useEffect(() => {
    if (!sentinelEl) return;

    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: '600px',
      threshold: 0,
    });

    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [handleIntersect, sentinelEl]);

  return { visibleCount, setSentinelEl, lastBatchStartRef };
}
