import React from "react"
import { toast } from "sonner"
import { Edit2, Plus, RefreshCw, Save, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { adminFetch, getMonitorTargetsApiBase } from "@/lib/admin-api"
import { formatApiError } from "@/lib/api-error"
import { useConfirmDialog } from "@/components/admin/useConfirmDialog"

type MonitorTargetType = "user" | "hashtag"

type MonitorTarget = {
  id: string
  type: MonitorTargetType
  handle: string
  label?: string | null
  enabled: boolean
  note?: string | null
  content_type?: string
  created_at?: string
  updated_at?: string
}

type ArtistSource = {
  id: string
  name?: string | null
  handle: string
  twitter_monitor_enabled?: boolean
}

type SourcesResponse = {
  artistUsers: ArtistSource[]
  manualUsers: MonitorTarget[]
  hashtags: MonitorTarget[]
}

const emptyForm = { handle: "", label: "", note: "", content_type: "fanart" }

const displayHandle = (type: MonitorTargetType, handle: string) => {
  return type === "hashtag" ? `#${handle}` : `@${handle}`
}

export function AdminMonitorTargetsPage() {
  const [confirm, ConfirmDialog] = useConfirmDialog()
  const [activeTab, setActiveTab] = React.useState<MonitorTargetType>("user")
  const [sources, setSources] = React.useState<SourcesResponse>({ artistUsers: [], manualUsers: [], hashtags: [] })
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [form, setForm] = React.useState(emptyForm)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState(emptyForm)

  const apiBase = React.useMemo(() => getMonitorTargetsApiBase(), [])

  const loadSources = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await adminFetch(`${apiBase}/sources`)
      const json = await res.json()
      if (!res.ok || !json.success) throw json
      setSources({
        artistUsers: Array.isArray(json.data?.artistUsers) ? json.data.artistUsers : [],
        manualUsers: Array.isArray(json.data?.manualUsers) ? json.data.manualUsers : [],
        hashtags: Array.isArray(json.data?.hashtags) ? json.data.hashtags : [],
      })
    } catch (error: any) {
      toast.error(formatApiError(error, "載入監聽目標失敗"))
    } finally {
      setIsLoading(false)
    }
  }, [apiBase])

  React.useEffect(() => {
    loadSources()
  }, [loadSources])

  const targets = activeTab === "user" ? sources.manualUsers : sources.hashtags
  const placeholder = activeTab === "user" ? "@zutomayo_art" : "#ずとまよファンアート"

  const resetEditing = () => {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  const createTarget = async () => {
    if (!form.handle.trim()) {
      toast.error("請輸入監聽目標")
      return
    }
    setIsSaving(true)
    try {
      const res = await adminFetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTab, ...form }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw json
      toast.success("已新增監聽目標")
      setForm(emptyForm)
      await loadSources()
    } catch (error: any) {
      toast.error(formatApiError(error, "新增監聽目標失敗"))
    } finally {
      setIsSaving(false)
    }
  }

  const updateTarget = async (id: string) => {
    if (!editForm.handle.trim()) {
      toast.error("請輸入監聽目標")
      return
    }
    setIsSaving(true)
    try {
      const res = await adminFetch(`${apiBase}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw json
      toast.success("已更新監聽目標")
      resetEditing()
      await loadSources()
    } catch (error: any) {
      toast.error(formatApiError(error, "更新監聽目標失敗"))
    } finally {
      setIsSaving(false)
    }
  }

  const toggleTarget = async (target: MonitorTarget) => {
    try {
      const res = await adminFetch(`${apiBase}/${encodeURIComponent(target.id)}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !target.enabled }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw json
      await loadSources()
    } catch (error: any) {
      toast.error(formatApiError(error, "切換監聽狀態失敗"))
    }
  }

  const toggleArtist = async (artist: ArtistSource) => {
    try {
      const res = await adminFetch(`${apiBase}/artist/${encodeURIComponent(artist.id)}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !(artist.twitter_monitor_enabled !== false) }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw json
      await loadSources()
    } catch (error: any) {
      toast.error(formatApiError(error, "切換畫師監聽狀態失敗"))
    }
  }

  const deleteTarget = async (target: MonitorTarget) => {
    const ok = await confirm({
      title: "刪除監聽目標",
      description: `確定要刪除 ${displayHandle(target.type, target.handle)} 嗎？`,
      confirmText: "刪除",
      cancelText: "取消",
    })
    if (!ok) return

    try {
      const res = await adminFetch(`${apiBase}/${encodeURIComponent(target.id)}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok || !json.success) throw json
      toast.success("已刪除監聽目標")
      await loadSources()
    } catch (error: any) {
      toast.error(formatApiError(error, "刪除監聽目標失敗"))
    }
  }

  const startEdit = (target: MonitorTarget) => {
    setEditingId(target.id)
    setEditForm({
      handle: target.handle || "",
      label: target.label || "",
      note: target.note || "",
      content_type: target.content_type || "fanart",
    })
  }

  return (
    <div className="flex-1 overflow-y-auto bg-secondary-background">
      <div className="h-20 bg-background border-b-4 border-black flex items-center justify-between px-6 shadow-neo">
        <div>
          <h1 className="text-xl font-black tracking-widest">監聽目標管理</h1>
          <p className="text-xs font-mono opacity-70 mt-1">管理 X/Twitter RSSHub 用戶與 Hashtag 來源</p>
        </div>
        <Button
          variant="outline"
          className="border-2 border-black shadow-neo-sm font-bold"
          onClick={loadSources}
          disabled={isLoading}
        >
          <RefreshCw className={`size-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          重新整理
        </Button>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button
            className={`border-2 border-black shadow-neo-sm font-black ${activeTab === "user" ? "bg-main text-main-foreground" : "bg-white text-black"}`}
            onClick={() => {
              setActiveTab("user")
              resetEditing()
            }}
          >
            用戶監聽
          </Button>
          <Button
            className={`border-2 border-black shadow-neo-sm font-black ${activeTab === "hashtag" ? "bg-main text-main-foreground" : "bg-white text-black"}`}
            onClick={() => {
              setActiveTab("hashtag")
              resetEditing()
            }}
          >
            Hashtag 監聽
          </Button>
        </div>

        {activeTab === "user" ? (
          <section className="bg-card border-4 border-black shadow-neo p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-black tracking-wider">畫師 Twitter 來源</h2>
              <span className="text-xs font-mono border-2 border-black bg-white px-2 py-1">
                {sources.artistUsers.length} 個 read-only 來源
              </span>
            </div>
            {sources.artistUsers.length === 0 ? (
              <div className="border-2 border-dashed border-black/30 p-4 text-sm font-bold opacity-60">目前沒有畫師 Twitter 資料</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {sources.artistUsers.map((artist) => {
                  const isEnabled = artist.twitter_monitor_enabled !== false
                  return (
                    <div key={`${artist.id}-${artist.handle}`} className={`border-2 border-black p-3 min-w-0 flex items-center justify-between gap-2 ${isEnabled ? 'bg-secondary-background' : 'bg-gray-100 opacity-60'}`}>
                      <div className="min-w-0">
                        <div className="font-black truncate">{artist.name || artist.handle}</div>
                        <div className="text-xs font-mono opacity-70 truncate">@{artist.handle}</div>
                      </div>
                      <Button
                        variant="outline"
                        className={`border-2 border-black font-bold shrink-0 ${isEnabled ? 'bg-ztmy-green/60' : 'bg-red-100'}`}
                        onClick={() => toggleArtist(artist)}
                      >
                        {isEnabled ? '啟用' : '停用'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        ) : null}

        <section className="bg-card border-4 border-black shadow-neo p-4">
          <h2 className="font-black tracking-wider mb-4">
            {activeTab === "user" ? "手動用戶監聽" : "手動 Hashtag 監聽"}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(120px,auto)_minmax(220px,2fr)_auto] gap-2 items-start mb-4">
            <Input
              value={form.handle}
              onChange={(e) => setForm((prev) => ({ ...prev, handle: e.target.value }))}
              className="border-2 border-black font-bold"
              placeholder={placeholder}
            />
            <Input
              value={form.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              className="border-2 border-black font-bold"
              placeholder="顯示名稱"
            />
            <select
              value={form.content_type}
              onChange={(e) => setForm((prev) => ({ ...prev, content_type: e.target.value }))}
              className="border-2 border-black font-bold h-10 px-3 bg-white"
            >
              <option value="fanart">Fanart</option>
              <option value="official">官方</option>
            </select>
            <Input
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              className="border-2 border-black font-bold"
              placeholder="備註"
            />
            <Button
              className="border-2 border-black bg-ztmy-green text-black shadow-neo-sm font-black"
              onClick={createTarget}
              disabled={isSaving}
            >
              <Plus className="size-4 mr-2" />
              新增
            </Button>
          </div>

          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <RefreshCw className="size-8 animate-spin opacity-50" />
            </div>
          ) : targets.length === 0 ? (
            <div className="border-2 border-dashed border-black/30 p-8 text-center font-bold opacity-60">尚未建立手動監聽目標</div>
          ) : (
            <div className="space-y-2">
              {targets.map((target) => {
                const isEditing = editingId === target.id
                return (
                  <div key={target.id} className="border-2 border-black bg-secondary-background p-3">
                    {isEditing ? (
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(100px,auto)_minmax(220px,2fr)_auto] gap-2 items-start">
                        <Input
                          value={editForm.handle}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, handle: e.target.value }))}
                          className="border-2 border-black font-bold bg-white"
                        />
                        <Input
                          value={editForm.label}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, label: e.target.value }))}
                          className="border-2 border-black font-bold bg-white"
                          placeholder="顯示名稱"
                        />
                        <select
                          value={editForm.content_type}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, content_type: e.target.value }))}
                          className="border-2 border-black font-bold h-10 px-3 bg-white"
                        >
                          <option value="fanart">Fanart</option>
                          <option value="official">官方</option>
                        </select>
                        <Textarea
                          value={editForm.note}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                          className="border-2 border-black font-bold bg-white min-h-10"
                          placeholder="備註"
                        />
                        <div className="flex gap-2">
                          <Button className="border-2 border-black bg-ztmy-green text-black font-black" onClick={() => updateTarget(target.id)} disabled={isSaving}>
                            <Save className="size-4" />
                          </Button>
                          <Button variant="outline" className="border-2 border-black bg-white font-black" onClick={resetEditing}>
                            <X className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black break-all">{displayHandle(target.type, target.handle)}</span>
                            {target.label ? <span className="text-xs font-mono border-2 border-black bg-white px-2 py-0.5">{target.label}</span> : null}
                            <span className={`text-xs font-mono border-2 border-black px-2 py-0.5 ${target.content_type === 'official' ? 'bg-blue-100' : 'bg-orange-100'}`}>
                              {target.content_type === 'official' ? '官方' : 'Fanart'}
                            </span>
                            <span className={`text-xs font-mono border-2 border-black px-2 py-0.5 ${target.enabled ? "bg-ztmy-green/60" : "bg-red-100"}`}>
                              {target.enabled ? "啟用" : "停用"}
                            </span>
                          </div>
                          {target.note ? <div className="text-sm opacity-70 mt-1 whitespace-pre-wrap">{target.note}</div> : null}
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <Button variant="outline" className="border-2 border-black bg-white font-black" onClick={() => toggleTarget(target)}>
                            {target.enabled ? "停用" : "啟用"}
                          </Button>
                          <Button variant="outline" className="border-2 border-black bg-white font-black" onClick={() => startEdit(target)}>
                            <Edit2 className="size-4" />
                          </Button>
                          <Button className="border-2 border-black bg-red-500 text-white font-black" onClick={() => deleteTarget(target)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog />
    </div>
  )
}
