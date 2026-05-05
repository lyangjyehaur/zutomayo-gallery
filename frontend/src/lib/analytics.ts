declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, any>) => void;
      identify?: (data: Record<string, any>) => void;
    };
  }
}

// 避免 React StrictMode 導致重複綁定事件
let isInitialized = false;

const SECONDARY_WEBSITE_ID = import.meta.env.VITE_UMAMI_SECONDARY_WEBSITE_ID || '76cef12d-6b0a-4b5c-882b-36d87912e4f5';
const SECONDARY_HOST_URL = import.meta.env.VITE_UMAMI_SECONDARY_HOST_URL || 'https://gallery.ztmr.club/commons';
const SECONDARY_BASE_SCRIPT = import.meta.env.VITE_UMAMI_SECONDARY_BASE_SCRIPT || '/commons';

export const initAnalytics = () => {
  if (isInitialized) return;
  isInitialized = true;

  const hostname = window.location.hostname;
  const isLocal =
    ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname) ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    window.location.protocol === 'file:';

  if (isLocal) {
    console.log('Local environment detected, skipping Umami analytics loading. Mocking window.umami.track for testing purposes.');

    // 模擬 umami 的 track 方法
    window.umami = {
      track: (payload: any, eventData?: Record<string, any>) => {
        if (typeof payload === 'function') {
          console.group('[Umami Mock] Virtual Pageview');
          console.table(payload({ url: window.location.pathname, title: document.title }));
          console.groupEnd();
        } else if (typeof payload === 'object' && payload !== null) {
          console.group('[Umami Mock] Object Event');
          console.table(payload);
          console.groupEnd();
        } else {
          console.group(`[Umami Mock] Event: ${payload}`);
          if (eventData) {
            console.table(eventData);
          } else {
            console.log('No event data');
          }
          console.groupEnd();
        }
      },
      identify: (data: Record<string, any>) => {
        console.group(`[Umami Mock] Identify`);
        console.table(data);
        console.groupEnd();
      }
    };

    // 模擬 Umami 原生腳本自動擷取 data-umami-event 的行為
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const umamiEl = target.closest('[data-umami-event]');

      if (umamiEl) {
        const eventName = umamiEl.getAttribute('data-umami-event') || 'Unknown';
        const eventData: Record<string, string> = {};

        // 擷取所有 data-umami-event-xxx 作為 eventData
        Array.from(umamiEl.attributes).forEach(attr => {
          if (attr.name.startsWith('data-umami-event-') && attr.name !== 'data-umami-event') {
            const key = attr.name.replace('data-umami-event-', '');
            eventData[key] = attr.value;
          }
        });

        if (window.umami && typeof window.umami.track === 'function') {
          window.umami.track(eventName, Object.keys(eventData).length ? eventData : undefined);
        }
      }
    }, { capture: true });

    // 注意：這裡不 return，讓下面的事件監聽器也能綁定上去
  } else {
    // 避免重複載入 (只在非本地環境載入真實的 script)
    if (!document.querySelector(`script[data-website-id="${SECONDARY_WEBSITE_ID}"]`)) {
      // 第一部分：基礎數據追蹤 (commons.js)
      const script2 = document.createElement('script');
      script2.src = `${SECONDARY_BASE_SCRIPT}/commons.js`;
      script2.defer = true;
      script2.setAttribute('data-website-id', SECONDARY_WEBSITE_ID);
      // 確保新版實例佔用 window.umami，並且使用 /commons/api/send 發送數據
      script2.setAttribute('data-host-url', SECONDARY_HOST_URL);
      document.head.appendChild(script2);

      // 第二部分：螢幕錄影回放 (偽裝為 telemetry.js)
      const script3 = document.createElement('script');
      script3.src = `${SECONDARY_BASE_SCRIPT}/telemetry.js`;
      script3.defer = true;
      script3.setAttribute('data-website-id', SECONDARY_WEBSITE_ID);
      script3.setAttribute('data-sample-rate', '0.50'); // 50% 的訪客會被錄影
      script3.setAttribute('data-mask-level', 'moderate'); // 適度遮罩敏感資訊
      script3.setAttribute('data-max-duration', '300000'); // 最大錄影時長：5分鐘
      script3.setAttribute('data-host-url', SECONDARY_HOST_URL);
      document.head.appendChild(script3);
    }
  }

  // 全域事件代理，追蹤所有可交互元素的點擊
  document.addEventListener('click', (e) => {
    // 確保 umami 已經載入
    if (!window.umami || typeof window.umami.track !== 'function') return;

    // 檢查是否在管理員頁面
    if (window.location.pathname.startsWith('/admin')) {
      // 如果是在管理員頁面，我們只允許記錄特定的手動事件，不進行全域代理追蹤
      return;
    }

    const target = e.target as HTMLElement;
    if (!target || typeof target.closest !== 'function') return;

    // 尋找被點擊的元素，並向上層尋找是否為可交互元素 (擴充了 option, combobox 等選單角色，以及 Fancybox 燈箱內的圖片和按鈕，還有 Waline 評論系統的互動元素)
    const interactable = target.closest('a, button, input[type="button"], input[type="submit"], [role="button"], [role="link"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="tab"], [role="switch"], [role="option"], [role="combobox"], [role="checkbox"], [role="radio"], .gallery-item, .f-button, .fancybox__button, .wl-btn, .wl-action, .wl-reaction-item, .wl-emoji-popup button, .wl-tab, .wl-like, .wl-reply');

    if (interactable) {
      // 如果元素本身或其父元素已經有 data-umami-event 屬性，交給 umami 原生的追蹤機制，避免重複發送
      if (interactable.closest('[data-umami-event]')) {
        return;
      }

      const tagName = interactable.tagName.toLowerCase();
      const role = interactable.getAttribute('role');
      const classes = interactable.getAttribute('class') || '';

      // 識別特定 UI 組件
      let componentType = '';
      if (classes.includes('gallery-item')) componentType = 'Gallery_Image';
      else if (classes.includes('f-button') || classes.includes('fancybox__button')) componentType = 'Fancybox_Button';
      else if (classes.includes('wl-')) componentType = 'Waline_Interaction';

      // 如果是 Fancybox 相關按鈕，嘗試獲取當前圖片資訊
      let targetImageInfo = '';
      if (componentType === 'Fancybox_Button') {
        // 優先嘗試從 Fancybox V5 的 API 獲取精確的檔案名稱
        if ((window as any).Fancybox && typeof (window as any).Fancybox.getInstance === 'function') {
          const instance = (window as any).Fancybox.getInstance();
          if (instance && typeof instance.getSlide === 'function') {
            const slide = instance.getSlide();
            if (slide) {
              if (slide.downloadFilename) {
                targetImageInfo = slide.downloadFilename;
              } else if (slide.caption) {
                const captionText = typeof slide.caption === 'string' ? slide.caption : slide.caption?.textContent;
                if (captionText) targetImageInfo = captionText;
              } else if (slide.alt) {
                targetImageInfo = slide.alt;
              } else if (slide.src) {
                targetImageInfo = String(slide.src).split('/').pop() || '';
              }
            }
          }
        }

        // 如果 API 獲取失敗，退回 DOM 爬取
        if (!targetImageInfo) {
          const activeSlide = document.querySelector('.f-carousel__slide.is-selected img, .fancybox__slide.is-selected .fancybox__image') as HTMLImageElement;
          if (activeSlide) {
            targetImageInfo = activeSlide.alt || activeSlide.src.split('/').pop() || '';
          }
        }
      }

      // 嘗試獲取有意義的標籤文字或屬性
      let label = interactable.getAttribute('aria-label') ||
                  interactable.getAttribute('title') ||
                  (interactable.hasAttribute('data-fancybox-close') ? 'Close' : null) ||
                  (interactable.hasAttribute('data-fancybox-next') ? 'Next' : null) ||
                  (interactable.hasAttribute('data-fancybox-prev') ? 'Prev' : null) ||
                  (classes.includes('wl-reaction-item') ? 'Reaction' : null) ||
                  (classes.includes('wl-like') ? 'Like' : null) ||
                  (classes.includes('wl-reply') ? 'Reply' : null);

      // 如果上面沒抓到，且是圖片縮圖，不要抓裡面的 Loading 文字，改抓圖片本身的 alt 或我們自訂的檔名
      if (!label && componentType === 'Gallery_Image') {
        const filename = interactable.getAttribute('data-filename');
        if (filename) {
          label = filename;
        } else {
          const img = interactable.querySelector('img');
          if (img && img.alt) {
            label = img.alt;
          }
        }
      }

      // 如果還是沒有，再退回抓取 innerText
      if (!label) {
        label = interactable.textContent?.trim() ||
                interactable.getAttribute('name') ||
                interactable.getAttribute('value') ||
                'unknown';
      }

      // 截斷過長的文字並清理換行符號
      label = label.replace(/\s+/g, ' ').slice(0, 50);

      // 忽略燈箱內部的所有其他互動 (包含下方縮圖列的切換、Next/Prev 與縮放)，只保留下載按鈕
      // 注意：關閉燈箱 (Close) 的行為已經交由 FancyboxViewer.tsx 的生命週期事件統一處理，以支援滑動關閉等非點擊操作
      if (interactable.closest('.fancybox__container') || interactable.closest('.f-thumbs') || componentType === 'Fancybox_Button') {
        if (componentType !== 'Fancybox_Button' || label !== 'Download') {
          return; // 忽略不重要的燈箱互動
        }
      }

      // 如果有抓到圖片資訊，附加到標籤後面，例如: "Download (image_name.jpg)"
      if (targetImageInfo && label === 'Download') {
         label = `${label} (${targetImageInfo.substring(0, 30)})`;
      }

      // 收集自定義事件資料
      const eventData: Record<string, string> = {
        type: componentType || (role ? `${tagName}[role="${role}"]` : tagName),
        label: label
      };

      const href = interactable.getAttribute('href');
      if (href) {
        const isOutbound = href.startsWith('http') && !href.includes(window.location.hostname);

        if (isOutbound) {
          window.umami.track('Z_Outbound_Link', {
            url: href,
            label: label,
            current_url: window.location.pathname + window.location.search
          });
          return; // 結束執行，避免與原有的 Z_Interaction 重複發送
        }

        eventData.href = href;
        // 如果是 <a> 標籤或帶有 href 的元素，附加使用者點擊當下的來源網址
        eventData.current_url = window.location.pathname + window.location.search;
      }

      const elementClasses = interactable.getAttribute('class');
      if (elementClasses) eventData.classes = elementClasses;

      // 決定事件名稱：將高價值的畫廊互動從泛用的 Z_Interaction 中獨立出來
      let eventName = 'Z_Interaction';

      if (componentType === 'Gallery_Image') {
        eventName = 'Z_Image_Open'; // 開啟燈箱看大圖
      } else if (componentType === 'Fancybox_Button') {
        if (label.startsWith('Download')) {
          eventName = 'Z_Image_Download'; // 下載圖片
        }
      } else if (componentType === 'Waline_Interaction') {
        // 大多數 Waline 行為由 WalineComments.tsx 自行處理以取得更精確的 Context
        if (classes.includes('wl-reaction-item') || classes.includes('wl-sort') || classes.includes('wl-action') || classes.includes('wl-like') || classes.includes('wl-reply') || classes.includes('wl-login')) {
          return;
        } else if (classes.includes('wl-btn')) {
          eventName = 'Z_Waline_Comment_Submit'; // 送出留言
        }
      }

      // 發送自定義事件 (加入 Z_ 前綴)
      window.umami.track(eventName, eventData);
    }
  }, { capture: true });

  // 全域事件代理，追蹤輸入框和原生選擇框的變更 (如：篩選條件輸入、下拉選單選擇)
  document.addEventListener('change', (e) => {
    if (!window.umami || typeof window.umami.track !== 'function') return;

    // 檢查是否在管理員頁面
    if (window.location.pathname.startsWith('/admin')) {
      // 如果是在管理員頁面，我們只允許記錄特定的手動事件，不進行全域代理追蹤
      return;
    }

    const target = e.target as HTMLElement;
    if (!target || !['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;

    // 忽略密碼等敏感輸入
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'password') return;

    // 避免重複發送
    if (target.closest('[data-umami-event]')) return;

    const tagName = target.tagName.toLowerCase();
    const inputType = target.getAttribute('type');

    // 嘗試獲取輸入框的名稱或提示文字
    let label = target.getAttribute('aria-label') ||
                target.getAttribute('name') ||
                target.getAttribute('placeholder') ||
                target.id ||
                'unknown';

    label = label.replace(/\s+/g, ' ').slice(0, 50);

    // 獲取使用者輸入或選擇的值
    const value = (target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;

    const eventData: Record<string, string> = {
      type: inputType ? `${tagName}[type="${inputType}"]` : tagName,
      label: label,
      value: value ? value.substring(0, 100) : 'unknown' // 記錄輸入的值，限制最大長度為100字元
    };

    const elementClasses = target.getAttribute('class');
    if (elementClasses) eventData.classes = elementClasses;

    // 發送輸入變更事件 (加入 Z_ 前綴)
    window.umami.track('Z_Input_Change', eventData);
  }, { capture: true });
};
