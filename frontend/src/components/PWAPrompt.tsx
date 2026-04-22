import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAPrompt() {
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
      toast('發現新版本！ (New version available!)', {
        description: '點擊更新以載入最新內容。 (Click to update and load latest content.)',
        duration: Infinity, // Keep the toast open until the user acts
        action: {
          label: '重新載入 (Reload)',
          onClick: () => updateServiceWorker(true),
        },
        cancel: {
          label: '稍後 (Later)',
          onClick: () => setNeedRefresh(false),
        },
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

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
