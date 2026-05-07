import { useTranslation } from 'react-i18next'
import { shouldShowSecondaryLang } from '@/i18n'
import { Button } from '@/components/ui/button'

interface ErrorScreenProps {
  error: string | null;
}

export function ErrorScreen({ error }: ErrorScreenProps) {
  const { t, i18n } = useTranslation()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center font-base text-foreground crt-lines">
      <div className="text-2xl font-black mb-4 text-red-500 uppercase tracking-tighter flex flex-col items-center leading-tight">
        <span className="tracking-normal">{t("app.db_sync_failed", "資料庫同步失敗")}</span>
        {shouldShowSecondaryLang(i18n.language) && (
        <span className="text-[10px] sm:text-xs font-mono opacity-60 normal-case mt-1">
          Database_Sync_Failed
        </span>
        )}
      </div>
      <p className="text-sm opacity-70 mb-8">{error}</p>
      <Button onClick={() => window.location.reload()} variant="default" className="hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_0px_var(--border)]" data-umami-event="Z_Retry_Connection">{t("app.retry_connection", "重試連線")}</Button>
    </div>
  )
}
