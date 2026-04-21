import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLImageElement>(null);
  const [cursorType, setCursorType] = useState('Normal');
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    // Check if the device supports hover (ignore touch devices)
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || isAdminRoute) {
      return;
    }
    
    if (cursorRef.current) {
      cursorRef.current.style.opacity = '0';
    }

    let rafId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    // 不再使用 lastTarget 作為攔截條件
    // let lastTarget: HTMLElement | null = null;

    const renderPosition = () => {
      if (cursorRef.current && !document.body.classList.contains('cursor-native')) {
        cursorRef.current.style.transform = `translate(calc(${lastX}px - 2px), calc(${lastY}px - 2px))`;
        cursorRef.current.style.opacity = '1';
      }
      rafId = null;
    };

    const updatePosition = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!rafId) {
        rafId = requestAnimationFrame(renderPosition);
      }
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

      // 如果 body 已經加上 cursor-native（按下 Alt），則停止判定
      if (document.body.classList.contains('cursor-native')) return;

      // Dynamic re-parenting if fancybox is open
      // 由於 Fancybox 5 使用了特殊的容器層級或 transform，有時單純的 z-index 無法突破。
      // 我們恢復手動將游標 appendChild 到 Fancybox 容器內的作法，以確保它永遠在最上層。
      // 注意：這一步必須使用 requestAnimationFrame 或放在 setState 之外，避免與 React 渲染衝突
      if (cursorRef.current && e.type !== 'interval') {
        const fancyboxContainer = document.querySelector('.fancybox__container');
        if (fancyboxContainer && cursorRef.current.parentElement !== fancyboxContainer) {
          fancyboxContainer.appendChild(cursorRef.current);
        } else if (!fancyboxContainer && cursorRef.current.parentElement !== document.body) {
          document.body.appendChild(cursorRef.current);
        }
      }

      // 取得瀏覽器原生賦予這個元素的樣式
      const computedStyle = window.getComputedStyle(target);
      const cursorValue = computedStyle.cursor;

      const isFancyboxTarget = target.classList.contains('f-button') || 
                               target.closest('.f-button') !== null ||
                               target.classList.contains('carousel__button') ||
                               target.closest('.carousel__button') !== null ||
                               target.tagName.toLowerCase() === 'svg' && target.closest('.f-button') !== null ||
                               target.tagName.toLowerCase() === 'path' && target.closest('.f-button') !== null;

      // cursorValue 通常會像是: "url(data:image/gif;...), pointer" 或 "text"
      // 我們需要解析出最後面的那個關鍵字（例如 pointer, text, help）
      const cursorParts = cursorValue.split(',');
      const actualCursor = cursorParts[cursorParts.length - 1].trim();

      // 優化：避免 React 重複渲染，同時解決 stale closure (過期閉包) 導致的狀態卡死問題
      const setTypeIfDifferent = (newType: string) => {
        setCursorType((prev) => {
          if (prev !== newType) return newType;
          return prev;
        });
      };

      // 檢查是否是在 Waline 評論區內 (Waline 內部使用了很多自定義元素，有些可能沒有顯式聲明 cursor)
      const isWalineTarget = target.closest('.wl-editor') || target.closest('.wl-panel');
      const isWalineButton = target.closest('.wl-btn') || target.closest('.wl-action') || target.closest('.wl-reaction-item') || target.closest('.wl-like') || target.closest('.wl-reply') || target.closest('.wl-edit') || target.closest('.wl-emoji') || target.closest('.wl-tab');

      // 檢查 Fancybox 的抓取狀態
      const isFancyboxGrab = target.classList.contains('is-grab') || 
                             target.closest('.is-grab') !== null || 
                             target.classList.contains('is-grabbing') || 
                             target.closest('.is-grabbing') !== null ||
                             target.classList.contains('has-panzoom') ||
                             target.closest('.has-panzoom') !== null ||
                             target.classList.contains('fancybox__content') ||
                             target.closest('.fancybox__content') !== null ||
                             target.tagName.toLowerCase() === 'img' && target.closest('.fancybox__slide') !== null;

      // 檢查是否是一般的互動元素 (即使它們沒有顯式設置 cursor: pointer)
      const isInteractiveElement = 
        target.tagName.toLowerCase() === 'a' || 
        target.closest('a') !== null ||
        target.tagName.toLowerCase() === 'button' || 
        target.closest('button') !== null ||
        target.getAttribute('role') === 'button' ||
        target.closest('[role="button"]') !== null;

      // 大部分普通的 div/span/p 都是 auto，直接返回 Normal 可以省下 90% 的判斷時間
      // 注意：我們必須確保它不是任何需要特殊處理的元素（如 Waline, Fancybox, input, textarea 等）
      // 使用 isContentEditable 來判斷那些被設定為可以編輯的 div (例如 Waline 編輯器)
      if (actualCursor === 'auto' && !isWalineTarget && !isWalineButton && !isFancyboxTarget && !isFancyboxGrab && !isInteractiveElement && target.tagName.toLowerCase() !== 'input' && target.tagName.toLowerCase() !== 'textarea' && !target.isContentEditable) {
        // 如果有 title 還是要顯示 Help
        if (target.hasAttribute('title') || target.closest('[title]')) {
          setTypeIfDifferent('Help');
          return;
        }
        
        setTypeIfDifferent('Normal');
        return;
      }

      // 優先處理 Move (抓取) 及 Resize
      if (actualCursor === 'nwse-resize' || actualCursor === 'nw-resize' || actualCursor === 'se-resize') {
        setTypeIfDifferent('Diagonal1');
      } else if (actualCursor === 'nesw-resize' || actualCursor === 'ne-resize' || actualCursor === 'sw-resize') {
        setTypeIfDifferent('Diagonal2');
      } else if (actualCursor === 'ns-resize' || actualCursor === 'row-resize' || actualCursor === 's-resize' || actualCursor === 'n-resize') {
        setTypeIfDifferent('Vertical');
      } else if (actualCursor === 'ew-resize' || actualCursor === 'col-resize' || actualCursor === 'e-resize' || actualCursor === 'w-resize') {
        setTypeIfDifferent('Horizontal');
      } else if (isFancyboxGrab && !isFancyboxTarget && !isInteractiveElement) {
        setTypeIfDifferent('Move');
      } else if (actualCursor === 'move' || actualCursor === 'grab' || actualCursor === 'grabbing' || actualCursor === 'zoom-in' || actualCursor === 'zoom-out' || target.classList.contains('is-zoomable')) {
        setTypeIfDifferent('Move');
      } else if (actualCursor === 'pointer' || isInteractiveElement || isWalineButton || isFancyboxTarget) {
        setTypeIfDifferent('Link');
      } else if (actualCursor === 'alias') {
        setTypeIfDifferent('Alternate'); // 或者如果你有專門的捷徑指標
      } else if (actualCursor === 'context-menu') {
        setTypeIfDifferent('Person'); // 或者其他的
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
        // 如果上面都沒命中，但它有 title 或 disabled 屬性，我們手動補位
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

    // 增加一個低頻定時器，用於補捉某些不會觸發 mouseover/mousemove 但 DOM 發生變化的情況（例如 Modal 彈出時游標停在原地）
    const intervalId = setInterval(() => {
      // 如果滑鼠還沒動過（剛載入頁面），不進行檢測，避免效能浪費
      if (lastX === 0 && lastY === 0) return;
      
      const elUnderCursor = document.elementFromPoint(lastX, lastY) as HTMLElement;
      // 在定時器中，只要元素存在就強制更新一次游標狀態，不依賴 lastTarget 判斷
      if (elUnderCursor) {
        updateCursorType({ target: elUnderCursor, type: 'interval' } as unknown as Event);
      }
    }, 200);

    window.addEventListener('mousemove', updatePosition, { capture: true, passive: true });
    // 使用 mousemove 觸發更新，依賴 requestAnimationFrame 來降頻
    window.addEventListener('mousemove', updateCursorType, { capture: true, passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    // Also update on mouse down/up in case cursor changes
    window.addEventListener('mousedown', updateCursorType, { capture: true });
    window.addEventListener('mouseup', updateCursorType, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      disableNativeCursor();
      clearInterval(intervalId);
      if (rafId) cancelAnimationFrame(rafId);
      
      window.removeEventListener('mousemove', updatePosition, { capture: true });
      window.removeEventListener('mousemove', updateCursorType, { capture: true });
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', updateCursorType, { capture: true });
      window.removeEventListener('mouseup', updateCursorType, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      
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

