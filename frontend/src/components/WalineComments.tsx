import { useEffect, useRef } from 'react';
import { initGeo } from '@/lib/geo';
// Import Waline styles and our overrides
import '@waline/client/style';
import './WalineComments.css';
import { useTranslation } from 'react-i18next';

interface WalineCommentsProps {
  path: string;
  className?: string;
  reactionTitle?: string;
}

declare global {
  interface Window {
    waline?: {
      init: (options: Record<string, unknown>) => void;
    };
  }
}

export function WalineComments({
  path,
  className = '',
  reactionTitle
}: WalineCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const { t, i18n } = useTranslation();

  // 取得使用者語言偏好
  const getLanguage = () => {
    if (typeof window === 'undefined') return 'zh-TW';
    const lang = i18n.language.toLowerCase();
    if (lang.includes('zh-cn') || lang.includes('zh-hans') || lang.includes('zh-sg')) return 'zh-CN';
    if (lang.includes('zh')) return 'zh-TW';
    if (lang.includes('ja')) return 'ja';
    return 'en';
  };

  const currentLang = getLanguage();

  // 根據語言返回對應文案
  const getLocaleText = (key: 'reactionTitleMV' | 'reactionTitleSite' | 'placeholder' | 'login') => {
    return t(`waline.${key}`);
  };

  // 如果外部沒有傳入 reactionTitle，則使用預設的 MV 文案
  const finalReactionTitle = reactionTitle || t("waline.reactionTitleMV", "這支 MV 給你的印象是？");

  const handleWalineInteraction = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const umami = (window as any).umami;
    if (!umami || typeof umami.track !== 'function') return;

    // 1. 攔截文章表態 (Reaction)
    const reactionItem = target.closest('.wl-reaction-item');
    if (reactionItem) {
      const title = reactionItem.getAttribute('title') || 'unknown';
      const action = reactionItem.classList.contains('active') ? 'remove' : 'add';
      umami.track('Z_Waline_Reaction', {
        path,
        reaction: title,
        action: action
      });
      return;
    }

    // 2. 攔截留言排序切換 (最新/最熱/最舊)
    const sortItem = target.closest('.wl-sort button, .wl-sort span');
    if (sortItem && !sortItem.classList.contains('active')) {
      umami.track('Z_Waline_Sort', {
        path,
        sort_type: sortItem.textContent?.trim() || 'unknown'
      });
      return;
    }

    // 3. 攔截單條留言的互動 (按讚與回覆)
    if (target.closest('.wl-like')) {
      umami.track('Z_Waline_Like', { path });
      return;
    }
    if (target.closest('.wl-reply')) {
      umami.track('Z_Waline_Reply_Click', { path });
      return;
    }

    // 4. 攔截編輯器工具列 (展開表情、上傳圖片、預覽)
    const actionBtn = target.closest('.wl-action');
    if (actionBtn) {
      const actionTitle = actionBtn.getAttribute('title') || 'unknown';
      umami.track('Z_Waline_Editor_Action', { 
        path, 
        action: actionTitle 
      });
      return;
    }

    // 5. 攔截登入/登出
    if (target.closest('.wl-login')) {
      umami.track('Z_Waline_Login_Click', { path });
      return;
    }
  };

  useEffect(() => {
    let observer: MutationObserver | null = null;
    let walineInstance: any = null;
    let isMounted = true;
    if (!containerRef.current || initializedRef.current) return;
    
    const currentContainer = containerRef.current;
    // 綁定事件以攔截表態點擊
    currentContainer.addEventListener('click', handleWalineInteraction as unknown as EventListener);

    const initWaline = async () => {
      try {
          // 動態導入 Waline
          const { init } = await import('@waline/client');
          if (!isMounted) return;
          
          // 使用我們寫好的 geo 庫，包含 IP 與時區的精確判斷
          const geoInfo = await initGeo();
          if (!isMounted) return;
          
          // 統一使用 comments.ztmr.club
          const serverURL = 'https://comments.ztmr.club';
            
          // 針對大陸用戶，unpkg.com 經常被干擾，改用 jsDelivr 的 Fastly 節點作為替代方案
          const unpkgHost = geoInfo.isChinaIP ? '//fastly.jsdelivr.net/npm' : '//unpkg.com';
          
          // 針對大陸用戶，Gravatar 頭像可能被牆，改用 Cravatar 鏡像 (透過 DOM 攔截)
          // Cravatar.cn 是專為中國大陸優化的 Gravatar 替代方案
          const gravatarHost = geoInfo.isChinaIP ? 'cravatar.cn/avatar' : 'gravatar.com/avatar';
        
        walineInstance = init({
          el: currentContainer,
          serverURL, // 根據 IP 地區動態切換
          path,

          dark: 'html.dark',
          emoji: [
            '/assets/emoji/nirachan',
            `${unpkgHost}/@waline/emojis@1.4.0/bmoji`,
            `${unpkgHost}/@waline/emojis@1.4.0/bilibili`,
            `${unpkgHost}/@waline/emojis@1.4.0/qq`,
            `${unpkgHost}/@waline/emojis@1.4.0/weibo`,
            `${unpkgHost}/@waline/emojis@1.4.0/tieba`,
            `${unpkgHost}/@waline/emojis@1.4.0/alus`
          ],
          reaction: [
            '/assets/emoji/nirachan/nirachan_heart.gif',
            '/assets/emoji/nirachan/nirachan_cheering.gif',
            '/assets/emoji/nirachan/nirachan_grimace.gif',
            '/assets/emoji/nirachan/nirachan_like.gif',
            '/assets/emoji/nirachan/nirachan_singing.gif',
            '/assets/emoji/nirachan/nirachan_wagging.gif',
            '/assets/emoji/nirachan/nirachan_idle.gif',
            '/assets/emoji/nirachan/nirachan_sleeping.gif',
            '/assets/emoji/nirachan/nirachan_confused.gif',
            '/assets/emoji/nirachan/nirachan_no.gif'
          ],
          meta: ['nick', 'mail'],
          requiredMeta: ['nick'],
          wordLimit: 200,
          pageSize: 10,
          pageview: true,
          
          // 優化：自訂登入提示，增加互動性
          locale: { 
            reactionTitle: finalReactionTitle,
            placeholder: t("waline.placeholder", "歡迎留言討論！(支援 Markdown 語法與圖片上傳)"),
            login: t("waline.login", "登入 (可選)"),
            nick: t("waline.nick", "暱稱"),
            mail: t("waline.mail", "信箱"),
            word: t("waline.word", "字數"),
            search: t("waline.search", "搜尋表情"),
            gif: t("waline.search", "搜尋表情"),
            preview: t("waline.preview", "預覽"),
            submit: t("waline.submit", "提交"),
            comment: t("waline.comment", "評論"),
            sofa: t("waline.sofa", "還沒有評論"),
            latest: t("waline.latest", "最新"),
            oldest: t("waline.oldest", "最久"),
            hottest: t("waline.hottest", "最熱"),
            optional: t("waline.optional", "可選"),
            seconds: t("waline.seconds", "秒前"),
            minutes: t("waline.minutes", "分鐘前"),
            hours: t("waline.hours", "小時前"),
            days: t("waline.days", "天前"),
            now: t("waline.now", "剛剛")
          },
          lang: currentLang
        });
        
        // 修改 Waline 實例中的 gravatar 預設行為
        // Waline v3 預設會使用 gravatar.com，如果沒有提供自訂 imageUploader 或 avatar 配置
        // 但由於 Waline v3 API 移除了直接的 avatar CDN 設定，我們透過動態修改 DOM 來處理
        observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              const imgs = currentContainer.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
              imgs?.forEach(img => {
                if (img.src && (img.src.includes('gravatar.com') || img.src.includes('seccdn.alipay.com') || img.src.includes('sdn.geekzu.org'))) {
                  const originalUrl = new URL(img.src);
                  const queryParams = originalUrl.search;
                  const pathParts = originalUrl.pathname.split('/');
                  const hash = pathParts[pathParts.length - 1]; // 取得 MD5 hash
                  
                  // 根據 IP 地區動態切換頭像 CDN
                  img.src = `https://${gravatarHost}/${hash}${queryParams}`;
                }
              });

              // 替 wl-mail 增加 placeholder 說明
              const mailInput = currentContainer.querySelector('.wl-mail') as HTMLInputElement;
              if (mailInput && !mailInput.getAttribute('data-custom-placeholder')) {
                mailInput.placeholder = t('waline.mailPlaceholder', '留信箱可免登入顯示頭像');
                mailInput.setAttribute('data-custom-placeholder', 'true');
              }
            }
          });
        });
        
        observer.observe(currentContainer, { childList: true, subtree: true });
        
        initializedRef.current = true;
      } catch (error) {
        console.error('Waline initialization failed:', error);
      }
    };

    initWaline();

    return () => {
      isMounted = false;
      if (observer) {
        observer.disconnect();
      }
      if (currentContainer) {
        currentContainer.removeEventListener('click', handleWalineInteraction as unknown as EventListener);
      }
      // 清理 Waline 实例
      if (walineInstance && typeof walineInstance.destroy === 'function') {
        try {
          walineInstance.destroy();
        } catch {
        }
        walineInstance = null;
      }
      initializedRef.current = false;
    };
  }, [path, i18n.language, finalReactionTitle]);

  return <div ref={containerRef} className={className} />;
}
