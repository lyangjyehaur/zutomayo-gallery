import { useTranslation } from 'react-i18next';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { toast } from 'sonner';
import { clearGlobalDeferredPrompt } from '@/App';

interface PWAInstallDrawerProps {
  isInstallPromptOpen: boolean;
  setIsInstallPromptOpen: React.Dispatch<React.SetStateAction<boolean>>;
  deferredPrompt: any;
  setDeferredPrompt: React.Dispatch<React.SetStateAction<any>>;
}

export function PWAInstallDrawer({ isInstallPromptOpen, setIsInstallPromptOpen, deferredPrompt, setDeferredPrompt }: PWAInstallDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer open={isInstallPromptOpen} onOpenChange={(open) => {
      if (!open && window.umami) window.umami.track('Z_PWA_Install_Cancel_Swipe');
      setIsInstallPromptOpen(open);
    }}>
      <DrawerContent onPointerDownOutside={(e) => e.preventDefault()} className="md:max-w-[400px] md:mx-auto md:p-2">
        <div className="w-full mx-auto max-w-[400px] md:max-w-none">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-bold w-full leading-tight">
              {t("app.install_pwa_title", "安裝 ZTMY Gallery")}
            </DrawerTitle>
            <DrawerDescription className="text-[15px] leading-snug">
              {t("app.install_pwa_desc", "將網站加入主畫面，獲得最佳體驗：")}
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-0 font-base">
            <ul className="list-disc list-outside ml-5 space-y-2 opacity-80 text-left text-[15px]">
              <li className="leading-snug">{t("app.pwa_feature_1", "無邊框沉浸式全螢幕瀏覽")}</li>
              <li className="leading-snug">{t("app.pwa_feature_2", "圖片動態快取，離線也能看")}</li>
              <li className="leading-snug">{t("app.pwa_feature_3", "支援桌面長按捷徑快速導覽")}</li>
              <li className="leading-snug">{t("app.pwa_feature_4", "與原生 App 相同的順暢體驗")}</li>
            </ul>
          </div>

          <DrawerFooter className="flex flex-col gap-2 mt-4">
            <button
              onClick={async () => {
                setIsInstallPromptOpen(false);
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === 'accepted') {
                    if (window.umami) window.umami.track('Z_PWA_Install_Accepted_Btn');
                    clearGlobalDeferredPrompt();
                    setDeferredPrompt(null);
                  } else {
                    if (window.umami) window.umami.track('Z_PWA_Install_Dismissed_Btn');
                  }
                } else {
                  toast.info("預覽模式：安裝事件尚未觸發", {
                    description: "實際環境中必須滿足 PWA 條件才會出現系統安裝提示",
                    duration: 3000
                  });
                }
              }}
              className="font-base border-2 text-[15px] h-10 px-4 bg-main text-main-foreground border-border rounded-base w-full flex items-center justify-center transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_var(--border)]"
            >
              {t("app.install", "確定安裝")}
            </button>
            <button
              onClick={() => {
                setIsInstallPromptOpen(false);
                if (window.umami) window.umami.track('Z_PWA_Install_Cancel_Toast');
              }}
              className="font-base border-2 text-[15px] h-10 px-4 bg-secondary-background text-foreground border-border rounded-base w-full flex items-center justify-center transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_var(--border)]"
            >
              {t("common.cancel", "取消")}
            </button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
