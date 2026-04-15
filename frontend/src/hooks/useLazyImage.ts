import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyImageOptions {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
}

/**
 * 圖片懶加載 Hook
 * 使用 Intersection Observer 實現精確的懶加載控制
 */
export function useLazyImage(options: UseLazyImageOptions = {}) {
  const { 
    rootMargin = '50px', 
    threshold = 0.01,
    triggerOnce = true 
  } = options;
  
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // 如果已經觸發過且設置了 triggerOnce，不再觀察
    if (triggerOnce && shouldLoad) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          if (triggerOnce) {
            observerRef.current?.disconnect();
          }
        } else if (!triggerOnce) {
          setShouldLoad(false);
        }
      },
      { 
        rootMargin,
        threshold,
      }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [rootMargin, threshold, triggerOnce, shouldLoad]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsError(true);
    setIsLoaded(false);
  }, []);

  return {
    elementRef,
    shouldLoad,
    isLoaded,
    isError,
    handleLoad,
    handleError,
  };
}

/**
 * 漸進式圖片加載 Hook
 * 先加載低質量預覽，再加載高清圖
 */
export function useProgressiveImage(
  lowQualityUrl: string | undefined,
  highQualityUrl: string,
  options: UseLazyImageOptions = {}
) {
  const lazyState = useLazyImage(options);
  const [highResLoaded, setHighResLoaded] = useState(false);

  useEffect(() => {
    if (!lazyState.shouldLoad) return;

    // 預加載高清圖
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

/**
 * 批量圖片預加載 Hook
 * 用於預加載下一頁圖片
 */
export function usePreloadImages(imageUrls: string[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || imageUrls.length === 0) return;

    // 使用 requestIdleCallback 在空閒時預加載
    const preload = () => {
      imageUrls.forEach((url, index) => {
        // 限制同時預加載數量
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
