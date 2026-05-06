import React from "react"
import { toast } from "sonner"
import { formatApiError } from "@/lib/api-error"
import { Link, useSearchParams } from "react-router-dom"

import { adminFetch, getApiRoot } from "@/lib/admin-api"
import { buildMvTagOptions, normalizeTagId } from "@/lib/admin-media"
import { getProxyImgUrl, isMediaVideo } from "@/lib/image"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MultiSelect, Option } from "@/components/ui/multi-select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ReparsePreviewDialog } from "@/components/admin/ReparsePreviewDialog"

type MediaGroupRow = {
  id: string
  source_url?: string
  source_text?: string
  author_name?: string
  author_handle?: string
  post_date?: string
  status?: string
  media_count?: number
  mv_count?: number
}

type MediaItem = {
  id: string
  type?: string
  media_type?: string
  url?: string
  original_url?: string
  width?: number
  height?: number
  caption?: string
  tags?: string[]
  mvs?: Array<{ id: string; title?: string; MVMedia?: { usage?: string; order_index?: number } }>
}

type GroupDetail = MediaGroupRow & { images?: MediaItem[] }

const toDatetimeLocal = (value?: string) => {
  const raw = typeof value === "string" ? value : ""
  if (!raw) return ""
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const fromDatetimeLocal = (value: string) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString()
}

export function AdminMediaGroupsPage() {
  const base = React.useMemo(() => getApiRoot(), [])
  const [searchParams, setSearchParams] = useSearchParams()

  const statusOptions = React.useMemo(
    () => ["", "organized", "unorganized", "pending", "deleted", "rejected"],
    [],
  )

  const [error, setError] = React.useState<string | null>(null)
  const [listLoading, setListLoading] = React.useState(false)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [savingGroup, setSavingGroup] = React.useState(false)
  const [savingMediaId, setSavingMediaId] = React.useState<string | null>(null)

  const [q, setQ] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [offset, setOffset] = React.useState(0)
  const limit = 50

  const [items, setItems] = React.useState<MediaGroupRow[]>([])
  const [total, setTotal] = React.useState(0)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<GroupDetail | null>(null)

  const groupMvs = React.useMemo(() => {
    const images = detail?.images || []
    const map = new Map<string, { id: string; title?: string }>()
    images.forEach((m) => {
      const list = Array.isArray(m.mvs) ? m.mvs : []
      list.forEach((mv) => {
        if (!mv?.id) return
        if (!map.has(mv.id)) map.set(mv.id, { id: mv.id, title: mv.title })
      })
    })
    return Array.from(map.values()).sort((a, b) => String(a.title || a.id).localeCompare(String(b.title || b.id)))
  }, [detail?.id, detail?.images])

  const [selectedMediaIds, setSelectedMediaIds] = React.useState<Record<string, boolean>>({})
  const [batchRelations, setBatchRelations] = React.useState<string[]>([])

  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false)
  const [assignQuery, setAssignQuery] = React.useState("")
  const [assignCandidates, setAssignCandidates] = React.useState<string[]>([])
  const [orphanListLoading, setOrphanListLoading] = React.useState(false)
  const [orphanQ, setOrphanQ] = React.useState("")
  const [orphanOffset, setOrphanOffset] = React.useState(0)
  const [orphanTotal, setOrphanTotal] = React.useState(0)
  const [orphanItems, setOrphanItems] = React.useState<Array<OrphanMediaItem>>([])
  const [orphanSelected, setOrphanSelected] = React.useState<Record<string, boolean>>({})

  const [reparseOpen, setReparseOpen] = React.useState(false)
  const [reparseGroupIds, setReparseGroupIds] = React.useState<string[]>([])

  const [mvData, setMvData] = React.useState<Array<{ id: string; title?: string }>>([])
  const options: Option[] = React.useMemo(() => buildMvTagOptions(mvData) as Option[], [mvData])

  const setGroupParam = React.useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams)
      if (id) next.set("group", id)
      else next.delete("group")
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  React.useEffect(() => {
    const g = searchParams.get("group")
    if (g && g !== activeId) setActiveId(g)
  }, [activeId, searchParams])

  const fetchMvs = React.useCallback(async () => {
    try {
      const res = await adminFetch(`${base}/mvs`)
      const json = await res.json().catch(() => null)
      if (res.ok && json?.success && Array.isArray(json?.data)) {
        setMvData(json.data)
      }
    } catch (err: any) {
      toast.error(formatApiError(err, '載入 MV 失敗'));
    }
  }, [base])

  React.useEffect(() => {
    fetchMvs()
  }, [fetchMvs])

  const fetchList = React.useCallback(async () => {
    setListLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("limit", String(limit))
      params.set("offset", String(offset))
      if (q.trim()) params.set("q", q.trim())
      if (status.trim()) params.set("status", status.trim())
      const res = await adminFetch(`${base}/system/media/groups?${params.toString()}`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "FETCH_FAILED"))
      setItems(Array.isArray(json?.data?.items) ? json.data.items : [])
      setTotal(Number(json?.data?.total || 0) || 0)
    } catch (e: any) {
      const msg = formatApiError(e, '載入分組列表失敗');
      setError(msg);
      toast.error(msg);
    } finally {
      setListLoading(false)
    }
  }, [base, limit, offset, q, status])

  React.useEffect(() => {
    fetchList()
  }, [fetchList])

  const fetchDetail = React.useCallback(
    async (id: string) => {
      setDetailLoading(true)
      setError(null)
      try {
        const res = await adminFetch(`${base}/system/media/groups/${encodeURIComponent(id)}`)
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) throw new Error(String(json?.error || "FETCH_DETAIL_FAILED"))
        const d = json?.data as GroupDetail
        const images = Array.isArray(d?.images) ? d.images : []
        const sorted = [...images].sort((a, b) => String(a.id).localeCompare(String(b.id)))
        setDetail({ ...(d || {}), images: sorted })
      } catch (e: any) {
        const msg = formatApiError(e, '載入分組詳情失敗');
        setError(msg);
        toast.error(msg);
        setDetail(null)
      } finally {
        setDetailLoading(false)
      }
    },
    [base],
  )

  React.useEffect(() => {
    if (!activeId) {
      setDetail(null)
      return
    }
    fetchDetail(activeId)
  }, [activeId, fetchDetail])

  const canPrev = offset > 0
  const canNext = offset + limit < total

  const updateDetailField = (key: keyof GroupDetail, value: any) => {
    setDetail((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSaveGroup = React.useCallback(async () => {
    if (!detail?.id) return
    setSavingGroup(true)
    setError(null)
    try {
      const res = await adminFetch(`${base}/system/media/groups/${encodeURIComponent(detail.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: detail.title,
          source_url: detail.source_url,
          source_text: detail.source_text,
          author_name: detail.author_name,
          author_handle: detail.author_handle,
          post_date: detail.post_date,
          status: detail.status,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "SAVE_FAILED"))
      toast.success("已保存推文分組")
      await fetchList()
      await fetchDetail(detail.id)
    } catch (e: any) {
      const msg = formatApiError(e, '保存分組失敗');
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingGroup(false)
    }
  }, [base, detail, fetchDetail, fetchList])

  const getMediaRelations = (m: MediaItem) => {
    const tags = Array.isArray(m.tags) ? m.tags.map(normalizeTagId).filter(Boolean) : []
    const mvIds = Array.isArray(m.mvs) ? m.mvs.map((x) => x.id).filter(Boolean) : []
    return Array.from(new Set([...tags, ...mvIds]))
  }

  React.useEffect(() => {
    setSelectedMediaIds({})
    setBatchRelations([])
  }, [detail?.id])

  React.useEffect(() => {
    setAssignCandidates([])
    setAssignQuery("")
    setOrphanQ("")
    setOrphanOffset(0)
    setOrphanTotal(0)
    setOrphanItems([])
    setOrphanSelected({})
  }, [detail?.id])

  const [relationsByMedia, setRelationsByMedia] = React.useState<Record<string, string[]>>({})
  React.useEffect(() => {
    if (!detail?.images) return
    const next: Record<string, string[]> = {}
    detail.images.forEach((m) => {
      if (!m?.id) return
      next[m.id] = getMediaRelations(m)
    })
    setRelationsByMedia(next)
  }, [detail?.id])

  const syncRelationsApi = React.useCallback(
    async (mediaId: string, relations: string[]) => {
      const res = await adminFetch(`${base}/system/media/${encodeURIComponent(mediaId)}/relations/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relations }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "SYNC_FAILED"))
    },
    [base],
  )

  const handleSyncRelations = React.useCallback(
    async (mediaId: string) => {
      const relations = relationsByMedia[mediaId] || []
      setSavingMediaId(mediaId)
      setError(null)
      try {
        await syncRelationsApi(mediaId, relations)
        toast.success("已同步關聯")
        if (detail?.id) await fetchDetail(detail.id)
      } catch (e: any) {
        const msg = formatApiError(e, '同步關聯失敗');
        setError(msg);
        toast.error(msg);
      } finally {
        setSavingMediaId(null)
      }
    },
    [detail?.id, fetchDetail, relationsByMedia, syncRelationsApi],
  )

  const selectedIds = React.useMemo(() => {
    return Object.entries(selectedMediaIds)
      .filter(([, v]) => v)
      .map(([k]) => k)
  }, [selectedMediaIds])

  const allSelected = React.useMemo(() => {
    const images = detail?.images || []
    if (images.length === 0) return false
    return images.every((m) => selectedMediaIds[m.id])
  }, [detail?.images, selectedMediaIds])

  const toggleSelectAll = React.useCallback(() => {
    const images = detail?.images || []
    if (images.length === 0) return
    setSelectedMediaIds(() => {
      const next: Record<string, boolean> = {}
      const checked = !allSelected
      images.forEach((m) => {
        next[m.id] = checked
      })
      return next
    })
  }, [allSelected, detail?.images])

  const handleApplyBatch = React.useCallback(() => {
    if (selectedIds.length === 0) return
    setRelationsByMedia((prev) => {
      const next = { ...prev }
      selectedIds.forEach((id) => {
        next[id] = batchRelations
      })
      return next
    })
    toast.success(`已套用到 ${selectedIds.length} 筆（尚未同步）`)
  }, [batchRelations, selectedIds])

  const handleSyncSelected = React.useCallback(async () => {
    if (selectedIds.length === 0) return
    setError(null)
    let ok = 0
    let failed = 0
    for (const id of selectedIds) {
      try {
        const relations = relationsByMedia[id] || []
        setSavingMediaId(id)
        await syncRelationsApi(id, relations)
        ok += 1
      } catch {
        failed += 1
      }
    }
    setSavingMediaId(null)
    if (ok > 0) toast.success(`已同步 ${ok} 筆`)
    if (failed > 0) setError(`同步失敗 ${failed} 筆，請重試或檢查權限/資料。`)
    if (detail?.id) await fetchDetail(detail.id)
  }, [detail?.id, fetchDetail, relationsByMedia, selectedIds, syncRelationsApi])

  const extractMediaIds = React.useCallback((input: string) => {
    const raw = String(input || "")
    const parts = raw
      .split(/[\s,]+/g)
      .map((s) => s.trim())
      .filter(Boolean)
    const ids: string[] = []
    for (const p of parts) {
      try {
        if (p.startsWith("http://") || p.startsWith("https://")) {
          const u = new URL(p)
          const segs = u.pathname.split("/").filter(Boolean)
          const idx = segs.findIndex((s) => s === "media")
          if (idx >= 0 && segs[idx + 1]) ids.push(segs[idx + 1])
        } else {
          ids.push(p)
        }
      } catch {
        ids.push(p)
      }
    }
    return Array.from(new Set(ids))
  }, [])

  const handleParseAssign = React.useCallback(() => {
    setAssignCandidates(extractMediaIds(assignQuery))
  }, [assignQuery, extractMediaIds])

  const assignToCurrentGroup = React.useCallback(
    async (mediaIds: string[]) => {
      if (!detail?.id) return
      const sourceUrl = String(detail.source_url || "").trim()
      if (!sourceUrl) {
        setError("當前 group 缺少 source_url，請先保存推文 URL")
        return
      }
      setError(null)
      let ok = 0
      let failed = 0
      for (const id of mediaIds) {
        try {
          await adminFetch(`${base}/system/media/orphans/${encodeURIComponent(id)}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source_url: sourceUrl,
              source_text: detail.source_text,
              author_name: detail.author_name,
              author_handle: detail.author_handle,
              post_date: detail.post_date,
              status: detail.status || "organized",
            }),
          }).then(async (r) => {
            const j = await r.json().catch(() => null)
            if (!r.ok || !j?.success) throw new Error(String(j?.error || "ASSIGN_FAILED"))
          })
          ok += 1
        } catch (err: any) {
          console.warn(`歸屬媒體 ${id} 失敗:`, formatApiError(err));
          failed += 1
        }
      }
      if (ok > 0) toast.success(`已歸屬 ${ok} 筆`)
      if (failed > 0) {
        const msg = `歸屬失敗 ${failed} 筆，請查看 Console 取得詳細資訊`;
        setError(msg);
        toast.error(msg);
      }
      if (detail?.id) await fetchDetail(detail.id)
    },
    [base, detail, fetchDetail],
  )

  type OrphanMediaItem = {
    id: string
    type?: string
    media_type?: string
    url?: string
    original_url?: string
    width?: number
    height?: number
    tags?: string[]
  }

  const fetchOrphans = React.useCallback(async () => {
    setOrphanListLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("limit", "50")
      params.set("offset", String(orphanOffset))
      if (orphanQ.trim()) params.set("q", orphanQ.trim())
      const res = await adminFetch(`${base}/system/media/orphans?${params.toString()}`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "FETCH_ORPHANS_FAILED"))
      setOrphanItems(Array.isArray(json?.data?.items) ? json.data.items : [])
      setOrphanTotal(Number(json?.data?.total || 0) || 0)
    } catch (e: any) {
      const msg = formatApiError(e, '載入未歸屬媒體失敗');
      setError(msg);
      toast.error(msg);
    } finally {
      setOrphanListLoading(false)
    }
  }, [base, orphanOffset, orphanQ])

  React.useEffect(() => {
    if (!assignDialogOpen) return
    fetchOrphans()
  }, [assignDialogOpen, fetchOrphans])

  return (
    <div className="p-6 flex flex-col gap-4">
      <AdminPageHeader
        title="推文分組"
        description="只處理推文來源的媒體分組，YouTube cover 不會列入這個維護流程。"
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>操作失敗</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        <div className="flex flex-col gap-3">
          <AdminPanel className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋 source_url / author / text" />
              <Select
                value={status ? status : "__all__"}
                onValueChange={(v) => setStatus(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="status 篩選" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部</SelectItem>
                  {statusOptions
                    .filter((s) => s)
                    .map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                variant="neutral"
                onClick={() => {
                  setOffset(0)
                  void fetchList()
                }}
                disabled={listLoading}
              >
                查詢
              </Button>
              <Button
                variant="neutral"
                onClick={() => {
                  const twitterIds = items
                    .filter((g) => g.source_url && /(?:twitter\.com|x\.com)/i.test(g.source_url || ""))
                    .map((g) => g.id)
                  if (twitterIds.length === 0) {
                    toast.info("當前頁面沒有推特來源的 group")
                    return
                  }
                  setReparseGroupIds(twitterIds)
                  setReparseOpen(true)
                }}
                disabled={listLoading}
                className="border-2 border-black"
              >
                批量重新解析
              </Button>
            </div>
            <div className="text-xs font-mono opacity-60">Total: {total} | Offset: {offset}</div>
          </AdminPanel>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>作者</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Media</TableHead>
                <TableHead>MV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((g) => {
                const active = g.id === activeId
                return (
                  <TableRow
                    key={g.id}
                    data-state={active ? "selected" : undefined}
                    onClick={() => {
                      setActiveId(g.id)
                      setGroupParam(g.id)
                    }}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono text-xs">{g.author_handle || g.author_name || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {g.post_date ? new Date(g.post_date).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{g.status || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{Number(g.media_count || 0) || 0}</TableCell>
                    <TableCell className="font-mono text-xs">{Number(g.mv_count || 0) || 0}</TableCell>
                  </TableRow>
                )
              })}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center opacity-60">
                    {listLoading ? "Loading..." : "No data"}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="flex gap-2 justify-end">
            <Button variant="neutral" disabled={!canPrev || listLoading} onClick={() => setOffset((v) => Math.max(0, v - limit))}>
              Prev
            </Button>
            <Button variant="neutral" disabled={!canNext || listLoading} onClick={() => setOffset((v) => v + limit)}>
              Next
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <AdminPanel className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black uppercase tracking-widest">Group Meta</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="neutral"
                  onClick={() => setAssignDialogOpen(true)}
                  disabled={!detail?.id}
                  className="border-2 border-black"
                >
                  歸屬 Orphans
                </Button>
                {detail?.source_url ? (
                  <Button variant="neutral" asChild className="border-2 border-black">
                    <a href={detail.source_url} target="_blank" rel="noreferrer">
                      Open Tweet
                    </a>
                  </Button>
                ) : null}
                {detail?.source_url && /(?:twitter\.com|x\.com)/i.test(detail.source_url) ? (
                  <Button
                    variant="neutral"
                    onClick={() => {
                      setReparseGroupIds([detail!.id])
                      setReparseOpen(true)
                    }}
                    className="border-2 border-black"
                  >
                    重新解析
                  </Button>
                ) : null}
                <Button onClick={() => void handleSaveGroup()} disabled={!detail?.id || savingGroup}>
                  {savingGroup ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
            {detailLoading ? (
              <div className="text-xs font-mono opacity-60">Loading...</div>
            ) : detail ? (
              <div className="flex flex-col gap-3">
                {groupMvs.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {groupMvs.slice(0, 6).map((mv) => (
                      <Button key={mv.id} variant="neutral" asChild className="border-2 border-black">
                        <Link to={`/admin/mvs?mvId=${encodeURIComponent(mv.id)}`} target="_blank">
                          Open {mv.title || mv.id}
                        </Link>
                      </Button>
                    ))}
                  </div>
                ) : null}
                <Input value={detail.source_url || ""} onChange={(e) => updateDetailField("source_url", e.target.value)} placeholder="source_url" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input value={detail.author_name || ""} onChange={(e) => updateDetailField("author_name", e.target.value)} placeholder="author_name" />
                  <Input value={detail.author_handle || ""} onChange={(e) => updateDetailField("author_handle", e.target.value)} placeholder="author_handle" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select value={detail.status || ""} onValueChange={(v) => updateDetailField("status", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions
                        .filter((s) => s)
                        .map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="datetime-local"
                    value={toDatetimeLocal(detail.post_date)}
                    onChange={(e) => updateDetailField("post_date", fromDatetimeLocal(e.target.value))}
                    placeholder="post_date"
                  />
                </div>
                <Textarea value={detail.source_text || ""} onChange={(e) => updateDetailField("source_text", e.target.value)} placeholder="source_text" className="min-h-[120px]" />
              </div>
            ) : (
              <div className="text-xs font-mono opacity-60">選擇左側的 group 以查看詳情</div>
            )}
          </AdminPanel>

          <AdminPanel className="flex flex-col gap-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={allSelected} onCheckedChange={() => toggleSelectAll()} />
                  <div className="text-sm font-black uppercase tracking-widest">Media</div>
                  <div className="text-xs font-mono opacity-60">{selectedIds.length} selected</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="neutral"
                    onClick={() => void handleApplyBatch()}
                    disabled={selectedIds.length === 0}
                    className="border-2 border-black"
                  >
                    套用
                  </Button>
                  <Button
                    variant="neutral"
                    onClick={() => void handleSyncSelected()}
                    disabled={selectedIds.length === 0}
                    className="border-2 border-black"
                  >
                    同步
                  </Button>
                </div>
              </div>
              <MultiSelect
                options={options}
                selected={batchRelations}
                onChange={(next) => setBatchRelations(next)}
                placeholder="批量選擇 tag:* 或 MV"
              />
            </div>
            {detail?.images && detail.images.length > 0 ? (
              <div className="flex flex-col gap-3">
                {detail.images.map((m) => {
                  const mvNames = Array.isArray(m.mvs) ? m.mvs.map((x) => x.title || x.id) : []
                  const rawUrl = String(m.original_url || m.url || "")
                  const previewUrl = rawUrl ? getProxyImgUrl(rawUrl) : ""
                  const isVideo = m.media_type === "video" || isMediaVideo(rawUrl)
                  const checked = Boolean(selectedMediaIds[m.id])
                  return (
                    <div key={m.id} className="border-2 border-black p-3 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setSelectedMediaIds((prev) => ({ ...prev, [m.id]: Boolean(v) }))
                          }
                        />
                        {rawUrl ? (
                          isVideo ? (
                            <video
                              src={previewUrl}
                              className="size-20 shrink-0 border-2 border-black bg-black"
                              preload="metadata"
                              controls
                            />
                          ) : (
                            <a href={rawUrl} target="_blank" rel="noreferrer" className="shrink-0">
                              <img
                                src={previewUrl}
                                alt={m.id}
                                className="size-20 object-cover border-2 border-black bg-black"
                                loading="lazy"
                              />
                            </a>
                          )
                        ) : null}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
                            <div className="text-xs font-mono break-all">{m.id}</div>
                            <div className="text-xs font-mono opacity-60">
                              {(m.type || "-") + (m.media_type ? `/${m.media_type}` : "")}{" "}
                              {(m.width || 0) > 0 && (m.height || 0) > 0 ? `${m.width}×${m.height}` : ""}
                            </div>
                          </div>
                          <div className="text-xs font-mono opacity-60 truncate">
                            {rawUrl ? (
                              <a href={rawUrl} target="_blank" rel="noreferrer" className="hover:underline">
                                {rawUrl}
                              </a>
                            ) : (
                              "-"
                            )}
                          </div>
                          <div className="text-xs font-mono opacity-60">
                            {mvNames.length > 0
                              ? `MVs: ${mvNames.slice(0, 3).join(", ")}${mvNames.length > 3 ? ` +${mvNames.length - 3}` : ""}`
                              : "MVs: -"}
                          </div>
                          {Array.isArray(m.mvs) && m.mvs.length > 0 ? (
                            <div className="flex flex-wrap gap-2 text-xs font-mono">
                              {m.mvs.slice(0, 3).map((mv) => (
                                <Link
                                  key={mv.id}
                                  to={`/admin/mvs?mvId=${encodeURIComponent(mv.id)}&mediaId=${encodeURIComponent(m.id)}`}
                                  target="_blank"
                                  className="underline opacity-80 hover:opacity-100"
                                >
                                  Open {mv.title || mv.id}
                                </Link>
                              ))}
                              {m.mvs.length > 3 ? (
                                <span className="opacity-60">+{m.mvs.length - 3}</span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <MultiSelect
                        options={options}
                        selected={relationsByMedia[m.id] || getMediaRelations(m)}
                        onChange={(next) => setRelationsByMedia((prev) => ({ ...prev, [m.id]: next }))}
                        placeholder="選擇 tag:* 或 MV"
                      />
                      <div className="flex justify-end">
                        <Button
                          variant="neutral"
                          onClick={() => void handleSyncRelations(m.id)}
                          disabled={savingMediaId === m.id}
                          className="border-2 border-black"
                        >
                          {savingMediaId === m.id ? "同步中..." : "同步關聯"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-xs font-mono opacity-60">{detailLoading ? "Loading..." : "No media"}</div>
            )}
          </AdminPanel>
        </div>
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>把 Orphan Media 歸屬到當前推文</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="border-2 border-black p-3 flex flex-col gap-3">
              <div className="text-xs font-mono opacity-70">
                當前 group：{detail?.id} | {detail?.source_url || "-"}
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <Input
                  value={assignQuery}
                  onChange={(e) => setAssignQuery(e.target.value)}
                  placeholder="貼 mediaId 或 URL（空白/逗號分隔）"
                />
                <Button variant="neutral" onClick={() => handleParseAssign()} className="border-2 border-black">
                  解析
                </Button>
                <Button
                  onClick={() => void assignToCurrentGroup(assignCandidates)}
                  disabled={assignCandidates.length === 0}
                >
                  歸屬
                </Button>
              </div>
              {assignCandidates.length > 0 ? (
                <div className="text-xs font-mono opacity-70 break-all">
                  Candidates: {assignCandidates.join(", ")}
                </div>
              ) : null}
            </div>

            <div className="border-2 border-black p-3 flex flex-col gap-3">
              <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                <div className="text-sm font-black uppercase tracking-widest">Orphan List</div>
                <div className="text-xs font-mono opacity-70">
                  Total: {orphanTotal} | Offset: {orphanOffset}
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <Input value={orphanQ} onChange={(e) => setOrphanQ(e.target.value)} placeholder="搜尋 orphan（id/url/caption）" />
                <Button
                  variant="neutral"
                  onClick={() => {
                    setOrphanOffset(0)
                    void fetchOrphans()
                  }}
                  disabled={orphanListLoading}
                  className="border-2 border-black"
                >
                  查詢
                </Button>
                <Button
                  onClick={() => {
                    const ids = Object.entries(orphanSelected)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                    void assignToCurrentGroup(ids)
                  }}
                  disabled={Object.values(orphanSelected).every((v) => !v)}
                >
                  歸屬已選
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead />
                    <TableHead>Preview</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orphanItems.map((m) => {
                    const rawUrl = String(m.original_url || m.url || "")
                    const previewUrl = rawUrl ? getProxyImgUrl(rawUrl) : ""
                    const isVideo = m.media_type === "video" || isMediaVideo(rawUrl)
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Checkbox
                            checked={Boolean(orphanSelected[m.id])}
                            onCheckedChange={(v) =>
                              setOrphanSelected((prev) => ({ ...prev, [m.id]: Boolean(v) }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {rawUrl ? (
                            isVideo ? (
                              <video
                                src={previewUrl}
                                className="size-16 border-2 border-black bg-black"
                                preload="metadata"
                                controls
                              />
                            ) : (
                              <a href={rawUrl} target="_blank" rel="noreferrer">
                                <img
                                  src={previewUrl}
                                  alt={m.id}
                                  className="size-16 object-cover border-2 border-black bg-black"
                                  loading="lazy"
                                />
                              </a>
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{m.id}</TableCell>
                        <TableCell className="text-xs font-bold">
                          {(m.type || "-") + (m.media_type ? `/${m.media_type}` : "")}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {(m.width || 0) > 0 && (m.height || 0) > 0 ? `${m.width}×${m.height}` : "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {orphanItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center opacity-60">
                        {orphanListLoading ? "Loading..." : "No orphans"}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="neutral"
                  disabled={orphanOffset <= 0 || orphanListLoading}
                  onClick={() => setOrphanOffset((v) => Math.max(0, v - 50))}
                >
                  Prev
                </Button>
                <Button
                  variant="neutral"
                  disabled={orphanOffset + 50 >= orphanTotal || orphanListLoading}
                  onClick={() => setOrphanOffset((v) => v + 50)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ReparsePreviewDialog
        open={reparseOpen}
        onOpenChange={setReparseOpen}
        groupIds={reparseGroupIds}
        defaultOverwrite={true}
        onComplete={() => {
          void fetchList()
          if (activeId) void fetchDetail(activeId)
        }}
      />
    </div>
  )
}
