import { useState, useEffect, type RefObject } from 'react';

interface UseAnimationPauseParams {
  selectedMvId: string | null;
  selectedIllustratorId: string | null;
  isFeedbackOpen: boolean;
  isAboutOpen: boolean;
  isMobile: boolean;
  headerRef: RefObject<HTMLElement | null>;
}

export function useAnimationPause({
  selectedMvId,
  selectedIllustratorId,
  isFeedbackOpen,
  isAboutOpen,
  isMobile,
  headerRef,
}: UseAnimationPauseParams): boolean {
  const [isTabActive, setIsTabActive] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true,
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => setIsTabActive(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (isTabActive) {
      document.body.classList.remove('tab-hidden');
    } else {
      document.body.classList.add('tab-hidden');
    }
    return () => {
      document.body.classList.remove('tab-hidden');
    };
  }, [isTabActive]);

  const isGlobalPaused =
    !!selectedMvId ||
    !!selectedIllustratorId ||
    (isFeedbackOpen && isMobile) ||
    (isAboutOpen && isMobile) ||
    !isTabActive;

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const applyPauseState = (isPaused: boolean) => {
      const titleEl = headerEl.querySelector('.ztmy-cyber-title-crt') as HTMLElement;
      const pulseEl = headerEl.querySelector('.animate-pulse') as HTMLElement;

      if (titleEl) {
        titleEl.style.animationPlayState = isPaused ? 'paused' : 'running';
        titleEl.style.setProperty('--anim-state', isPaused ? 'paused' : 'running');
      }
      if (pulseEl) pulseEl.style.animationPlayState = isPaused ? 'paused' : 'running';
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        applyPauseState(isGlobalPaused || !entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(headerEl);

    applyPauseState(isGlobalPaused);

    return () => observer.disconnect();
  }, [isGlobalPaused, headerRef]);

  return isGlobalPaused;
}
