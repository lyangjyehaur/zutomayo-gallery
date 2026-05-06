import { useState, useEffect } from 'react';

interface UseAnimationPauseParams {
  selectedMvId: string | null;
  selectedIllustratorId: string | null;
  isFeedbackOpen: boolean;
  isAboutOpen: boolean;
  isMobile: boolean;
}

export function useAnimationPause({
  selectedMvId,
  selectedIllustratorId,
  isFeedbackOpen,
  isAboutOpen,
  isMobile,
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

  const isGlobalPaused =
    !!selectedMvId ||
    !!selectedIllustratorId ||
    (isFeedbackOpen && isMobile) ||
    (isAboutOpen && isMobile) ||
    !isTabActive;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const titleEl = document.querySelector('.ztmy-cyber-title-crt') as HTMLElement;
        const pulseEl = document.querySelector('header .animate-pulse') as HTMLElement;

        const isPaused = isGlobalPaused || !entry.isIntersecting;

        if (titleEl) {
          titleEl.style.animationPlayState = isPaused ? 'paused' : 'running';
          titleEl.style.setProperty('--anim-state', isPaused ? 'paused' : 'running');
        }
        if (pulseEl) pulseEl.style.animationPlayState = isPaused ? 'paused' : 'running';
      },
      { threshold: 0 },
    );

    const headerEl = document.querySelector('header');
    if (headerEl) {
      observer.observe(headerEl);
    } else {
      const titleEl = document.querySelector('.ztmy-cyber-title-crt') as HTMLElement;
      const pulseEl = document.querySelector('header .animate-pulse') as HTMLElement;

      const isPaused = isGlobalPaused;

      if (titleEl) {
        titleEl.style.animationPlayState = isPaused ? 'paused' : 'running';
        titleEl.style.setProperty('--anim-state', isPaused ? 'paused' : 'running');
      }
      if (pulseEl) pulseEl.style.animationPlayState = isPaused ? 'paused' : 'running';
    }

    return () => observer.disconnect();
  }, [isGlobalPaused]);

  return isGlobalPaused;
}
