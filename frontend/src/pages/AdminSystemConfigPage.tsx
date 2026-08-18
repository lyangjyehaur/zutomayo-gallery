import React from "react"
import { toast } from "sonner"
import {
  Bell, ChevronDown, ChevronRight, Eye, EyeOff, Globe, Loader2,
  Lock, RadioTower, RefreshCw, Save, Send, Settings, TestTube2, Unlock,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adminFetch, getSystemConfigApiBase } from "@/lib/admin-api"
import { formatApiError } from "@/lib/api-error"

const SYSTEM_CONFIG_API = getSystemConfigApiBase()

// ── Types ──

type TelegramConfig = {
  has_bot_token: boolean
  bot_token: string | null
  has_chat_id: boolean
  chat_id: string | null
  has_webhook_secret: boolean
  webhook_secret: string | null
  webhook_url: string | null
  from_env: {
    bot_token: boolean
    chat_id: boolean
    webhook_secret: boolean
  }
}

type WebhookInfo = {
  url: string
  has_custom_certificate: boolean
  pending_update_count: number
  ip_address?: string
  last_error_date?: number
  last_error_message?: string
  max_connections?: number
  allowed_updates?: string[]
}

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
  api_token: string
}

type AllSystemSettings = {
  telegram: TelegramConfig
  bark: BarkConfig
  twitter: TwitterConfig
  error: ErrorConfig
  apify: ApifyConfig
}

// ── Cron parser ──

function parseCronToHuman(cron: string): string {
  if (!cron || cron.trim().split(/\s+/).length !== 5) return ""
  const [min, hour, dom, month, dow] = cron.trim().split(/\s+/)

  const parts: string[] = []

  // Day of week
  const dowNames = ["日", "一", "二", "三", "四", "五", "六"]
  if (dow !== "*" && dow !== "0-7") {
    const dows = dow.split(",").map(d => {
      const n = parseInt(d, 10)
      return isNaN(n) ? d : `星期${dowNames[n] || n}`
    })
    parts.push(dows.join("、"))
  }

  // Month
  if (month !== "*") {
    parts.push(`${month} 月`)
  }

  // Day of month
  if (dom !== "*") {
    parts.push(`${dom} 日`)
  }

  // Time
  if (hour === "*" && min === "*") {
    parts.push("每分鐘")
  } else if (hour === "*") {
    parts.push(`每小時的第 ${min} 分鐘`)
  } else if (min === "*") {
    parts.push(`${hour} 時的每分鐘`)
  } else {
    const hList = hour.split(",").join(":00, ") + ":00"
    const mList = min.split(",").join(" 分, ") + " 分"
    if (hour.includes(",")) {
      parts.push(`${hList} 的第 ${mList}`)
    } else if (min.includes(",")) {
      parts.push(`${hour}:00 的第 ${mList}`)
    } else {
      parts.push(`${hour.padStart(2, "0")}:${min.padStart(2, "0")}`)
    }
  }

  // Step values
  if (min.includes("/")) {
    const step = min.split("/")[1]
    parts.splice(parts.length - 1, 1, `每隔 ${step} 分鐘`)
  }
  if (hour.includes("/")) {
    const step = hour.split("/")[1]
    parts.splice(parts.length - 1, 1, `每隔 ${step} 小時`)
  }

  return parts.join("，") || "每個時間單位"
}

const CRON_PRESETS: { label: string; cron: string }[] = [
  { label: "每小時", cron: "0 * * * *" },
  { label: "每30分鐘", cron: "*/30 * * * *" },
  { label: "每天凌晨", cron: "0 0 * * *" },
  { label: "每天中午", cron: "0 12 * * *" },
]

function splitCron(cron: string): [string, string, string, string, string] {
  if (!cron) return ["*", "*", "*", "*", "*"]
  const parts = cron.trim().split(/\s+/)
  if (parts.length === 5) return parts as [string, string, string, string, string]
  return ["*", "*", "*", "*", "*"]
}

function joinCron(parts: [string, string, string, string, string]): string {
  return parts.map(p => p.trim() || "*").join(" ")
}

// ── Reusable components ──

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

// ── Lockable Field Component ──

type LockableInputProps = {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  isSecret?: boolean
  hasConfiguredValue?: boolean
  configuredDisplay?: string | null
  type?: string
  min?: number
  extra?: React.ReactNode
  children?: React.ReactNode
}

function LockableInput({
  label,
  value,
  onChange,
  placeholder,
  isSecret = false,
  hasConfiguredValue = false,
  configuredDisplay,
  type = "text",
  min,
  extra,
  children,
}: LockableInputProps) {
  const [locked, setLocked] = React.useState(hasConfiguredValue)

  // Re-lock when data reloads and field gets a configured value
  React.useEffect(() => {
    setLocked(hasConfiguredValue)
  }, [hasConfiguredValue])

  return (
    <div className="space-y-2">
      <label className="text-sm font-mono font-medium flex items-center">
        {label}
        {extra}
      </label>
      <div className="relative">
        <Input
          type={locked ? "text" : type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={locked}
          min={min}
          className={`border-2 border-black pr-10 ${locked ? "opacity-70 cursor-not-allowed" : ""}`}
        />
        <button
          type="button"
          onClick={() => setLocked(!locked)}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
          title={locked ? "解鎖編輯" : "鎖定"}
        >
          {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4 text-green-600" />}
        </button>
      </div>
      {locked && !value && (
        <p className="text-xs font-mono opacity-60">尚未設定</p>
      )}
      {!locked && children}
    </div>
  )
}

// ── Main page ──

export function AdminSystemConfigPage() {
  // Loading
  const [isLoading, setIsLoading] = React.useState(true)

  // Telegram state
  const [tgConfig, setTgConfig] = React.useState<TelegramConfig | null>(null)
  const [botToken, setBotToken] = React.useState("")
  const [chatId, setChatId] = React.useState("")
  const [webhookSecret, setWebhookSecret] = React.useState("")
  const [showBotToken, setShowBotToken] = React.useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = React.useState(false)
  const [isSavingTg, setIsSavingTg] = React.useState(false)
  const [isTestingTg, setIsTestingTg] = React.useState(false)
  const [isLoadingWebhook, setIsLoadingWebhook] = React.useState(false)
  const [webhookInfo, setWebhookInfo] = React.useState<WebhookInfo | null>(null)
  const [webhookError, setWebhookError] = React.useState<string | null>(null)

  // Bark state
  const [barkUrl, setBarkUrl] = React.useState("")
  const [barkKey, setBarkKey] = React.useState("")
  const [barkHasUrl, setBarkHasUrl] = React.useState(false)
  const [barkHasKey, setBarkHasKey] = React.useState(false)
  const [isSavingBark, setIsSavingBark] = React.useState(false)
  const [isTestingBark, setIsTestingBark] = React.useState(false)

  // Twitter state
  const [rsshubBaseUrl, setRsshubBaseUrl] = React.useState("")
  const [monitorCron, setMonitorCron] = React.useState("")
  const [isSavingTwitter, setIsSavingTwitter] = React.useState(false)
  const [isTriggering, setIsTriggering] = React.useState(false)

  // Cron visual editor state
  const cronParts = splitCron(monitorCron)
  const [cronMin, setCronMin] = React.useState(cronParts[0])
  const [cronHour, setCronHour] = React.useState(cronParts[1])
  const [cronDom, setCronDom] = React.useState(cronParts[2])
  const [cronMonth, setCronMonth] = React.useState(cronParts[3])
  const [cronDow, setCronDow] = React.useState(cronParts[4])

  // Sync cron parts from monitorCron
  React.useEffect(() => {
    const p = splitCron(monitorCron)
    setCronMin(p[0])
    setCronHour(p[1])
    setCronDom(p[2])
    setCronMonth(p[3])
    setCronDow(p[4])
  }, [monitorCron])

  const updateCron = (min: string, hour: string, dom: string, month: string, dow: string) => {
    setCronMin(min)
    setCronHour(hour)
    setCronDom(dom)
    setCronMonth(month)
    setCronDow(dow)
    setMonitorCron(joinCron([min, hour, dom, month, dow]))
  }

  // Error state
  const [threshold, setThreshold] = React.useState("")
  const [windowMs, setWindowMs] = React.useState("")
  const [isSavingError, setIsSavingError] = React.useState(false)

  // Apify state
  const [apifyToken, setApifyToken] = React.useState("")
  const [apifyHasToken, setApifyHasToken] = React.useState(false)
  const [showApifyToken, setShowApifyToken] = React.useState(false)
  const [isSavingApify, setIsSavingApify] = React.useState(false)

  // ── Load all config ──

  const loadAll = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await adminFetch(SYSTEM_CONFIG_API)
      const json = await res.json()
      if (!res.ok) throw json

      const data: AllSystemSettings = json.data || json

      // Telegram
      setTgConfig(data.telegram || null)
      setBotToken(data.telegram?.bot_token || "")
      setChatId(data.telegram?.chat_id || "")
      setWebhookSecret(data.telegram?.webhook_secret || "")

      // Bark
      setBarkUrl(data.bark?.bark_url || "")
      setBarkKey(data.bark?.bark_key || "")
      setBarkHasUrl(data.bark?.has_bark_url ?? false)
      setBarkHasKey(data.bark?.has_bark_key ?? false)

      // Twitter
      setRsshubBaseUrl(data.twitter?.rsshub_base_url || "")
      setMonitorCron(data.twitter?.monitor_cron || "")

      // Error
      setThreshold(String(data.error?.threshold ?? ""))
      setWindowMs(String(data.error?.window_ms ? data.error.window_ms / 60000 : ""))

      // Apify
      setApifyToken(data.apify?.api_token || "")
      setApifyHasToken(data.apify?.has_api_token ?? false)
    } catch (error: any) {
      toast.error(formatApiError(error, "載入系統配置失敗"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadWebhookInfo = React.useCallback(async () => {
    setIsLoadingWebhook(true)
    setWebhookError(null)
    try {
      const res = await adminFetch(`${SYSTEM_CONFIG_API}/telegram/webhook-info`)
      const json = await res.json()
      if (!res.ok) throw json
      setWebhookInfo(json.data || json)
    } catch (error: any) {
      setWebhookError(formatApiError(error, "取得 Webhook 資訊失敗"))
      setWebhookInfo(null)
    } finally {
      setIsLoadingWebhook(false)
    }
  }, [])

  React.useEffect(() => {
    loadAll()
    loadWebhookInfo()
  }, [loadAll, loadWebhookInfo])

  // ── Telegram handlers ──

  const handleSaveTelegram = async () => {
    setIsSavingTg(true)
    try {
      const body: Record<string, string | undefined> = {}
      if (botToken.trim()) body.bot_token = botToken.trim()
      if (chatId.trim()) body.chat_id = chatId.trim()
      if (webhookSecret.trim()) {
        // Telegram secret_token 只允許 A-Z a-z 0-9 _ -
        if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret.trim())) {
          toast.error("Webhook Secret 只能包含英文字母、數字、底線 (_) 和連字號 (-)")
          setIsSavingTg(false)
          return
        }
        body.webhook_secret = webhookSecret.trim()
      }

      if (Object.keys(body).length === 0) {
        toast.error("請輸入至少一個欄位")
        setIsSavingTg(false)
        return
      }

      const res = await adminFetch(`${SYSTEM_CONFIG_API}/telegram`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw json

      toast.success("Telegram 設定已儲存")
      setBotToken("")
      setWebhookSecret("")
      await loadAll()
    } catch (error: any) {
      toast.error(formatApiError(error, "儲存 Telegram 設定失敗"))
    } finally {
      setIsSavingTg(false)
    }
  }

  const handleTestTelegram = async () => {
    setIsTestingTg(true)
    try {
      const res = await adminFetch(`${SYSTEM_CONFIG_API}/telegram/test`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw json
      toast.success(`測試訊息已發送！Message ID: ${json.data?.message_id}`)
    } catch (error: any) {
      toast.error(formatApiError(error, "發送測試訊息失敗"))
    } finally {
      setIsTestingTg(false)
    }
  }

  const envBadge = (field: "bot_token" | "chat_id" | "webhook_secret") => {
    if (!tgConfig?.from_env?.[field]) return null
    return <EnvBadge />
  }

  // ── Bark handlers ──

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
      const res = await adminFetch(`${SYSTEM_CONFIG_API}/bark`, {
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

  const handleTestBark = async () => {
    setIsTestingBark(true)
    try {
      const res = await adminFetch(`${SYSTEM_CONFIG_API}/bark/test`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw json
      toast.success("測試推播已發送！")
    } catch (error: any) {
      toast.error(formatApiError(error, "發送測試推播失敗"))
    } finally {
      setIsTestingBark(false)
    }
  }

  // ── Twitter handler ──

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
      const res = await adminFetch(`${SYSTEM_CONFIG_API}/twitter`, {
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

  const handleTriggerMonitor = async () => {
    setIsTriggering(true)
    try {
      const res = await adminFetch(`${SYSTEM_CONFIG_API}/twitter/trigger`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok) throw json
      toast.success(json.message || "監聽已觸發")
    } catch (error: any) {
      toast.error(formatApiError(error, "觸發監聽失敗"))
    } finally {
      setIsTriggering(false)
    }
  }

  // ── Error handler ──

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
      const res = await adminFetch(`${SYSTEM_CONFIG_API}/error`, {
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

  // ── Apify handler ──

  const handleSaveApify = async () => {
    setIsSavingApify(true)
    try {
      if (!apifyToken.trim()) {
        toast.error("請輸入 API Token")
        setIsSavingApify(false)
        return
      }
      const res = await adminFetch(`${SYSTEM_CONFIG_API}/apify`, {
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

  // ── Render ──

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-secondary-background">
        <div className="h-20 bg-background border-b-4 border-black flex items-center px-6 shadow-neo">
          <h1 className="text-xl font-heading font-bold">系統配置</h1>
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-secondary-background">
      <div className="h-20 bg-background border-b-4 border-black flex items-center justify-between px-6 shadow-neo">
        <h1 className="text-xl font-heading font-bold">系統配置</h1>
        <Button
          variant="neutral"
          size="sm"
          onClick={() => { loadAll(); loadWebhookInfo() }}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          重新整理
        </Button>
      </div>

      <div className="p-6 space-y-6 max-w-2xl">

        {/* ===== Telegram 機器人 ===== */}
        <SectionCard title="Telegram 機器人" icon={<Send className="h-5 w-5" />}>

          <LockableInput
            label="Bot Token"
            value={botToken}
            onChange={setBotToken}
            placeholder={tgConfig?.has_bot_token ? "••••••••（已設定，留空則保留）" : "輸入 Bot Token"}
            isSecret={true}
            hasConfiguredValue={!!tgConfig?.has_bot_token}
            configuredDisplay={tgConfig?.bot_token}
            extra={<>{envBadge("bot_token")}</>}
          />

          <LockableInput
            label="Chat ID"
            value={chatId}
            onChange={setChatId}
            placeholder={tgConfig?.has_chat_id ? "已設定，留空則保留" : "輸入 Chat ID"}
            hasConfiguredValue={!!tgConfig?.has_chat_id}
            configuredDisplay={tgConfig?.chat_id}
            extra={<>{envBadge("chat_id")}</>}
          />

          <LockableInput
            label="Webhook Secret"
            value={webhookSecret}
            onChange={setWebhookSecret}
            placeholder={tgConfig?.has_webhook_secret ? "••••••••（已設定，留空則保留）" : "輸入 Webhook Secret"}
            isSecret={true}
            hasConfiguredValue={!!tgConfig?.has_webhook_secret}
            configuredDisplay={tgConfig?.webhook_secret}
            extra={<>{envBadge("webhook_secret")}</>}
          />
          <p className="text-xs opacity-50 -mt-3">只允許英文字母、數字、底線 (_) 和連字號 (-)，1-256 字元</p>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveTelegram} disabled={isSavingTg}>
              {isSavingTg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              儲存設定
            </Button>
            <Button variant="neutral" onClick={handleTestTelegram} disabled={isTestingTg || !tgConfig?.has_bot_token || !tgConfig?.has_chat_id}>
              {isTestingTg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
              發送測試訊息
            </Button>
          </div>

          {/* Webhook Status */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-heading font-bold">Webhook 狀態</h3>
              <Button variant="noShadow" size="sm" onClick={loadWebhookInfo} disabled={isLoadingWebhook}>
                <RefreshCw className={`h-4 w-4 ${isLoadingWebhook ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {webhookError && (
              <div className="border-2 border-red-500 bg-red-50 text-red-800 rounded p-3 text-sm font-mono mb-2">
                {webhookError}
              </div>
            )}

            {webhookInfo ? (
              <div className="space-y-1 font-mono text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">URL:</span>
                  <span className={webhookInfo.url ? "text-green-700" : "text-gray-500"}>
                    {webhookInfo.url || "未設定"}
                  </span>
                </div>
                {webhookInfo.ip_address && (
                  <div><span className="font-medium">IP:</span> {webhookInfo.ip_address}</div>
                )}
                <div>
                  <span className="font-medium">待處理更新:</span>{" "}
                  <span className={webhookInfo.pending_update_count > 0 ? "text-yellow-600" : ""}>
                    {webhookInfo.pending_update_count}
                  </span>
                </div>
                {webhookInfo.max_connections && (
                  <div><span className="font-medium">最大連線數:</span> {webhookInfo.max_connections}</div>
                )}
                {webhookInfo.last_error_message && (
                  <div className="text-red-600">
                    <span className="font-medium">最近錯誤:</span>{" "}
                    {webhookInfo.last_error_date
                      ? new Date(webhookInfo.last_error_date * 1000).toLocaleString()
                      : ""}
                    <br />
                    {webhookInfo.last_error_message}
                  </div>
                )}
                {webhookInfo.allowed_updates && webhookInfo.allowed_updates.length > 0 && (
                  <div>
                    <span className="font-medium">訂閱更新類型:</span>{" "}
                    {webhookInfo.allowed_updates.join(", ")}
                  </div>
                )}
              </div>
            ) : !webhookError ? (
              <p className="text-sm opacity-60 font-mono">載入中...</p>
            ) : null}
          </div>
        </SectionCard>

        {/* ===== Bark 通知 ===== */}
        <SectionCard title="Bark 通知" icon={<Bell className="h-5 w-5" />}>

          <LockableInput
            label="Bark URL"
            value={barkUrl}
            onChange={setBarkUrl}
            placeholder={barkHasUrl ? "已設定，留空則保留" : `${String(import.meta.env.VITE_BARK_API_BASE_URL || '')}/your-server-key`}
            hasConfiguredValue={barkHasUrl}
          />

          <LockableInput
            label="Bark Key"
            value={barkKey}
            onChange={setBarkKey}
            placeholder={barkHasKey ? "已設定，留空則保留" : "輸入 Device Key"}
            hasConfiguredValue={barkHasKey}
          />

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

          <LockableInput
            label="RSSHub Base URL"
            value={rsshubBaseUrl}
            onChange={setRsshubBaseUrl}
            placeholder={String(import.meta.env.VITE_RSSHUB_BASE_URL || '')}
            hasConfiguredValue={!!rsshubBaseUrl}
            configuredDisplay={rsshubBaseUrl}
          />

          {/* Cron Visual Editor */}
          <div className="space-y-2">
            <label className="text-sm font-mono font-medium">Cron 排程表達式</label>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2">
              {CRON_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const p = splitCron(preset.cron)
                    updateCron(p[0], p[1], p[2], p[3], p[4])
                  }}
                  className={`px-3 py-1 text-xs font-mono border-2 border-black rounded transition-colors ${
                    monitorCron === preset.cron
                      ? "bg-black text-white"
                      : "bg-background hover:bg-secondary/40"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* 5-field visual editor */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "分鐘", val: cronMin, set: (v: string) => updateCron(v, cronHour, cronDom, cronMonth, cronDow), ph: "*" },
                { label: "小時", val: cronHour, set: (v: string) => updateCron(cronMin, v, cronDom, cronMonth, cronDow), ph: "*" },
                { label: "日", val: cronDom, set: (v: string) => updateCron(cronMin, cronHour, v, cronMonth, cronDow), ph: "*" },
                { label: "月", val: cronMonth, set: (v: string) => updateCron(cronMin, cronHour, cronDom, v, cronDow), ph: "*" },
                { label: "星期", val: cronDow, set: (v: string) => updateCron(cronMin, cronHour, cronDom, cronMonth, v), ph: "*" },
              ].map(field => (
                <div key={field.label} className="space-y-1">
                  <span className="text-[10px] font-mono opacity-60">{field.label}</span>
                  <Input
                    type="text"
                    value={field.val}
                    onChange={(e) => field.set(e.target.value)}
                    placeholder={field.ph}
                    className="border-2 border-black text-center text-sm font-mono h-9"
                  />
                </div>
              ))}
            </div>

            {/* Raw expression + human-readable description */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono px-2 py-1 bg-secondary/60 border border-black/20 rounded">
                {monitorCron || "* * * * *"}
              </span>
              {monitorCron && (
                <span className="text-xs text-muted-foreground">
                  {parseCronToHuman(monitorCron)}
                </span>
              )}
            </div>
            <p className="text-xs font-mono opacity-60">自定義排程：直接修改下方五個欄位或選擇預設</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveTwitter} disabled={isSavingTwitter}>
              {isSavingTwitter ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              儲存設定
            </Button>
            <Button variant="neutral" onClick={handleTriggerMonitor} disabled={isTriggering}>
              {isTriggering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RadioTower className="mr-2 h-4 w-4" />}
              手動觸發
            </Button>
          </div>
        </SectionCard>

        {/* ===== 錯誤監控 ===== */}
        <SectionCard title="錯誤監控" icon={<Settings className="h-5 w-5" />}>

          <LockableInput
            label="錯誤閾值 (Threshold)"
            value={threshold}
            onChange={setThreshold}
            placeholder="3"
            type="number"
            min={0}
            hasConfiguredValue={!!threshold}
            configuredDisplay={threshold}
          >
            <p className="text-xs font-mono opacity-60">在時間窗口內累積多少次錯誤後觸發通知</p>
          </LockableInput>

          <LockableInput
            label="時間窗口 (分鐘)"
            value={windowMs}
            onChange={setWindowMs}
            placeholder="5"
            type="number"
            min={0}
            hasConfiguredValue={!!windowMs}
            configuredDisplay={windowMs}
          >
            <p className="text-xs font-mono opacity-60">統計錯誤的時間範圍（分鐘）</p>
          </LockableInput>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveError} disabled={isSavingError}>
              {isSavingError ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              儲存設定
            </Button>
          </div>
        </SectionCard>

        {/* ===== Apify ===== */}
        <SectionCard title="Apify" icon={<Globe className="h-5 w-5" />} defaultOpen={false}>

          <LockableInput
            label="API Token"
            value={apifyToken}
            onChange={setApifyToken}
            placeholder={apifyHasToken ? "••••••••（已設定，留空則保留）" : "輸入 Apify API Token"}
            isSecret={true}
            hasConfiguredValue={apifyHasToken}
            extra={<>{!apifyToken.trim() && apifyHasToken && <EnvBadge />}</>}
          />

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
