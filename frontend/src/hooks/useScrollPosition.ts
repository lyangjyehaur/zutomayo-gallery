import { useState, useEffect } from 'react';

interface UseScrollPositionParams {
  threshold?: number;
}

export function useScrollPosition({ threshold = 300 }: UseScrollPositionParams = {}): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > threshold);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrolled;
}
