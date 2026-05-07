import { useTranslation } from 'react-i18next';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface PWARecoverDrawerProps {
  isRecoverPromptOpen: boolean;
  setIsRecoverPromptOpen: React.Dispatch<React.SetStateAction<boolean>>;
  runPWARecovery: () => Promise<void>;
}

export function PWARecoverDrawer({ isRecoverPromptOpen, setIsRecoverPromptOpen, runPWARecovery }: PWARecoverDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer open={isRecoverPromptOpen} onOpenChange={setIsRecoverPromptOpen}>
      <DrawerContent onPointerDownOutside={(e) => e.preventDefault()} className="md:max-w-[400px] md:mx-auto md:p-2">
        <div className="w-full mx-auto max-w-[400px] md:max-w-none">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-bold w-full leading-tight">
              {t("app.pwa_recover_title", "修復更新/清除快取")}
            </DrawerTitle>
            <DrawerDescription className="text-[15px] leading-snug">
              {t("app.pwa_recover_desc", "將執行以下操作：")}
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-0 font-base">
            <ul className="list-disc list-outside ml-5 space-y-2 opacity-80 text-left text-[15px]">
              <li className="leading-snug">{t("app.pwa_recover_step_1", "註銷 Service Worker")}</li>
              <li className="leading-snug">{t("app.pwa_recover_step_2", "清除站點快取")}</li>
              <li className="leading-snug">{t("app.pwa_recover_step_3", "重新載入以取得最新版本")}</li>
            </ul>
          </div>

          <DrawerFooter className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => {
                setIsRecoverPromptOpen(false);
                runPWARecovery();
              }}
              className="font-base border-2 text-[15px] h-10 px-4 bg-main text-main-foreground border-border rounded-base w-full flex items-center justify-center transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_var(--border)]"
            >
              {t("app.pwa_recover_action", "清除並重新載入")}
            </button>
            <button
              onClick={() => setIsRecoverPromptOpen(false)}
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
