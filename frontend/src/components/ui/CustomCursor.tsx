import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLImageElement>(null);
  const [cursorType, setCursorType] = useState('Normal');
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) return;

    // Move the cursor element to body to avoid clipping or stacking context issues
    if (cursorRef.current && cursorRef.current.parentElement !== document.body) {
      document.body.appendChild(cursorRef.current);
    }
    
    if (cursorRef.current) {
      cursorRef.current.style.opacity = '0';
    }

    const updatePosition = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(calc(${e.clientX}px - 2px), calc(${e.clientY}px - 2px))`;
        cursorRef.current.style.opacity = '1';
        
        // Also update cursor type on move to catch textarea resize edges accurately
        if (e.target) {
          updateCursorType(e);
        }

        // Dynamic re-parenting if fancybox is open
        const fancyboxContainer = document.querySelector('.fancybox__container');
        if (fancyboxContainer && cursorRef.current.parentElement !== fancyboxContainer) {
          fancyboxContainer.appendChild(cursorRef.current);
        } else if (!fancyboxContainer && cursorRef.current.parentElement !== document.body) {
          document.body.appendChild(cursorRef.current);
        }
      }
    };

    const handleMouseLeave = () => {
      if (cursorRef.current) {
        cursorRef.current.style.opacity = '0';
      }
    };

    const updateCursorType = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // 取得瀏覽器原生賦予這個元素的樣式
      const computedStyle = window.getComputedStyle(target);
      const cursorValue = computedStyle.cursor;
      const resizeStyle = computedStyle.resize;

      const isFancyboxTarget = target.classList.contains('f-button') || 
                               target.closest('.f-button') !== null;

      // cursorValue 通常會像是: "url(data:image/gif;...), pointer" 或 "text"
      // 我們需要解析出最後面的那個關鍵字（例如 pointer, text, help）
      const cursorParts = cursorValue.split(',');
      const actualCursor = cursorParts[cursorParts.length - 1].trim();

      // 檢查是否是在 Waline 評論區內 (Waline 內部使用了很多自定義元素，有些可能沒有顯式聲明 cursor)
      const isWalineTarget = target.closest('.wl-editor') || target.closest('.wl-panel');
      const isWalineButton = target.closest('.wl-btn') || target.closest('.wl-action') || target.closest('.wl-reaction-item') || target.closest('.wl-like') || target.closest('.wl-reply') || target.closest('.wl-edit') || target.closest('.wl-emoji') || target.closest('.wl-tab');

      // 根據原生 cursor 樣式對應到我們的動畫圖片名稱
      // 檢查 Fancybox 內部狀態
      // 如果是最外層容器、背景或不該有指標的區域，將其重置
      if (actualCursor === 'auto' && target.closest('.fancybox__container') && !target.closest('.fancybox__slide') && !target.closest('.f-button')) {
        setCursorType('Normal');
        return;
      }
      
      const isFancyboxGrab = target.classList.contains('is-grab') || 
                             target.closest('.is-grab') || 
                             target.classList.contains('is-grabbing') || 
                             target.closest('.is-grabbing') ||
                             target.classList.contains('has-panzoom') ||
                             target.closest('.has-panzoom') ||
                             target.classList.contains('fancybox__slide') ||
                             target.closest('.fancybox__slide');

      // 優先處理 Move (抓取)
      if (actualCursor === 'nwse-resize' || actualCursor === 'nw-resize' || actualCursor === 'se-resize') {
        setCursorType('Diagonal1');
      } else if (actualCursor === 'nesw-resize' || actualCursor === 'ne-resize' || actualCursor === 'sw-resize') {
        setCursorType('Diagonal2');
      } else if (actualCursor === 'ns-resize' || actualCursor === 'row-resize' || actualCursor === 's-resize' || actualCursor === 'n-resize') {
        setCursorType('Vertical');
      } else if (actualCursor === 'ew-resize' || actualCursor === 'col-resize' || actualCursor === 'e-resize' || actualCursor === 'w-resize') {
        setCursorType('Horizontal');
      } else if (isFancyboxGrab && !isFancyboxTarget) {
        setCursorType('Move');
      } else if (actualCursor === 'move' || actualCursor === 'grab' || actualCursor === 'grabbing' || actualCursor === 'zoom-in' || actualCursor === 'zoom-out' || target.classList.contains('is-zoomable')) {
        setCursorType('Move');
      } else if (actualCursor === 'pointer' || isWalineButton || isFancyboxTarget) {
        setCursorType('Link');
      } else if (actualCursor === 'alias') {
        setCursorType('Alternate'); // 或者如果你有專門的捷徑指標
      } else if (actualCursor === 'context-menu') {
        setCursorType('Person'); // 或者其他的
      } else if (actualCursor === 'text' || actualCursor === 'vertical-text' || target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea' || target.isContentEditable || (isWalineTarget && !isWalineButton)) {
        setCursorType('Text');
      } else if (actualCursor === 'wait' || actualCursor === 'progress' || target.closest('[aria-busy="true"]') || target.closest('.is-loading') || target.classList.contains('is-loading')) {
        // 如果是純 wait (沙漏)，顯示 Busy；如果是 progress (帶箭頭的沙漏)，顯示 Alternate 或 Working
        setCursorType(actualCursor === 'progress' ? 'Alternate' : 'Busy');
      } else if (actualCursor === 'help') {
        setCursorType('Help');
      } else if (actualCursor === 'crosshair' || actualCursor === 'cell') {
        setCursorType('Precision');
      } else if (target.closest('.pin-cursor') || target.hasAttribute('data-pin')) {
        setCursorType('Pin');
      } else if (target.closest('.handwriting-cursor') || target.hasAttribute('data-handwriting')) {
        setCursorType('Handwriting');
      } else if (actualCursor === 'not-allowed') {
        setCursorType('Unavailable');
      } else {
        // 如果上面都沒命中，但它有 title 或 disabled 屬性，我們手動補位
        if (target.hasAttribute('disabled') || target.closest('[disabled]')) {
          setCursorType('Unavailable');
        } else if (target.tagName.toLowerCase() === 'a' || target.tagName.toLowerCase() === 'button' || target.closest('a') || target.closest('button')) {
          setCursorType('Link');
        } else if (target.hasAttribute('title') || target.closest('[title]')) {
          // 只有當它不是按鈕、不是連結時，才把 title 當作 help 標籤
          setCursorType('Help');
        } else if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') {
          setCursorType('Text');
        } else {
          setCursorType('Normal');
        }
      }
    };

    window.addEventListener('mousemove', updatePosition, { capture: true, passive: true });
    window.addEventListener('mouseover', updateCursorType, { capture: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    // Also update on mouse down/up in case cursor changes
    window.addEventListener('mousedown', updateCursorType, { capture: true });
    window.addEventListener('mouseup', updateCursorType, { capture: true });

    return () => {
      window.removeEventListener('mousemove', updatePosition, { capture: true, passive: true });
      window.removeEventListener('mouseover', updateCursorType, { capture: true });
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', updateCursorType, { capture: true });
      window.removeEventListener('mouseup', updateCursorType, { capture: true });
      
      // Cleanup DOM
      if (cursorRef.current && cursorRef.current.parentElement) {
        cursorRef.current.parentElement.removeChild(cursorRef.current);
      }
    };
  }, [isAdminRoute]);

  if (isAdminRoute) return null;

  return (
    <img
      ref={cursorRef}
      src={`/assets/cursor-png/${cursorType}.apng`}
      alt="cursor"
      className="pointer-events-none"
      style={{
        width: '32px',
        height: '32px',
        zIndex: 2147483647, // Maximum possible z-index
        position: 'fixed',
        top: 0,
        left: 0,
        // Instead of setting display: none here (which gets reset on re-render),
        // we'll rely on a CSS class or let JS set it.
        imageRendering: 'pixelated' // Preserve sharp edges for low-res pixel art cursors
      }}
      onError={(e) => {
        // Fallback to gif/png if apng is missing or fails
        const img = e.target as HTMLImageElement;
        if (img.src.endsWith('.apng')) {
          // Check if it's Person or Pin which are static .png
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
