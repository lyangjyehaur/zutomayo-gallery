import { useEffect, useRef } from 'react';
import '@waline/client/style';

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
    if (!containerRef.current || initializedRef.current) return;

    const initWaline = async () => {
      try {
        // 动态导入 Waline
        const { init } = await import('@waline/client');
        
        init({
          el: containerRef.current,
          serverURL: 'https://wl.danndann.cn', // 请替换为你的 Waline 服务端地址
          path,
          dark: 'html.dark',
        emoji: [
            '//unpkg.com/@waline/emojis@1.4.0/bmoji',
            '//unpkg.com/@waline/emojis@1.4.0/bilibili',
            '//unpkg.com/@waline/emojis@1.4.0/qq',
            '//unpkg.com/@waline/emojis@1.4.0/weibo',
            '//unpkg.com/@waline/emojis@1.4.0/tieba',
            '//unpkg.com/@waline/emojis@1.4.0/alus'
        ],
        reaction: [
            '//unpkg.com/@waline/emojis@1.4.0/bmoji/bmoji_good.png',
            '//unpkg.com/@waline/emojis@1.4.0/bmoji/bmoji_unavailble_doge.png',
            '//unpkg.com/@waline/emojis@1.4.0/bmoji/bmoji_call.png',
            '//unpkg.com/@waline/emojis@1.4.0/bmoji/bmoji_roll_eye.png',
            '//unpkg.com/@waline/emojis@1.4.0/bmoji/bmoji_hmm.png',
            '//unpkg.com/@waline/emojis@1.4.0/bmoji/bmoji_what.png'
        ],
          meta: ['nick', 'mail', 'link'],
          requiredMeta: ['nick'],
          wordLimit: 200,
          pageSize: 10,
          locale: { reactionTitle: ''}
        });
        
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
      initializedRef.current = false;
    };
  }, [path]);

  return <div ref={containerRef} className={className} />;
}
