import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ztmy-reduced-motion';

interface UseReducedMotionReturn {
  isReduced: boolean;
  setReduced: (value: boolean) => void;
  toggleReduced: () => void;
  systemPrefersReducedMotion: boolean;
}

function getSystemPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getStoredReduced(): boolean | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
  }
  return null;
}

function storeReduced(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
  }
}

export function useReducedMotion(): UseReducedMotionReturn {
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] = useState(getSystemPreference);
  const [isReduced, setIsReduced] = useState<boolean>(() => {
    const stored = getStoredReduced();
    return stored !== null ? stored : getSystemPreference();
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      const stored = getStoredReduced();
      if (stored === null) {
        setSystemPrefersReducedMotion(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    root.classList.remove('motion-reduced');
    
    if (isReduced) {
      root.classList.add('motion-reduced');
    }
  }, [isReduced]);

  const setReduced = useCallback((value: boolean) => {
    setIsReduced(value);
    storeReduced(value);
  }, []);

  const toggleReduced = useCallback(() => {
    setReduced(!isReduced);
  }, [isReduced, setReduced]);

  return {
    isReduced,
    setReduced,
    toggleReduced,
    systemPrefersReducedMotion,
  };
}
