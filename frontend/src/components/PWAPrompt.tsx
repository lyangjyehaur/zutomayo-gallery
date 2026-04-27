import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ModalBackdrop } from '@/components/ModalBackdrop';
import { VERSION_CONFIG } from '@/config/version';

export function PWAPrompt() {
  const { t } = useTranslation();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Optional: you can log here
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success(t('app.pwa_offline_ready', 'PWA 準備就緒，可離線瀏覽'), {
        duration: 4000,
        onDismiss: () => setOfflineReady(false),
      });
    }
  }, [offlineReady, setOfflineReady, t]);

  const [newVersion, setNewVersion] = useState<{ version: string; buildHash: string } | null>(null);

  // Network status listeners
  useEffect(() => {
    const handleOffline = () => {
      toast.error('📶 目前處於離線狀態', {
        description: '部分功能可能無法使用 (Offline: Some features may be unavailable)',
        duration: 4000,
      });
    };

    const handleOnline = () => {
      toast.success('📶 網路已恢復連線', {
        description: '(Online: Connection restored)',
        duration: 3000,
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (needRefresh) {
      fetch(`/version.json?t=${Date.now()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.version) {
            setNewVersion(data);
          }
        })
        .catch(() => {
          // 忽略錯誤，可能剛好沒有產生此檔案
        });
    }
  }, [needRefresh]);

  if (needRefresh) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-end justify-center pb-8 md:pb-12 pointer-events-none">
        <ModalBackdrop zIndex="z-[9999]" />
        <div className="bg-background text-foreground border-border border-2 font-heading shadow-shadow rounded-base flex flex-col gap-4 p-5 w-[356px] md:w-[400px] relative z-[10000] pointer-events-auto mx-auto animate-in slide-in-from-bottom-8 duration-300">
          <h2 className="text-lg font-bold w-full leading-tight">
            {t('app.pwa_update_title', '發現新版本！')}
          </h2>
          <div className="w-full font-base">
            <p className="text-[15px] leading-snug">{t('app.pwa_update_desc', '點擊更新以載入最新內容。')}</p>
            
            <div className="mt-3 bg-secondary-background/50 p-2.5 rounded-base border-2 border-border text-[11px] sm:text-xs flex flex-col gap-1.5 font-mono">
                <div className="flex justify-between items-center opacity-70">
                  <span>{t('app.pwa_current_version', 'Current')}</span>
                  <span>v{VERSION_CONFIG.app} ({import.meta.env.VITE_BUILD_HASH || 'dev'})</span>
                </div>
                <div className="flex justify-between items-center font-bold text-main">
                  <span>{t('app.pwa_latest_version', 'Latest 🚀')}</span>
                  <span>v{newVersion?.version || '?'} ({newVersion?.buildHash || '?'})</span>
                </div>
              </div>
          </div>
          <div className="flex flex-col gap-2 w-full mt-2">
            <button
              onClick={() => {
                if (window.umami) window.umami.track('Z_PWA_Update_Accepted');
                updateServiceWorker(true);
              }}
              className="font-base border-2 text-[15px] h-10 px-4 bg-main text-main-foreground border-border rounded-base w-full flex items-center justify-center transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
            >
              {t('app.pwa_update_reload', '重新載入')}
            </button>
            <button
              onClick={() => {
                if (window.umami) window.umami.track('Z_PWA_Update_Dismissed');
                setNeedRefresh(false);
              }}
              className="font-base border-2 text-[15px] h-10 px-4 bg-secondary-background text-foreground border-border rounded-base w-full flex items-center justify-center transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
            >
              {t('app.later', '稍後再說')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null; // This component just manages side-effects and toasts
}
