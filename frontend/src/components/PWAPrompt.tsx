import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ModalBackdrop } from '@/components/ModalBackdrop';

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

  useEffect(() => {
    if (needRefresh) {
      toast.custom((t_id) => (
        <>
          <ModalBackdrop />
          <div className="bg-background text-foreground border-border border-2 font-heading shadow-shadow rounded-base flex flex-col gap-4 p-5 w-[356px] md:w-[400px] relative z-[9999] pointer-events-auto">
            <h2 className="text-lg font-bold w-full leading-tight">
              {t('app.pwa_update_title', '發現新版本！')}
            </h2>
            <div className="w-full font-base">
              <p className="text-[15px] leading-snug">{t('app.pwa_update_desc', '點擊更新以載入最新內容。')}</p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={() => {
                  toast.dismiss(t_id);
                  updateServiceWorker(true);
                }}
                className="font-base border-2 text-[15px] h-10 px-4 bg-main text-main-foreground border-border rounded-base w-full flex items-center justify-center transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
              >
                {t('app.pwa_update_reload', '重新載入')}
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t_id);
                  setNeedRefresh(false);
                }}
                className="font-base border-2 text-[15px] h-10 px-4 bg-secondary-background text-foreground border-border rounded-base w-full flex items-center justify-center transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
              >
                {t('app.later', '稍後再說')}
              </button>
            </div>
          </div>
        </>
      ), {
        duration: Infinity,
        position: 'bottom-center',
        unstyled: true,
        className: '!bg-transparent !border-0 !shadow-none !p-0 !w-auto !max-w-none',
      });
    }
  }, [needRefresh, setNeedRefresh, t, updateServiceWorker]);

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

  return null; // This component just manages side-effects and toasts
}
