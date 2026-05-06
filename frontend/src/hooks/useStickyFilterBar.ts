import { useEffect, useRef } from 'react';

interface UseStickyFilterBarParams {
  filterDeps: unknown[];
}

export function useStickyFilterBar({ filterDeps }: UseStickyFilterBarParams) {
  const filterBarRef = useRef<HTMLDivElement>(null);
  const filterAnchorRef = useRef<HTMLDivElement>(null);
  const filterBarHeightRef = useRef<number>(80);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (filterAnchorRef.current) {
      setTimeout(() => {
        if (!filterAnchorRef.current) return;

        const anchorTop = filterAnchorRef.current.getBoundingClientRect().top + window.scrollY;
        const targetScrollY = anchorTop + 1;

        window.scrollTo({ top: targetScrollY, behavior: 'instant' });

        setTimeout(() => {
          window.dispatchEvent(new Event('scroll'));
        }, 50);
      }, 50);
    }
  }, filterDeps);

  useEffect(() => {
    const handleScroll = () => {
      const el = filterBarRef.current;
      if (!el || !filterAnchorRef.current) return;

      filterBarHeightRef.current = el.getBoundingClientRect().height;

      const anchorTop = Math.round(filterAnchorRef.current.getBoundingClientRect().top);
      const isSticky = anchorTop <= 0;

      if (!isSticky) {
        if (el.classList.contains('bg-background/95') || el.style.marginLeft !== '') {
          el.classList.remove(
            'bg-background/95',
            'backdrop-blur-md',
            'shadow-sm',
            'border-border',
          );
          el.classList.add('bg-transparent', 'border-transparent');
          el.style.cssText = 'top: 0px;';
        }
      } else {
        if (!el.classList.contains('bg-background/95') || el.style.marginLeft === '') {
          el.classList.add(
            'bg-background/95',
            'backdrop-blur-md',
            'shadow-sm',
            'border-border',
          );
          el.classList.remove('bg-transparent', 'border-transparent');
          el.style.cssText = `
            top: 0px;
            margin-left: calc(50% - 50vw);
            margin-right: calc(50% - 50vw);
            padding-left: calc(50vw - 50%);
            padding-right: calc(50vw - 50%);
            width: 100vw;
            padding-bottom: 1rem;
          `;
        }
      }
    };

    let rafId: number;
    const scrollHandlerWithRaf = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', scrollHandlerWithRaf, { passive: true });
    window.addEventListener('resize', scrollHandlerWithRaf, { passive: true });

    setTimeout(() => scrollHandlerWithRaf(), 50);
    setTimeout(() => scrollHandlerWithRaf(), 300);

    const observer = new ResizeObserver(() => scrollHandlerWithRaf());
    if (filterBarRef.current) observer.observe(filterBarRef.current);

    return () => {
      window.removeEventListener('scroll', scrollHandlerWithRaf);
      window.removeEventListener('resize', scrollHandlerWithRaf);
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, filterDeps);

  return { filterBarRef, filterAnchorRef };
}
