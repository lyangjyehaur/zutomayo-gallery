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

  useEffect(() => {
    let observer: MutationObserver | null = null;
    let walineInstance: any = null;
    if (!containerRef.current || initializedRef.current) return;

    const initWaline = async () => {
      try {
        // 動態導入 Waline
        const { init } = await import('@waline/client');
        
        // 使用我們寫好的 geo 庫，包含 IP 與時區的精確判斷
        const geoInfo = await initGeo();
        
        // 判斷邏輯：
        // 1. 如果是純大陸 IP -> 走廣州主服 (danndann.cn)
        // 2. 如果是翻牆 VPN 用戶 (IP 海外，但時區是大陸) -> 走香港/CF備服 (dan.tw)。
        //    原因：全局 VPN 連廣州可能很慢，連香港/CF 通常路由更好。
        // 3. 如果是純海外用戶 -> 走香港/CF備服 (dan.tw)
        const serverURL = geoInfo.isChinaIP 
          ? 'https://wl.danndann.cn' // 中國大陸：主用服務
          : 'https://wl.dan.tw';     // 非中國大陸（含翻牆用戶）：備用服務
          
        // 針對大陸用戶，unpkg.com 經常被干擾，改用 jsDelivr 的 Fastly 節點作為替代方案
        const unpkgHost = geoInfo.isChinaIP ? '//fastly.jsdelivr.net/npm' : '//unpkg.com';
        
        // 針對大陸用戶，Gravatar 頭像可能被牆，改用 Cravatar 鏡像 (透過 DOM 攔截)
        // Cravatar.cn 是專為中國大陸優化的 Gravatar 替代方案
        const gravatarHost = geoInfo.isChinaIP ? 'cravatar.cn/avatar' : 'gravatar.com/avatar';
        
        walineInstance = init({
          el: containerRef.current,
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
          
          // 開啟豐富的留言板功能
          search: true,          // 允許搜尋 GIF 動圖
          imageUploader: true,   // 允許上傳圖片
          highlighter: true,     // 開啟程式碼高亮
          texRenderer: true,     // 開啟數學公式渲染
          
          // 優化：自訂登入提示，增加互動性
          locale: { 
            reactionTitle: finalReactionTitle,
            placeholder: t("waline.placeholder", "歡迎留言討論！(支援 Markdown 語法與圖片上傳)"),
            login: t("waline.login", "登入 (可選)")
          },
          lang: currentLang
        });
        
        // 修改 Waline 實例中的 gravatar 預設行為
        // Waline v3 預設會使用 gravatar.com，如果沒有提供自訂 imageUploader 或 avatar 配置
        // 但由於 Waline v3 API 移除了直接的 avatar CDN 設定，我們透過動態修改 DOM 來處理
        observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              const imgs = containerRef.current?.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
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
              const mailInput = containerRef.current?.querySelector('.wl-mail') as HTMLInputElement;
              if (mailInput && !mailInput.getAttribute('data-custom-placeholder')) {
                mailInput.placeholder = t('waline.mail_placeholder', '留信箱可免登入顯示頭像');
                mailInput.setAttribute('data-custom-placeholder', 'true');
              }
            }
          });
        });
        
        if (containerRef.current) {
          observer.observe(containerRef.current, { childList: true, subtree: true });
        }
        
        initializedRef.current = true;
      } catch (error) {
        console.error('Waline 初始化失败:', error);
      }
    };

    initWaline();

    return () => {
      // 清理 Waline 实例
      if (walineInstance && typeof walineInstance.destroy === 'function') {
        walineInstance.destroy();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      if (observer) {
        observer.disconnect();
      }
      initializedRef.current = false;
    };
  }, [path, i18n.language, finalReactionTitle, t]);

  return <div ref={containerRef} className={className} />;
}
