import { useEffect, useRef } from 'react';
import '@waline/client/style';
import { initGeo } from '@/lib/geo';

interface WalineCommentsProps {
  path: string;
  className?: string;
}

declare global {
  interface Window {
    waline?: {
      init: (options: Record<string, unknown>) => void;
    };
  }
}

export function WalineComments({ path, className = '' }: WalineCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    let observer: MutationObserver | null = null;
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
        
        // 針對大陸用戶，Gravatar 頭像可能被牆，改用 V2EX 鏡像 (透過 DOM 攔截)
        const gravatarHost = geoInfo.isChinaIP ? 'cdn.v2ex.com/gravatar' : 'www.gravatar.com/avatar';
        
        init({
          el: containerRef.current,
          serverURL, // 根據 IP 地區動態切換
          path,

          dark: 'html.dark',
        emoji: [
            `${unpkgHost}/@waline/emojis@1.4.0/bmoji`,
            `${unpkgHost}/@waline/emojis@1.4.0/bilibili`,
            `${unpkgHost}/@waline/emojis@1.4.0/qq`,
            `${unpkgHost}/@waline/emojis@1.4.0/weibo`,
            `${unpkgHost}/@waline/emojis@1.4.0/tieba`,
            `${unpkgHost}/@waline/emojis@1.4.0/alus`
        ],
        reaction: [
            `${unpkgHost}/@waline/emojis@1.4.0/bmoji/bmoji_good.png`,
            `${unpkgHost}/@waline/emojis@1.4.0/bmoji/bmoji_unavailble_doge.png`,
            `${unpkgHost}/@waline/emojis@1.4.0/bmoji/bmoji_call.png`,
            `${unpkgHost}/@waline/emojis@1.4.0/bmoji/bmoji_roll_eye.png`,
            `${unpkgHost}/@waline/emojis@1.4.0/bmoji/bmoji_hmm.png`,
            `${unpkgHost}/@waline/emojis@1.4.0/bmoji/bmoji_what.png`
        ],
          meta: ['nick', 'mail', 'link'],
          requiredMeta: ['nick'],
          wordLimit: 200,
          pageSize: 10,
          locale: { reactionTitle: ''},
          search: false,
          imageUploader: false,
          highlighter: false,
          texRenderer: false
        });
        
        // 修改 Waline 實例中的 gravatar 預設行為
        // Waline v3 預設會使用 gravatar.com，如果沒有提供自訂 imageUploader 或 avatar 配置
        // 但由於 Waline v3 API 移除了直接的 avatar CDN 設定，我們透過動態修改 DOM 來處理
        if (geoInfo.isChinaIP) {
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
                    
                    img.src = `https://cdn.v2ex.com/gravatar/${hash}${queryParams}`;
                  }
                });
              }
            });
          });
          
          if (containerRef.current) {
            observer.observe(containerRef.current, { childList: true, subtree: true });
          }
        }
        
        initializedRef.current = true;
      } catch (error) {
        console.error('Waline 初始化失败:', error);
      }
    };

    initWaline();

    return () => {
      // 清理 Waline 实例
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      if (observer) {
        observer.disconnect();
      }
      initializedRef.current = false;
    };
  }, [path]);

  return <div ref={containerRef} className={className} />;
}
