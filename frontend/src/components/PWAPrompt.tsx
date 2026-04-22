import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

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
      toast.success('App ready to work offline', {
        duration: 4000,
        onDismiss: () => setOfflineReady(false),
      });
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast(t('app.pwa_update_title', '發現新版本！'), {
        description: t('app.pwa_update_desc', '點擊更新以載入最新內容。'),
        duration: Infinity,
        position: 'bottom-center',
        className: '!flex-col !items-start !gap-4 !p-5 w-[356px] md:w-[400px]',
        classNames: {
          actionButton: '!w-full !justify-center !text-center !h-10 !text-[15px]',
          cancelButton: '!w-full !justify-center !text-center !h-10 !text-[15px] !mt-2',
          title: '!text-lg !font-bold',
          description: '!w-full',
        },
        action: {
          label: t('app.pwa_update_reload', '重新載入'),
          onClick: () => updateServiceWorker(true),
        },
        cancel: {
          label: t('app.later', '稍後再說'),
          onClick: () => setNeedRefresh(false),
        },
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
