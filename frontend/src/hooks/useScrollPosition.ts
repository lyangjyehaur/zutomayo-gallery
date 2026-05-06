import { useState, useEffect, useRef } from 'react';

interface UseScrollPositionParams {
  threshold?: number;
}

export function useScrollPosition({ threshold = 300 }: UseScrollPositionParams = {}): boolean {
  const [scrolled, setScrolled] = useState(false);
  const prevScrolledRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const next = window.scrollY > threshold;
      if (next !== prevScrolledRef.current) {
        prevScrolledRef.current = next;
        setScrolled(next);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrolled;
}
