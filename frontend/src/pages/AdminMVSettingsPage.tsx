import React from "react"
import { useCan } from "@refinedev/core"
import { toast } from "sonner"
import { formatApiError } from "@/lib/api-error"

import { adminFetch } from "@/lib/admin-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getSystemApiBase } from "@/lib/admin-api"

type SystemStatus = {
  maintenance: boolean
  type?: "data" | "ui"
  eta?: string | null
}

type MetadataShape = {
  albumMeta: Record<string, { date?: string; hideDate?: boolean }>
  artistMeta: Record<string, { id?: string; hideId?: boolean }>
  settings: { showAutoAlbumDate: boolean }
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
  settings: { showAutoAlbumDate: false },
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
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isClearingRedisCache, setIsClearingRedisCache] = React.useState(false)

  const [localMetadata, setLocalMetadata] = React.useState<MetadataShape>(defaultMetadata)
  const [localMaintenance, setLocalMaintenance] = React.useState(false)
  const [localMaintenanceType, setLocalMaintenanceType] = React.useState<"data" | "ui">("ui")
  const [localMaintenanceEta, setLocalMaintenanceEta] = React.useState<string>("")
  const maintenanceAccess = useCan({ resource: "systemMaintenance", action: "access" })
  const cacheAccess = useCan({ resource: "systemCache", action: "access" })
  const canUpdateMaintenance = !!maintenanceAccess.data?.can
  const canClearCache = !!cacheAccess.data?.can

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

  const apiUrl = React.useMemo(() => getSystemApiBase(), [])

  const handleClearRedisCache = React.useCallback(async () => {
    setIsClearingRedisCache(true)
    setError(null)
    try {
      const res = await adminFetch(`${apiUrl}/cache/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error || "清除快取失敗")
      const cleared = data?.data?.cleared
      toast.success(typeof cleared === "number" ? `已清除 Redis 快取 ${cleared} 筆` : "已清除 Redis 快取")
    } catch (e: any) {
      const msg = formatApiError(e, '清除快取失敗');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsClearingRedisCache(false)
    }
  }, [apiUrl])

  const handleSave = React.useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      const payload: any = JSON.parse(JSON.stringify(localMetadata))
      if (payload?.settings) delete payload.settings.announcements
      const response = await adminFetch(`${apiUrl}/metadata`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("保存 Metadata 失敗")

      const etaISO = localMaintenanceEta ? new Date(localMaintenanceEta).toISOString() : ""
      const maintenanceChanged =
        localMaintenance !== (systemStatus?.maintenance || false) ||
        localMaintenanceType !== (systemStatus?.type || "ui") ||
        etaISO !== (systemStatus?.eta || "")
      if (canUpdateMaintenance && maintenanceChanged) {
        const sysResponse = await adminFetch(`${apiUrl}/maintenance`, {
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
      const msg = formatApiError(e, '保存設定失敗');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false)
    }
  }, [apiUrl, canUpdateMaintenance, localMaintenance, localMaintenanceEta, localMaintenanceType, localMetadata, onRefresh, systemStatus?.eta, systemStatus?.maintenance, systemStatus?.type])

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
              <Switch checked={localMaintenance} disabled={!canUpdateMaintenance} onCheckedChange={(checked) => setLocalMaintenance(checked)} />
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
                        disabled={!canUpdateMaintenance}
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
                        disabled={!canUpdateMaintenance}
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
                    disabled={!canUpdateMaintenance}
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
              disabled={isClearingRedisCache || !canClearCache}
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
    </div>
  )
}
