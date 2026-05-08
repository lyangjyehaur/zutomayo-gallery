import { useTranslation } from 'react-i18next'
import { shouldShowSecondaryLang } from '@/i18n'

interface LoadingScreenProps {
  isTransitioningOut: boolean;
  isAmbient: boolean;
}

export function LoadingScreen({ isTransitioningOut, isAmbient }: LoadingScreenProps) {
  const { t, i18n } = useTranslation()

  return (
    <div className={`min-h-screen bg-background flex flex-col items-center justify-center font-base text-foreground crt-lines transition-all duration-500 ease-in-out ${isTransitioningOut ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}>
      <div className="text-4xl font-black animate-glitch mb-4 uppercase tracking-tighter flex flex-col items-center leading-tight">
        <span className="tracking-normal">{isAmbient ? '真夜中連線中...' : t("app.connecting_db", "連線資料庫中...")}</span>
        {shouldShowSecondaryLang(i18n.language) && (
        <span className="text-[14px] sm:text-[16px] font-mono opacity-60 normal-case mt-2">
          {isAmbient ? 'MIDNIGHT_SIGNAL_SYNC...' : 'Connecting_Database...'}
        </span>
        )}
      </div>
      <div className="w-64 h-4 border-2 border-border p-0.5 bg-card shadow-shadow">
        <div className="h-full bg-main animate-pulse w-1/3"></div>
      </div>
      <div className="mt-6 text-xs opacity-50 font-mono flex flex-col items-center leading-tight">
        <span className="tracking-normal mb-1">{t("app.weak_signal", "訊號微弱... 請稍候")}</span>
        {shouldShowSecondaryLang(i18n.language) && (
        <span className="text-[10px] font-mono opacity-60 normal-case">
          SIGNAL_STRENGTH: WEAK... PLEASE_WAIT
        </span>
        )}
      </div>
    </div>
  )
}
