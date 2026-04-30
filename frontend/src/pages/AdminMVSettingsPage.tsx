import React from "react"
import { startRegistration } from "@simplewebauthn/browser"
import { toast } from "sonner"

import { adminFetch } from "@/lib/admin-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useConfirmDialog } from "@/components/admin/useConfirmDialog"

type SystemStatus = {
  maintenance: boolean
  type?: "data" | "ui"
  eta?: string | null
}

type MetadataShape = {
  albumMeta: Record<string, { date?: string; hideDate?: boolean }>
  artistMeta: Record<string, { id?: string; hideId?: boolean }>
  settings: { showAutoAlbumDate: boolean; announcements?: string[] | Record<string, string[]> }
}

const toDatetimeLocal = (value: string | null | undefined) => {
  const raw = typeof value === "string" ? value : ""
  if (!raw) return ""
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const defaultMetadata: MetadataShape = {
  albumMeta: {},
  artistMeta: {},
  settings: { showAutoAlbumDate: false, announcements: [] },
}

export function AdminMVSettingsPage({
  metadata,
  systemStatus,
  onRefresh,
}: {
  metadata: any
  systemStatus?: SystemStatus
  onRefresh?: () => void
}) {
  const [confirm, ConfirmDialog] = useConfirmDialog()
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isClearingRedisCache, setIsClearingRedisCache] = React.useState(false)
  const [announcementLang, setAnnouncementLang] = React.useState<string>("zh-TW")
  const [passkeys, setPasskeys] = React.useState<{ id: string; name?: string; createdAt: string }[]>([])
  const [isLoadingPasskeys, setIsLoadingPasskeys] = React.useState(false)

  const [localMetadata, setLocalMetadata] = React.useState<MetadataShape>(defaultMetadata)
  const [localMaintenance, setLocalMaintenance] = React.useState(false)
  const [localMaintenanceType, setLocalMaintenanceType] = React.useState<"data" | "ui">("ui")
  const [localMaintenanceEta, setLocalMaintenanceEta] = React.useState<string>("")

  React.useEffect(() => {
    try {
      setLocalMetadata(JSON.parse(JSON.stringify(metadata || defaultMetadata)))
    } catch {
      setLocalMetadata(defaultMetadata)
    }
  }, [metadata])

  React.useEffect(() => {
    setLocalMaintenance(systemStatus?.maintenance || false)
    setLocalMaintenanceType(systemStatus?.type || "ui")
    setLocalMaintenanceEta(toDatetimeLocal(systemStatus?.eta || ""))
  }, [systemStatus?.eta, systemStatus?.maintenance, systemStatus?.type])

  const apiUrl = React.useMemo(() => import.meta.env.VITE_API_URL || "/api/mvs", [])
  const authApiUrl = React.useMemo(() => apiUrl.replace(/\/mvs$/, "/auth"), [apiUrl])

  const loadPasskeys = React.useCallback(async () => {
    setIsLoadingPasskeys(true)
    try {
      const r = await adminFetch(`${authApiUrl}/passkeys`)
      const data = await r.json().catch(() => null)
      if (Array.isArray(data)) setPasskeys(data)
    } finally {
      setIsLoadingPasskeys(false)
    }
  }, [authApiUrl])

  React.useEffect(() => {
    loadPasskeys()
  }, [loadPasskeys])

  const handleRegisterPasskey = React.useCallback(async () => {
    try {
      const name = window.prompt("請為此設備的 Passkey 命名 (例如: My MacBook):")
      if (!name) return

      const headers = { "Content-Type": "application/json" }
      const resp = await adminFetch(`${authApiUrl}/generate-reg-options`, { headers })
      const options = await resp.json()
      if ((options as any)?.error) throw new Error((options as any).error)

      const attResp = await startRegistration({ optionsJSON: options })
      const verifyResp = await adminFetch(`${authApiUrl}/verify-reg`, {
        method: "POST",
        headers,
        body: JSON.stringify({ data: attResp, name }),
      })
      const verifyResult = await verifyResp.json()
      if (verifyResult?.success) {
        toast.success("Passkey 註冊成功！")
        await loadPasskeys()
      } else {
        setError("Passkey 註冊失敗。")
      }
    } catch (e: any) {
      setError(`Passkey 註冊錯誤：${String(e?.message || e)}`)
    }
  }, [authApiUrl, loadPasskeys])

  const handleRemovePasskey = React.useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: "刪除 Passkey",
        description: "確定要刪除這個 Passkey 嗎？",
        confirmText: "刪除",
        cancelText: "取消",
      })
      if (!ok) return
      try {
        await adminFetch(`${authApiUrl}/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" })
        setPasskeys((prev) => prev.filter((p) => p.id !== id))
        toast.success("Passkey 已刪除")
      } catch {
        setError("刪除 Passkey 失敗。")
      }
    },
    [authApiUrl, confirm],
  )

  const handleClearRedisCache = React.useCallback(async () => {
    setIsClearingRedisCache(true)
    setError(null)
    try {
      const res = await adminFetch(`${apiUrl.replace("/mvs", "/system")}/cache/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error || "清除快取失敗")
      const cleared = data?.data?.cleared
      toast.success(typeof cleared === "number" ? `已清除 Redis 快取 ${cleared} 筆` : "已清除 Redis 快取")
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setIsClearingRedisCache(false)
    }
  }, [apiUrl])

  const handleSave = React.useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      const response = await adminFetch(`${apiUrl}/metadata`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(localMetadata),
      })
      if (!response.ok) throw new Error("保存 Metadata 失敗")

      const etaISO = localMaintenanceEta ? new Date(localMaintenanceEta).toISOString() : ""
      if (
        localMaintenance !== (systemStatus?.maintenance || false) ||
        localMaintenanceType !== (systemStatus?.type || "ui") ||
        etaISO !== (systemStatus?.eta || "")
      ) {
        const sysResponse = await adminFetch(`${apiUrl.replace("/mvs", "/system")}/maintenance`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ maintenance: localMaintenance, type: localMaintenanceType, eta: etaISO }),
        })
        if (!sysResponse.ok) throw new Error("保存系統狀態失敗")
      }

      toast.success("全局設定已保存")
      onRefresh?.()
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setIsSaving(false)
    }
  }, [apiUrl, localMaintenance, localMaintenanceEta, localMaintenanceType, localMetadata, onRefresh, systemStatus?.eta, systemStatus?.maintenance, systemStatus?.type])

  return (
    <div className="p-6">
      <div className="bg-black text-white border-4 border-black shadow-neo">
        <div className="p-6 border-b-4 border-black">
          <div className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            <i className="hn hn-disc text-xl" /> 全局設定 (Metadata)
          </div>
          <div className="text-white/70 font-mono text-xs">
            手動維護專輯的發布年份與畫師 ID 等全局變數。這會影響首頁篩選器的顯示。
          </div>
        </div>
        <div className="p-6 bg-background space-y-6 font-mono">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>操作失敗</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-3 border-2 border-black p-3 bg-yellow-500/20">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="text-xs font-black tracking-widest text-yellow-600">系統維護模式</div>
                <div className="text-[10px] font-bold opacity-40 font-mono normal-case">Maintenance Mode</div>
                <div className="text-[10px] font-bold opacity-60">開啟後所有訪客將看到維護頁面</div>
              </div>
              <Switch checked={localMaintenance} onCheckedChange={(checked) => setLocalMaintenance(checked)} />
            </div>
            {localMaintenance ? (
              <div className="flex flex-col gap-3 pt-3 border-t-2 border-yellow-500/30">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col">
                    <div className="text-xs font-black tracking-widest text-yellow-600">維護類型</div>
                    <div className="text-[10px] font-bold opacity-40 font-mono normal-case">Maintenance Type</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="maintenanceType"
                        value="ui"
                        checked={localMaintenanceType === "ui"}
                        onChange={() => setLocalMaintenanceType("ui")}
                        className="accent-yellow-500"
                      />
                      <span className="text-xs font-bold text-yellow-600">介面升級 (UI Upgrade)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="maintenanceType"
                        value="data"
                        checked={localMaintenanceType === "data"}
                        onChange={() => setLocalMaintenanceType("data")}
                        className="accent-yellow-500"
                      />
                      <span className="text-xs font-bold text-yellow-600">數據維護 (Data Maintenance)</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex flex-col">
                    <div className="text-xs font-black tracking-widest text-yellow-600">預估恢復時間 (選填)</div>
                    <div className="text-[10px] font-bold opacity-40 font-mono normal-case">
                      Estimated Time to Recovery
                    </div>
                  </div>
                  <Input
                    type="datetime-local"
                    value={localMaintenanceEta}
                    onChange={(e) => setLocalMaintenanceEta(e.target.value)}
                    className="font-mono text-sm bg-background border-2 border-black focus-visible:ring-black h-8"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-2 border-black p-3 bg-card">
            <div className="flex flex-col">
              <div className="text-xs font-black tracking-widest">清除 Redis API 快取</div>
              <div className="text-[10px] font-bold opacity-40 font-mono normal-case">Clear Redis Cache</div>
              <div className="text-[10px] font-bold opacity-60">維護期資料頻繁變動時可手動刷新所有 GET API 快取</div>
            </div>
            <Button
              onClick={() => void handleClearRedisCache()}
              disabled={isClearingRedisCache}
              className="border-2 border-black bg-main text-black hover:bg-main/80 font-black shadow-neo-sm"
            >
              {isClearingRedisCache ? "清除中..." : "清除快取"}
            </Button>
          </div>

          <div className="flex items-center justify-between border-2 border-black p-3 bg-card">
            <div className="flex flex-col">
              <div className="text-xs font-black tracking-widest">自動推算專輯日期</div>
              <div className="text-[10px] font-bold opacity-40 font-mono normal-case">Auto Album Date</div>
              <div className="text-[10px] font-bold opacity-60">未設定專輯發布日期時，是否顯示自動推算值</div>
            </div>
            <Switch
              checked={!!localMetadata.settings?.showAutoAlbumDate}
              onCheckedChange={(checked) => {
                setLocalMetadata((prev) => ({
                  ...prev,
                  settings: { ...(prev.settings || { showAutoAlbumDate: false }), showAutoAlbumDate: checked },
                }))
              }}
            />
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-black uppercase bg-main text-main-foreground px-2 py-1">00 公告</h3>
                  <span className="text-[10px] font-bold opacity-50 font-mono normal-case ml-2">00_Announcements</span>
                </div>
                <span className="text-[10px] font-bold opacity-50">首頁跑馬燈公告維護 (多語言支援)</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-2 border-black p-4 bg-card">
              <div className="flex gap-2 border-b-2 border-black/10 pb-2 mb-2 overflow-x-auto">
                {["zh-TW", "zh-CN", "zh-HK", "ja", "ko", "en", "es"].map((lang) => (
                  <button
                    key={lang}
                    className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${announcementLang === lang ? "border-black bg-main text-black" : "border-transparent opacity-50 hover:opacity-100"}`}
                    onClick={() => setAnnouncementLang(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <div className="text-xs font-bold opacity-60">
                請輸入跑馬燈公告內容 ({announcementLang})，每行一則公告。若為空則不顯示跑馬燈。
              </div>
              <Textarea
                value={(() => {
                  const ann = localMetadata.settings?.announcements
                  if (!ann) return ""
                  if (Array.isArray(ann)) {
                    return announcementLang === "zh-TW" ? ann.join("\n") : ""
                  }
                  return (ann[announcementLang] || []).join("\n")
                })()}
                onChange={(e) => {
                  const lines = e.target.value.split("\n")
                  setLocalMetadata((prev) => {
                    let currentAnn: any = prev.settings?.announcements || {}
                    if (Array.isArray(currentAnn)) {
                      currentAnn = { "zh-TW": currentAnn }
                    }
                    return {
                      ...prev,
                      settings: {
                        ...(prev.settings || { showAutoAlbumDate: false }),
                        announcements: {
                          ...currentAnn,
                          [announcementLang]: lines,
                        },
                      },
                    }
                  })
                }}
                placeholder={`例如：\n【最新】ZUTOMAYO 新專輯發布！\n網站功能更新公告...`}
                className="w-full min-h-[120px] text-sm font-bold border-2 border-black/20 bg-black/5"
              />
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t-2 border-black">
            <div className="flex items-start justify-between border-b-2 border-black pb-2">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-black uppercase bg-main text-main-foreground px-2 py-1">03 Passkeys</h3>
                  <span className="text-[10px] font-bold opacity-50 font-mono normal-case ml-2">03_Passkeys</span>
                </div>
                <span className="text-[10px] font-bold opacity-50">生物辨識 / 設備登入管理</span>
              </div>
              <Button
                variant="neutral"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold bg-ztmy-green border-2 border-black text-black hover:bg-ztmy-green/80"
                onClick={() => void handleRegisterPasskey()}
              >
                <i className="hn hn-plus text-base mr-2" /> 註冊新設備 (Passkey)
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoadingPasskeys ? (
                <div className="col-span-full p-4 border-2 border-dashed border-black/30 text-center opacity-50 text-xs">
                  Loading...
                </div>
              ) : passkeys.length === 0 ? (
                <div className="col-span-full p-4 border-2 border-dashed border-black/30 text-center opacity-50 text-xs">
                  目前沒有註冊任何 Passkey
                </div>
              ) : (
                passkeys.map((pk) => (
                  <div key={pk.id} className="flex flex-col gap-1 border-2 border-black p-3 bg-card relative">
                    <div className="font-bold text-sm flex items-center gap-2">
                      <i className="hn hn-user text-base mr-2" /> {pk.name || "未命名設備 (Unnamed Device)"}
                    </div>
                    <div className="text-[10px] opacity-60 font-mono">ID: {pk.id.slice(0, 16)}...</div>
                    <div className="text-[10px] opacity-60 font-mono">
                      建立於: {new Date(pk.createdAt).toLocaleString()}
                    </div>
                    <Button
                      variant="neutral"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:bg-red-500 hover:text-white"
                      onClick={() => void handleRemovePasskey(pk.id)}
                    >
                      <i className="hn hn-trash text-base" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="pt-4 border-t-2 border-black flex flex-col sm:flex-row gap-4 sm:justify-end">
            <Button
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="flex-1 sm:flex-none bg-black text-white hover:bg-ztmy-green hover:text-black font-bold border-2 border-transparent shadow-neo"
            >
              {isSaving ? <i className="hn hn-refresh text-base animate-spin mr-2" /> : <i className="hn hn-save text-base mr-2" />}
              保存全局設定
            </Button>
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}

