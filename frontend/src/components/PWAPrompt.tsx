import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { VERSION_CONFIG } from '@/config/version';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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

  // 開發環境除錯按鈕 (強制觸發 PWA 更新提示)
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__TRIGGER_PWA_UPDATE__ = () => {
        console.log("Mocking PWA update prompt...");
        setNeedRefresh(true);
      };
    }
  }, [setNeedRefresh]);

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
      const controller = new AbortController();
      fetch(`/version.json?t=${Date.now()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.version) {
            setNewVersion(data);
          }
        })
        .catch(() => {
        });
    }
  }, [needRefresh]);

  return (
    <Drawer open={needRefresh} onOpenChange={(open) => {
      if (!open && window.umami) window.umami.track('Z_PWA_Update_Dismissed_Swipe');
      setNeedRefresh(open);
    }}>
      <DrawerContent onPointerDownOutside={(e) => e.preventDefault()} className="md:max-w-[400px] md:mx-auto md:p-2">
        <div className="w-full mx-auto max-w-[400px] md:max-w-none">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-bold w-full leading-tight">
              {t('app.pwa_update_title', '發現新版本！')}
            </DrawerTitle>
            <DrawerDescription className="text-[15px] leading-snug">
              {t('app.pwa_update_desc', '點擊更新以載入最新內容。')}
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-0 font-base">
            <div className="bg-secondary-background/50 p-2.5 rounded-base border-2 border-border text-[11px] sm:text-xs flex flex-col gap-1.5">
              <div className="flex justify-between items-center opacity-70">
                <span className="font-base">{t('app.pwa_current_version', 'Current')}</span>
                <span className="font-mono">V{VERSION_CONFIG.app} ({import.meta.env.VITE_BUILD_HASH || 'dev'})</span>
              </div>
              <div className="flex justify-between items-center font-bold text-main">
                <span className="font-base">{t('app.pwa_latest_version', 'Latest 🚀')}</span>
                <span className="font-mono">V{newVersion?.version || '?'} ({newVersion?.buildHash || '?'})</span>
              </div>
            </div>
          </div>

          <DrawerFooter className="flex flex-col gap-2 mt-4">
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
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
