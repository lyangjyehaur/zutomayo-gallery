import React from "react"
import { toast } from "sonner"
import { Bell, ChevronDown, ChevronRight, Eye, EyeOff, Globe, Loader2, RadioTower, Save, Send, Settings, TestTube2, Webhook } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adminFetch, getApiRoot } from "@/lib/admin-api"
import { formatApiError } from "@/lib/api-error"

const NOTIFICATION_API = `${getApiRoot()}/notification-settings`

type BarkConfig = {
  has_bark_url: boolean
  has_bark_key: boolean
  bark_url: string | null
  bark_key: string | null
}

type TwitterConfig = {
  rsshub_base_url: string | null
  monitor_cron: string | null
}

type ErrorConfig = {
  threshold: number
  window_ms: number
}

type ApifyConfig = {
  has_api_token: boolean
}

type AllSettings = {
  bark: BarkConfig
  twitter: TwitterConfig
  error: ErrorConfig
  apify: ApifyConfig
}

function SectionCard({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="border-4 border-black rounded-lg bg-background shadow-neo overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-6 py-4 hover:bg-secondary/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {icon}
        <h2 className="text-lg font-heading font-bold flex-1 text-left">{title}</h2>
        {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>
      {open && <div className="px-6 pb-6 space-y-4 border-t-2 border-black/10">{children}</div>}
    </div>
  )
}

function EnvBadge() {
  return (
    <span className="inline-block ml-2 px-2 py-0.5 text-[10px] font-mono border-2 border-black bg-yellow-200 text-black rounded">
      from .env
    </span>
  )
}

export function AdminNotificationSettingsPage() {
  // Bark
  const [barkUrl, setBarkUrl] = React.useState("")
  const [barkKey, setBarkKey] = React.useState("")
  const [barkHasUrl, setBarkHasUrl] = React.useState(false)
  const [barkHasKey, setBarkHasKey] = React.useState(false)
  const [isSavingBark, setIsSavingBark] = React.useState(false)
  const [isTestingBark, setIsTestingBark] = React.useState(false)

  // Twitter
  const [rsshubBaseUrl, setRsshubBaseUrl] = React.useState("")
  const [monitorCron, setMonitorCron] = React.useState("")
  const [isSavingTwitter, setIsSavingTwitter] = React.useState(false)

  // Error
  const [threshold, setThreshold] = React.useState("")
  const [windowMs, setWindowMs] = React.useState("")
  const [isSavingError, setIsSavingError] = React.useState(false)

  // Apify
  const [apifyToken, setApifyToken] = React.useState("")
  const [apifyHasToken, setApifyHasToken] = React.useState(false)
  const [showApifyToken, setShowApifyToken] = React.useState(false)
  const [isSavingApify, setIsSavingApify] = React.useState(false)

  const [isLoading, setIsLoading] = React.useState(true)

  const loadAll = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await adminFetch(NOTIFICATION_API)
      const json = await res.json()
      if (!res.ok) throw json

      const data: AllSettings = json.data || json

      // Bark
      setBarkHasUrl(data.bark?.has_bark_url ?? false)
      setBarkHasKey(data.bark?.has_bark_key ?? false)

      // Twitter
      setRsshubBaseUrl(data.twitter?.rsshub_base_url || "")
      setMonitorCron(data.twitter?.monitor_cron || "")

      // Error
      setThreshold(String(data.error?.threshold ?? ""))
      setWindowMs(String(data.error?.window_ms ? data.error.window_ms / 60000 : ""))

      // Apify
      setApifyHasToken(data.apify?.has_api_token ?? false)
    } catch (error: any) {
      toast.error(formatApiError(error, "載入通知設定失敗"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => { loadAll() }, [loadAll])

  // ---- Bark Save ----
  const handleSaveBark = async () => {
    setIsSavingBark(true)
    try {
      const body: Record<string, string> = {}
      if (barkUrl.trim()) body.bark_url = barkUrl.trim()
      if (barkKey.trim()) body.bark_key = barkKey.trim()
      if (Object.keys(body).length === 0) {
        toast.error("請輸入至少一個欄位")
        setIsSavingBark(false)
        return
      }
      const res = await adminFetch(`${NOTIFICATION_API}/bark`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw json
      toast.success("Bark 設定已儲存")
      setBarkUrl("")
      setBarkKey("")
      await loadAll()
    } catch (error: any) {
      toast.error(formatApiError(error, "儲存 Bark 設定失敗"))
    } finally {
      setIsSavingBark(false)
    }
  }

  // ---- Bark Test ----
  const handleTestBark = async () => {
    setIsTestingBark(true)
    try {
      const res = await adminFetch(`${NOTIFICATION_API}/bark/test`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw json
      toast.success("測試推播已發送！")
    } catch (error: any) {
      toast.error(formatApiError(error, "發送測試推播失敗"))
    } finally {
      setIsTestingBark(false)
    }
  }

  // ---- Twitter Save ----
  const handleSaveTwitter = async () => {
    setIsSavingTwitter(true)
    try {
      const body: Record<string, string> = {}
      if (rsshubBaseUrl.trim()) body.rsshub_base_url = rsshubBaseUrl.trim()
      if (monitorCron.trim()) body.monitor_cron = monitorCron.trim()
      if (Object.keys(body).length === 0) {
        toast.error("請輸入至少一個欄位")
        setIsSavingTwitter(false)
        return
      }
      const res = await adminFetch(`${NOTIFICATION_API}/twitter`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw json
      toast.success("Twitter 監聽設定已儲存")
      await loadAll()
    } catch (error: any) {
      toast.error(formatApiError(error, "儲存 Twitter 監聽設定失敗"))
    } finally {
      setIsSavingTwitter(false)
    }
  }

  // ---- Error Save ----
  const handleSaveError = async () => {
    setIsSavingError(true)
    try {
      const body: Record<string, number> = {}
      if (threshold.trim()) body.threshold = Number(threshold)
      if (windowMs.trim()) body.window_ms = Number(windowMs) * 60000
      if (Object.keys(body).length === 0) {
        toast.error("請輸入至少一個欄位")
        setIsSavingError(false)
        return
      }
      const res = await adminFetch(`${NOTIFICATION_API}/error`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw json
      toast.success("錯誤監控設定已儲存")
      await loadAll()
    } catch (error: any) {
      toast.error(formatApiError(error, "儲存錯誤監控設定失敗"))
    } finally {
      setIsSavingError(false)
    }
  }

  // ---- Apify Save ----
  const handleSaveApify = async () => {
    setIsSavingApify(true)
    try {
      if (!apifyToken.trim()) {
        toast.error("請輸入 API Token")
        setIsSavingApify(false)
        return
      }
      const res = await adminFetch(`${NOTIFICATION_API}/apify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_token: apifyToken.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw json
      toast.success("Apify 設定已儲存")
      setApifyToken("")
      await loadAll()
    } catch (error: any) {
      toast.error(formatApiError(error, "儲存 Apify 設定失敗"))
    } finally {
      setIsSavingApify(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-secondary-background">
        <div className="h-20 bg-background border-b-4 border-black flex items-center px-6 shadow-neo">
          <h1 className="text-xl font-heading font-bold">通知與監聽設定</h1>
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-secondary-background">
      <div className="h-20 bg-background border-b-4 border-black flex items-center px-6 shadow-neo">
        <h1 className="text-xl font-heading font-bold">通知與監聽設定</h1>
      </div>

      <div className="p-6 space-y-6 max-w-2xl">
        {/* ===== Bark 通知 ===== */}
        <SectionCard title="Bark 通知" icon={<Bell className="h-5 w-5" />}>
          <div className="space-y-2">
            <label className="text-sm font-mono font-medium flex items-center">
              Bark URL
              {!barkUrl.trim() && barkHasUrl && <EnvBadge />}
            </label>
            <Input
              type="text"
              value={barkUrl}
              onChange={(e) => setBarkUrl(e.target.value)}
              placeholder={barkHasUrl ? "已設定，留空則保留" : "https://api.day.app/your-server-key"}
              className="border-2 border-black"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-mono font-medium flex items-center">
              Bark Key
              {!barkKey.trim() && barkHasKey && <EnvBadge />}
            </label>
            <Input
              type="text"
              value={barkKey}
              onChange={(e) => setBarkKey(e.target.value)}
              placeholder={barkHasKey ? "已設定，留空則保留" : "輸入 Device Key"}
              className="border-2 border-black"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveBark} disabled={isSavingBark}>
              {isSavingBark ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              儲存設定
            </Button>
            <Button
              variant="neutral"
              onClick={handleTestBark}
              disabled={isTestingBark || !barkHasUrl || !barkHasKey}
            >
              {isTestingBark ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
              測試推播
            </Button>
          </div>
        </SectionCard>

        {/* ===== Twitter 監聽 ===== */}
        <SectionCard title="Twitter 監聽" icon={<RadioTower className="h-5 w-5" />}>

          <div className="space-y-2">
            <label className="text-sm font-mono font-medium">RSSHub Base URL</label>
            <Input
              type="text"
              value={rsshubBaseUrl}
              onChange={(e) => setRsshubBaseUrl(e.target.value)}
              placeholder="https://rsshub.app"
              className="border-2 border-black"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-mono font-medium">Cron 表達式</label>
            <Input
              type="text"
              value={monitorCron}
              onChange={(e) => setMonitorCron(e.target.value)}
              placeholder="*/10 * * * *"
              className="border-2 border-black"
            />
            <p className="text-xs font-mono opacity-60">監聽排程的 cron 表達式，例如: */10 * * * *</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveTwitter} disabled={isSavingTwitter}>
              {isSavingTwitter ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              儲存設定
            </Button>
          </div>
        </SectionCard>

        {/* ===== 錯誤監控 ===== */}
        <SectionCard title="錯誤監控" icon={<Settings className="h-5 w-5" />}>
          <div className="space-y-2">
            <label className="text-sm font-mono font-medium">錯誤閾值 (Threshold)</label>
            <Input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="3"
              min={0}
              className="border-2 border-black"
            />
            <p className="text-xs font-mono opacity-60">在時間窗口內累積多少次錯誤後觸發通知</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-mono font-medium">時間窗口 (分鐘)</label>
            <Input
              type="number"
              value={windowMs}
              onChange={(e) => setWindowMs(e.target.value)}
              placeholder="5"
              min={0}
              className="border-2 border-black"
            />
            <p className="text-xs font-mono opacity-60">統計錯誤的時間範圍（分鐘）</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveError} disabled={isSavingError}>
              {isSavingError ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              儲存設定
            </Button>
          </div>
        </SectionCard>

        {/* ===== Apify ===== */}
        <SectionCard title="Apify" icon={<Globe className="h-5 w-5" />} defaultOpen={false}>
          <div className="space-y-2">
            <label className="text-sm font-mono font-medium flex items-center">
              API Token
              {!apifyToken.trim() && apifyHasToken && <EnvBadge />}
            </label>
            <div className="relative">
              <Input
                type={showApifyToken ? "text" : "password"}
                value={apifyToken}
                onChange={(e) => setApifyToken(e.target.value)}
                placeholder={apifyHasToken ? "••••••••（已設定，留空則保留）" : "輸入 Apify API Token"}
                className="border-2 border-black pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApifyToken(!showApifyToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
              >
                {showApifyToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveApify} disabled={isSavingApify}>
              {isSavingApify ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              儲存設定
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
