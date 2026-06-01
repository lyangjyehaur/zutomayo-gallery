import React from "react"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2, RefreshCw, Save, Send, TestTube2, Webhook, MessageSquare, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adminFetch, getTelegramConfigApiBase } from "@/lib/admin-api"
import { formatApiError } from "@/lib/api-error"

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
  topic_status: Record<string, {
    label: string
    thread_id: number | null
    initialized: boolean
  }>
  all_topics_initialized: boolean
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

export function AdminTelegramConfigPage() {
  const apiBase = React.useMemo(() => getTelegramConfigApiBase(), [])

  const [config, setConfig] = React.useState<TelegramConfig | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isTesting, setIsTesting] = React.useState(false)
  const [isSettingWebhook, setIsSettingWebhook] = React.useState(false)
  const [isLoadingWebhook, setIsLoadingWebhook] = React.useState(false)
  const [isInitializingTopics, setIsInitializingTopics] = React.useState(false)
  const [isReinitializingTopics, setIsReinitializingTopics] = React.useState(false)

  const [botToken, setBotToken] = React.useState("")
  const [chatId, setChatId] = React.useState("")
  const [webhookSecret, setWebhookSecret] = React.useState("")
  const [webhookUrl, setWebhookUrl] = React.useState("")

  const [showBotToken, setShowBotToken] = React.useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = React.useState(false)

  const [webhookInfo, setWebhookInfo] = React.useState<WebhookInfo | null>(null)
  const [webhookError, setWebhookError] = React.useState<string | null>(null)

  const loadConfig = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await adminFetch(apiBase)
      const json = await res.json()
      if (!res.ok) throw json
      setConfig(json.data)
      setChatId(json.data.chat_id || "")
      setWebhookUrl(json.data.webhook_url || "")
    } catch (error: any) {
      toast.error(formatApiError(error, "載入 Telegram 設定失敗"))
    } finally {
      setIsLoading(false)
    }
  }, [apiBase])

  const loadWebhookInfo = React.useCallback(async () => {
    setIsLoadingWebhook(true)
    setWebhookError(null)
    try {
      const res = await adminFetch(`${apiBase}/webhook-info`)
      const json = await res.json()
      if (!res.ok) throw json
      setWebhookInfo(json.data)
    } catch (error: any) {
      setWebhookError(formatApiError(error, "取得 Webhook 資訊失敗"))
      setWebhookInfo(null)
    } finally {
      setIsLoadingWebhook(false)
    }
  }, [apiBase])

  React.useEffect(() => {
    loadConfig()
    loadWebhookInfo()
  }, [loadConfig, loadWebhookInfo])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const body: Record<string, string | undefined> = {}
      if (botToken.trim()) body.bot_token = botToken.trim()
      if (chatId.trim()) body.chat_id = chatId.trim()
      if (webhookSecret.trim()) {
        if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret.trim())) {
          toast.error("Webhook Secret 只能包含英文字母、數字、底線 (_) 和連字號 (-)")
          setIsSaving(false)
          return
        }
        body.webhook_secret = webhookSecret.trim()
      }
      if (webhookUrl.trim()) body.webhook_url = webhookUrl.trim()

      if (Object.keys(body).length === 0) {
        toast.error("請輸入至少一個欄位")
        setIsSaving(false)
        return
      }

      const res = await adminFetch(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw json

      toast.success("Telegram 設定已儲存")
      setBotToken("")
      setWebhookSecret("")
      await loadConfig()
    } catch (error: any) {
      toast.error(formatApiError(error, "儲存 Telegram 設定失敗"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const res = await adminFetch(`${apiBase}/test`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw json
      toast.success(`測試訊息已發送！Message ID: ${json.data.message_id}`)
    } catch (error: any) {
      toast.error(formatApiError(error, "發送測試訊息失敗"))
    } finally {
      setIsTesting(false)
    }
  }

  const handleSetWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error("請輸入 Webhook URL")
      return
    }
    setIsSettingWebhook(true)
    try {
      const res = await adminFetch(`${apiBase}/set-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: webhookUrl.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw json
      toast.success("Webhook 已設定")
      await loadWebhookInfo()
    } catch (error: any) {
      toast.error(formatApiError(error, "設定 Webhook 失敗"))
    } finally {
      setIsSettingWebhook(false)
    }
  }

  const handleInitTopics = async () => {
    setIsInitializingTopics(true)
    try {
      const res = await adminFetch(`${apiBase}/topics/init`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw json

      if (json.success) {
        toast.success("Topics 已初始化完成")
      } else {
        toast.warning(json.message, {
          description: json.hint,
        })
      }
      await loadConfig()
    } catch (error: any) {
      toast.error(formatApiError(error, "初始化 Topics 失敗"))
    } finally {
      setIsInitializingTopics(false)
    }
  }

  const handleReinitTopics = async () => {
    setIsReinitializingTopics(true)
    try {
      const res = await adminFetch(`${apiBase}/topics/reinit`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw json

      if (json.success) {
        toast.success("Topics 已重新建立")
      } else {
        toast.warning(json.message, {
          description: json.hint,
        })
      }
      await loadConfig()
    } catch (error: any) {
      toast.error(formatApiError(error, "重新建立 Topics 失敗"))
    } finally {
      setIsReinitializingTopics(false)
    }
  }

  const envBadge = (field: "bot_token" | "chat_id" | "webhook_secret") => {
    if (!config?.from_env?.[field]) return null
    return (
      <span className="inline-block ml-2 px-2 py-0.5 text-[10px] font-mono border-2 border-black bg-yellow-200 text-black rounded">
        from .env
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-secondary-background">
        <div className="h-20 bg-background border-b-4 border-black flex items-center px-6 shadow-neo">
          <h1 className="text-xl font-heading font-bold">Telegram 機器人設定</h1>
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
        <h1 className="text-xl font-heading font-bold">Telegram 機器人設定</h1>
          <Button
          variant="neutral"
          size="sm"
          onClick={() => { loadConfig(); loadWebhookInfo() }}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          重新整理
        </Button>
      </div>

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Config Form */}
        <div className="border-4 border-black rounded-lg bg-background shadow-neo p-6 space-y-4">
          <h2 className="text-lg font-heading font-bold flex items-center gap-2">
            <Send className="h-5 w-5" />
            機器人設定
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-mono font-medium flex items-center">
              Bot Token
              {envBadge("bot_token")}
            </label>
            <div className="relative">
              <Input
                type={showBotToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={config?.has_bot_token ? "••••••••（已設定，留空則保留）" : "輸入 Bot Token"}
                className="border-2 border-black pr-10"
              />
              <button
                type="button"
                onClick={() => setShowBotToken(!showBotToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
              >
                {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {config?.bot_token && (
              <p className="text-xs font-mono opacity-60">目前: {config.bot_token}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-mono font-medium flex items-center">
              Chat ID
              {envBadge("chat_id")}
            </label>
            <Input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder={config?.has_chat_id ? "已設定，留空則保留" : "輸入 Chat ID"}
              className="border-2 border-black"
            />
            {config?.chat_id && (
              <p className="text-xs font-mono opacity-60">目前: {config.chat_id}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-mono font-medium flex items-center">
              Webhook Secret
              {envBadge("webhook_secret")}
            </label>
            <div className="relative">
              <Input
                type={showWebhookSecret ? "text" : "password"}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={config?.has_webhook_secret ? "••••••••（已設定，留空則保留）" : "輸入 Webhook Secret"}
                className="border-2 border-black pr-10"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
              >
                {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {config?.webhook_secret && (
              <p className="text-xs font-mono opacity-60">目前: {config.webhook_secret}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              儲存設定
            </Button>
            <Button variant="neutral" onClick={handleTest} disabled={isTesting || !config?.has_bot_token || !config?.has_chat_id}>
              {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
              發送測試訊息
            </Button>
          </div>
        </div>

        {/* Topics Section */}
        <div className="border-4 border-black rounded-lg bg-background shadow-neo p-6 space-y-4">
          <h2 className="text-lg font-heading font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Topics 分類設定
          </h2>

          <p className="text-sm font-mono opacity-70">
            啟用 Topics 功能後，不同類型的通知會自動分類到對應的 topic 中。
          </p>

          {/* Topic Status */}
          {config?.topic_status && (
            <div className="space-y-2">
              {Object.entries(config.topic_status).map(([key, topic]) => (
                <div key={key} className="flex items-center justify-between p-3 border-2 border-black rounded-lg">
                  <div>
                    <span className="font-mono font-medium">{topic.label}</span>
                    <span className="text-xs font-mono opacity-60 ml-2">({key})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {topic.initialized ? (
                      <span className="px-2 py-0.5 text-xs font-mono border-2 border-green-500 bg-green-100 text-green-700 rounded">
                        ID: {topic.thread_id}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-mono border-2 border-yellow-500 bg-yellow-100 text-yellow-700 rounded">
                        未初始化
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warning if not all topics initialized */}
          {config?.all_topics_initialized === false && (
            <div className="flex items-start gap-2 p-3 border-2 border-yellow-500 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">部分 Topics 尚未初始化</p>
                <p className="text-yellow-700 mt-1">
                  請先在 Telegram 私聊中開啟 Topics 功能：打開與 bot 的私聊 → 點擊 bot 名字 → 開啟 Topics
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="neutral"
              onClick={handleInitTopics}
              disabled={isInitializingTopics || !config?.has_bot_token || !config?.has_chat_id}
            >
              {isInitializingTopics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
              初始化 Topics
            </Button>
            <Button
              variant="neutral"
              onClick={handleReinitTopics}
              disabled={isReinitializingTopics || !config?.has_bot_token || !config?.has_chat_id}
            >
              {isReinitializingTopics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              重新建立 Topics
            </Button>
          </div>

          {/* Help text */}
          <div className="text-xs font-mono opacity-60 space-y-1">
            <p>• 「初始化 Topics」：只建立尚未存在的 topic</p>
            <p>• 「重新建立 Topics」：刪除舊的並重新建立所有 topic（thread ID 會變更）</p>
            <p>• 建立後的通知會自動發送到對應的 topic</p>
          </div>
        </div>

        {/* Webhook Section */}
        <div className="border-4 border-black rounded-lg bg-background shadow-neo p-6 space-y-4">
          <h2 className="text-lg font-heading font-bold flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook 設定
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-mono font-medium">Webhook URL</label>
            <Input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-domain.com/api/telegram/webhook"
              className="border-2 border-black"
            />
          </div>

          <Button
            variant="neutral"
            onClick={handleSetWebhook}
            disabled={isSettingWebhook || !webhookUrl.trim()}
          >
            {isSettingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Webhook className="mr-2 h-4 w-4" />}
            設定 Webhook
          </Button>
        </div>

        {/* Webhook Status */}
        <div className="border-4 border-black rounded-lg bg-background shadow-neo p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-bold">Webhook 狀態</h2>
            <Button variant="noShadow" size="sm" onClick={loadWebhookInfo} disabled={isLoadingWebhook}>
              <RefreshCw className={`h-4 w-4 ${isLoadingWebhook ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {webhookError && (
            <div className="border-2 border-red-500 bg-red-50 text-red-800 rounded p-3 text-sm font-mono">
              {webhookError}
            </div>
          )}

          {webhookInfo ? (
            <div className="space-y-2 font-mono text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">URL:</span>
                <span className={webhookInfo.url ? "text-green-700" : "text-gray-500"}>
                  {webhookInfo.url || "未設定"}
                </span>
              </div>
              {webhookInfo.ip_address && (
                <div>
                  <span className="font-medium">IP:</span> {webhookInfo.ip_address}
                </div>
              )}
              <div>
                <span className="font-medium">待處理更新:</span>{" "}
                <span className={webhookInfo.pending_update_count > 0 ? "text-yellow-600" : ""}>
                  {webhookInfo.pending_update_count}
                </span>
              </div>
              {webhookInfo.max_connections && (
                <div>
                  <span className="font-medium">最大連線數:</span> {webhookInfo.max_connections}
                </div>
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
      </div>
    </div>
  )
}
