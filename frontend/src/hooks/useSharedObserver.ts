import { useCallback } from 'react';

interface UseSharedObserverReturn {
  observe: (element: Element, callback: (entry: IntersectionObserverEntry) => void) => void;
  unobserve: (element: Element) => void;
}

const observerMap = new Map<string, IntersectionObserver>();
const callbackMap = new WeakMap<Element, (entry: IntersectionObserverEntry) => void>();
const elementSets = new Map<string, Set<Element>>();

function getKey(rootMargin?: string, threshold?: number | number[]): string {
  return `${rootMargin ?? '0px'}_${JSON.stringify(threshold ?? 0)}`;
}

export function useSharedObserver(options?: {
  rootMargin?: string;
  threshold?: number | number[];
}): UseSharedObserverReturn {
  const rootMargin = options?.rootMargin;
  const threshold = options?.threshold;

  const observe = useCallback(
    (element: Element, callback: (entry: IntersectionObserverEntry) => void) => {
      const key = getKey(rootMargin, threshold);
      callbackMap.set(element, callback);

      let observer = observerMap.get(key);
      if (!observer) {
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const cb = callbackMap.get(entry.target);
              if (cb) cb(entry);
            }
          },
          { rootMargin, threshold },
        );
        observerMap.set(key, observer);
        elementSets.set(key, new Set());
      }
      elementSets.get(key)!.add(element);
      observer.observe(element);
    },
    [rootMargin, threshold],
  );

  const unobserve = useCallback(
    (element: Element) => {
      const key = getKey(rootMargin, threshold);
      const observer = observerMap.get(key);
      const elements = elementSets.get(key);
      if (observer && elements) {
        observer.unobserve(element);
        callbackMap.delete(element);
        elements.delete(element);
        if (elements.size === 0) {
          observer.disconnect();
          observerMap.delete(key);
          elementSets.delete(key);
        }
      }
    },
    [rootMargin, threshold],
  );

  return { observe, unobserve };
}
