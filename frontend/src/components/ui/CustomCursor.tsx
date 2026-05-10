import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const computedStyleCache = new WeakMap<Element, { value: CSSStyleDeclaration; ts: number }>();
const CACHE_TTL = 2000;

function getCachedComputedStyle(el: Element): CSSStyleDeclaration {
  const now = Date.now();
  const cached = computedStyleCache.get(el);
  if (cached && now - cached.ts < CACHE_TTL) return cached.value;
  const value = window.getComputedStyle(el);
  computedStyleCache.set(el, { value, ts: now });
  return value;
}

export default function CustomCursor() {
  const cursorRef = useRef<HTMLImageElement>(null);
  const cursorTypeRef = useRef('Normal');
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');

  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (isAdminRoute) {
      document.body.classList.add('is-admin');
    } else {
      document.body.classList.remove('is-admin');
    }

    const isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    setIsTouchDevice(isTouch);

    if (isTouch || isAdminRoute) {
      return;
    }

    if (cursorRef.current) {
      cursorRef.current.style.opacity = '0';
    }

    let rafId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let lastCursorTypeTime = 0;

    const renderPosition = () => {
      if (cursorRef.current && !document.body.classList.contains('cursor-native')) {
        cursorRef.current.style.transform = `translate(calc(${lastX}px - 2px), calc(${lastY}px - 2px))`;
        cursorRef.current.style.opacity = '1';
      }
      rafId = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!rafId) {
        rafId = requestAnimationFrame(renderPosition);
      }

      const now = Date.now();
      if (now - lastCursorTypeTime < 50) return;
      lastCursorTypeTime = now;

      updateCursorType(e);
    };

    const handleMouseLeave = () => {
      if (cursorRef.current) {
        cursorRef.current.style.opacity = '0';
      }
    };

    const enableNativeCursor = () => {
      document.body.classList.add('cursor-native');
      if (cursorRef.current) {
        cursorRef.current.style.display = 'none';
      }
    };

    const disableNativeCursor = () => {
      document.body.classList.remove('cursor-native');
      if (cursorRef.current) {
        cursorRef.current.style.display = '';
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') enableNativeCursor();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') disableNativeCursor();
    };

    const updateCursorType = (e: MouseEvent | Event) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      if (document.body.classList.contains('cursor-native')) return;

      const computedStyle = getCachedComputedStyle(target);
      const cursorValue = computedStyle.cursor;

      const isFancyboxTarget = target.classList.contains('f-button') ||
                               target.closest('.f-button') !== null ||
                               target.classList.contains('carousel__button') ||
                               target.closest('.carousel__button') !== null ||
                               target.closest('.dl-btn') !== null ||
                               target.tagName.toLowerCase() === 'svg' && target.closest('.f-button') !== null ||
                               target.tagName.toLowerCase() === 'path' && target.closest('.f-button') !== null;

      const cursorParts = cursorValue.split(',');
      const actualCursor = cursorParts[cursorParts.length - 1].trim();

      const setTypeIfDifferent = (newType: string) => {
        if (cursorTypeRef.current !== newType) {
          cursorTypeRef.current = newType;
          if (cursorRef.current) {
            cursorRef.current.src = `/assets/cursor-png/${newType}.apng`;
          }
        }
      };

      const isWalineTarget = target.closest('.wl-editor') || target.closest('.wl-panel');
      const isWalineButton = target.closest('.wl-btn') || target.closest('.wl-action') || target.closest('.wl-reaction-item') || target.closest('.wl-like') || target.closest('.wl-reply') || target.closest('.wl-edit') || target.closest('.wl-emoji') || target.closest('.wl-tab');

      const isFancyboxGrab = target.classList.contains('is-grab') ||
                             target.closest('.is-grab') !== null ||
                             target.classList.contains('is-grabbing') ||
                             target.closest('.is-grabbing') !== null ||
                             target.classList.contains('has-panzoom') ||
                             target.closest('.has-panzoom') !== null ||
                             target.classList.contains('fancybox__content') ||
                             target.closest('.fancybox__content') !== null ||
                             target.tagName.toLowerCase() === 'img' && target.closest('.fancybox__slide') !== null;

      const isUnderFancybox = target.closest('.fancybox__container') !== null ||
                              target.classList.contains('fancybox__container') ||
                              document.querySelector('.fancybox__container') !== null;

      const isInteractiveElement =
        target.tagName.toLowerCase() === 'a' ||
        target.closest('a') !== null ||
        target.tagName.toLowerCase() === 'button' ||
        target.closest('button') !== null ||
        target.getAttribute('role') === 'button' ||
        target.closest('[role="button"]') !== null;

      if (actualCursor === 'auto' && !isWalineTarget && !isWalineButton && !isFancyboxTarget && !isFancyboxGrab && !isUnderFancybox && !isInteractiveElement && target.tagName.toLowerCase() !== 'input' && target.tagName.toLowerCase() !== 'textarea' && !target.isContentEditable) {
        if (target.hasAttribute('title') || target.closest('[title]')) {
          setTypeIfDifferent('Help');
          return;
        }

        setTypeIfDifferent('Normal');
        return;
      }

      if (actualCursor === 'default' && !isWalineTarget && !isWalineButton && !isFancyboxTarget && !isFancyboxGrab && !isUnderFancybox && !isInteractiveElement && target.tagName.toLowerCase() !== 'input' && target.tagName.toLowerCase() !== 'textarea' && !target.isContentEditable) {
        if (target.hasAttribute('title') || target.closest('[title]')) {
          setTypeIfDifferent('Help');
          return;
        }

        setTypeIfDifferent('Normal');
        return;
      }

      const isAnnotationTarget = target.closest('[data-annotation]') !== null;

      if (actualCursor === 'nwse-resize' || actualCursor === 'nw-resize' || actualCursor === 'se-resize') {
        setTypeIfDifferent('Diagonal1');
      } else if (actualCursor === 'nesw-resize' || actualCursor === 'ne-resize' || actualCursor === 'sw-resize') {
        setTypeIfDifferent('Diagonal2');
      } else if (actualCursor === 'ns-resize' || actualCursor === 'row-resize' || actualCursor === 's-resize' || actualCursor === 'n-resize') {
        setTypeIfDifferent('Vertical');
      } else if (actualCursor === 'ew-resize' || actualCursor === 'col-resize' || actualCursor === 'e-resize' || actualCursor === 'w-resize') {
        setTypeIfDifferent('Horizontal');
      } else if (isAnnotationTarget) {
        setTypeIfDifferent('Help');
      } else if (isFancyboxGrab && !isFancyboxTarget && !isInteractiveElement) {
        setTypeIfDifferent('Move');
      } else if (actualCursor === 'move' || actualCursor === 'grab' || actualCursor === 'grabbing' || actualCursor === 'zoom-in' || actualCursor === 'zoom-out' || target.classList.contains('is-zoomable')) {
        setTypeIfDifferent('Move');
      } else if (actualCursor === 'pointer' || isInteractiveElement || isWalineButton || isFancyboxTarget) {
        setTypeIfDifferent('Link');
      } else if (actualCursor === 'alias') {
        setTypeIfDifferent('Alternate');
      } else if (actualCursor === 'context-menu') {
        setTypeIfDifferent('Person');
      } else if (actualCursor === 'text' || actualCursor === 'vertical-text' || target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea' || target.isContentEditable || (isWalineTarget && !isWalineButton)) {
        setTypeIfDifferent('Text');
      } else if (actualCursor === 'wait' || actualCursor === 'progress' || target.closest('[aria-busy="true"]') || target.closest('.is-loading') || target.classList.contains('is-loading')) {
        setTypeIfDifferent(actualCursor === 'progress' ? 'Alternate' : 'Busy');
      } else if (actualCursor === 'help') {
        setTypeIfDifferent('Help');
      } else if (actualCursor === 'crosshair' || actualCursor === 'cell') {
        setTypeIfDifferent('Precision');
      } else if (target.closest('.pin-cursor') || target.hasAttribute('data-pin')) {
        setTypeIfDifferent('Pin');
      } else if (target.closest('.handwriting-cursor') || target.hasAttribute('data-handwriting')) {
        setTypeIfDifferent('Handwriting');
      } else if (actualCursor === 'not-allowed') {
        setTypeIfDifferent('Unavailable');
      } else {
        if (isUnderFancybox && actualCursor === 'auto' && !isFancyboxTarget && !isInteractiveElement) {
          setTypeIfDifferent('Normal');
          return;
        }

        if (target.hasAttribute('disabled') || target.closest('[disabled]')) {
          setTypeIfDifferent('Unavailable');
        } else if (target.tagName.toLowerCase() === 'a' || target.tagName.toLowerCase() === 'button' || target.closest('a') || target.closest('button')) {
          setTypeIfDifferent('Link');
        } else if (target.hasAttribute('title') || target.closest('[title]')) {
          setTypeIfDifferent('Help');
        } else if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') {
          setTypeIfDifferent('Text');
        } else {
          setTypeIfDifferent('Normal');
        }
      }
    };

    const reparentCursor = () => {
      if (!cursorRef.current) return;
      const customDialog = document.getElementById('ztmy-download-dialog');
      const fancyboxContainer = document.querySelector('.fancybox__container');
      const cursor = cursorRef.current;

      if (customDialog && cursor.parentElement !== customDialog) {
        customDialog.appendChild(cursor);
      } else if (!customDialog && fancyboxContainer && cursor.parentElement !== fancyboxContainer) {
        fancyboxContainer.appendChild(cursor);
      } else if (!customDialog && !fancyboxContainer && cursor.parentElement !== document.body) {
        document.body.appendChild(cursor);
      }
    };

    const mutationObserver = new MutationObserver(() => {
      reparentCursor();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('mousemove', handleMouseMove, { capture: true, passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', updateCursorType, { capture: true });
    window.addEventListener('mouseup', updateCursorType, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      disableNativeCursor();
      mutationObserver.disconnect();
      if (rafId) cancelAnimationFrame(rafId);

      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', updateCursorType, { capture: true });
      window.removeEventListener('mouseup', updateCursorType, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });

    };
  }, [isAdminRoute]);

  if (isAdminRoute || isTouchDevice) return null;

  return (
    <img
      ref={cursorRef}
      src={`/assets/cursor-png/${cursorTypeRef.current}.apng`}
      alt="cursor"
      className="pointer-events-none"
      style={{
        width: '32px',
        height: '32px',
        zIndex: 2147483647,
        position: 'fixed',
        top: 0,
        left: 0,
        imageRendering: 'pixelated'
      }}
      onError={(e) => {
        const img = e.target as HTMLImageElement;
        if (img.src.endsWith('.apng')) {
          if (img.src.includes('Person') || img.src.includes('Pin')) {
            img.src = img.src.replace('.apng', '.png');
          } else {
            img.src = img.src.replace('.apng', '.gif');
          }
        }
      }}
    />
  );
}
