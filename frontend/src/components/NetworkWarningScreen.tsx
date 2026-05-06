import { useTranslation } from 'react-i18next'
import { shouldShowSecondaryLang } from '@/i18n'
import { Button } from '@/components/ui/button'

interface NetworkWarningScreenProps {
  isTransitioningOut: boolean;
  isIosMobileSafari: boolean;
  networkType?: string;
  networkSaveData?: boolean;
  onConfirm: () => void;
}

export function NetworkWarningScreen({ isTransitioningOut, isIosMobileSafari, networkType, networkSaveData, onConfirm }: NetworkWarningScreenProps) {
  const { t, i18n } = useTranslation()

  return (
    <div className={`min-h-screen bg-background flex flex-col items-center justify-center font-base text-foreground crt-lines p-6 transition-opacity duration-500 ease-in-out ${isTransitioningOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="max-w-md w-full bg-card border-4 border-black p-6 md:p-8 shadow-neo flex flex-col items-center text-center">
        <div className="flex items-center justify-center mb-4">
          <i className="hn hn-exclamation-triangle-solid text-6xl text-yellow-500 drop-shadow-sm"></i>
        </div>

        <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter flex flex-col items-center leading-tight">
          <span className="tracking-normal text-yellow-500">流量警告</span>
          {shouldShowSecondaryLang(i18n.language) && (
          <span className="text-[10px] sm:text-xs font-mono opacity-60 normal-case mt-1 text-foreground">
            DATA_USAGE_WARNING
          </span>
          )}
        </h2>

        <p className="text-sm font-bold opacity-80 mb-8 leading-relaxed">
          {isIosMobileSafari && !networkType && !networkSaveData
            ? t("app.ios_network_warning", "為保護您的數據流量，若您目前使用行動網路，載入大量圖片可能會消耗較多流量。")
            : t("app.cellular_network_warning", "您正在使用行動數據或省數據模式，載入大量圖片可能會消耗較多流量。")}
        </p>

        <div className="flex flex-col w-full gap-3">
          <Button
            onClick={onConfirm}
            variant="default"
            className="w-full bg-black text-white hover:bg-main hover:text-black border-2 border-transparent font-black shadow-neo py-6 text-base transition-transform active:scale-95"
          >
            {t("common.confirm", "確認並繼續")}
          </Button>
          {shouldShowSecondaryLang(i18n.language) && (
          <p className="text-[10px] font-mono opacity-40 uppercase">
            By continuing, you accept the data usage
          </p>
          )}
        </div>
      </div>
    </div>
  )
}
