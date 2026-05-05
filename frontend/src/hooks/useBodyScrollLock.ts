import { useEffect, useRef } from 'react';

let lockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

function getScrollbarWidth() {
  return window.innerWidth - document.documentElement.clientWidth;
}

function lock() {
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = getScrollbarWidth();
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  lockCount++;
}

function unlock() {
  if (lockCount <= 0) return;
  lockCount--;
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
  }
}

/**
 * 統一的 body 滾動鎖定 Hook。
 * 使用全局計數器，支持多個組件同時/嵌套鎖定，
 * 最後一個 unlock 時才恢復原始樣式。
 */
export function useBodyScrollLock(locked: boolean) {
  const lockedRef = useRef(locked);

  useEffect(() => {
    if (locked && !lockedRef.current) {
      lock();
    } else if (!locked && lockedRef.current) {
      unlock();
    }
    lockedRef.current = locked;

    return () => {
      if (lockedRef.current) {
        unlock();
        lockedRef.current = false;
      }
    };
  }, [locked]);
}
