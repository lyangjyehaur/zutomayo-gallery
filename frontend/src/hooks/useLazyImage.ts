import { useState, useEffect, useRef, useCallback } from 'react';
import { useSharedObserver } from '@/hooks/useSharedObserver';

interface UseLazyImageOptions {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
}

export function useLazyImage(options: UseLazyImageOptions = {}) {
  const {
    rootMargin = '50px',
    threshold = 0.01,
    triggerOnce = true
  } = options;

  const [shouldLoad, setShouldLoad] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const triggerOnceRef = useRef(triggerOnce);

  const { observe, unobserve } = useSharedObserver({ rootMargin, threshold });

  const setRef = useCallback((node: HTMLDivElement | null) => {
    elementRef.current = node;
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;

    if (triggerOnceRef.current && shouldLoad) return;

    observe(element, (entry) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        if (triggerOnceRef.current) {
          unobserve(element);
        }
      } else if (!triggerOnceRef.current) {
        setShouldLoad(false);
      }
    });

    return () => {
      unobserve(element);
    };
  }, [element, observe, unobserve, shouldLoad]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsError(true);
    setIsLoaded(false);
  }, []);

  return {
    elementRef: setRef,
    element,
    shouldLoad,
    isLoaded,
    isError,
    handleLoad,
    handleError,
  };
}

export function useProgressiveImage(
  lowQualityUrl: string | undefined,
  highQualityUrl: string,
  options: UseLazyImageOptions = {}
) {
  const lazyState = useLazyImage(options);
  const [highResLoaded, setHighResLoaded] = useState(false);

  useEffect(() => {
    if (!lazyState.shouldLoad) return;

    const img = new Image();
    img.src = highQualityUrl;
    img.onload = () => setHighResLoaded(true);
  }, [lazyState.shouldLoad, highQualityUrl]);

  return {
    ...lazyState,
    highResLoaded,
    currentSrc: highResLoaded ? highQualityUrl : lowQualityUrl,
  };
}

export function usePreloadImages(imageUrls: string[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || imageUrls.length === 0) return;

    const preload = () => {
      imageUrls.forEach((url, index) => {
        if (index >= 4) return;

        const img = new Image();
        img.src = url;
      });
    };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(preload, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    } else {
      const timeout = setTimeout(preload, 100);
      return () => clearTimeout(timeout);
    }
  }, [imageUrls, enabled]);
}
