import React from "react"
import { toast } from "sonner"
import { formatApiError } from "@/lib/api-error"
import { Link } from "react-router-dom"

import { adminFetch, getApiRoot } from "@/lib/admin-api"
import { getProxyImgUrl, isMediaVideo } from "@/lib/image"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { ReparsePreviewDialog } from "@/components/admin/ReparsePreviewDialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type RepairGroupRow = {
  id: string
  source_url?: string | null
  source_text?: string | null
  author_name?: string | null
  author_handle?: string | null
  post_date?: string | null
  status?: string | null
  media_count?: number
  mv_count?: number
  preview_url?: string | null
  sample_url?: string | null
  sample_original_url?: string | null
  missing_source_url?: boolean
  missing_post_date?: boolean
}

const toDatetimeLocal = (value?: string | null) => {
  const raw = typeof value === "string" ? value : ""
  if (!raw) return ""
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const fromDatetimeLocal = (value: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function AdminMediaGroupRepairPage() {
  const base = React.useMemo(() => getApiRoot(), [])
  const statusOptions = React.useMemo(
    () => ["organized", "unorganized", "pending", "deleted", "rejected"],
    [],
  )

  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [q, setQ] = React.useState("")
  const [onlyInferable, setOnlyInferable] = React.useState(false)
  const [offset, setOffset] = React.useState(0)
  const limit = 50

  const [items, setItems] = React.useState<RepairGroupRow[]>([])
  const [total, setTotal] = React.useState(0)

  const [editOpen, setEditOpen] = React.useState(false)
  const [editSaving, setEditSaving] = React.useState(false)
  const [editRow, setEditRow] = React.useState<RepairGroupRow | null>(null)

  const [mergeOpen, setMergeOpen] = React.useState(false)
  const [mergeConfirmOpen, setMergeConfirmOpen] = React.useState(false)
  const [mergeRow, setMergeRow] = React.useState<RepairGroupRow | null>(null)
  const [mergeTargetUrl, setMergeTargetUrl] = React.useState("")
  const [mergeTargetId, setMergeTargetId] = React.useState("")
  const [mergeTargetOptions, setMergeTargetOptions] = React.useState<SearchSelectOption[]>([])
  const [mergeTargetLoading, setMergeTargetLoading] = React.useState(false)

  const [unassignConfirmOpen, setUnassignConfirmOpen] = React.useState(false)
  const [unassignRow, setUnassignRow] = React.useState<RepairGroupRow | null>(null)

  const [selectedIds, setSelectedIds] = React.useState<Record<string, boolean>>({})
  const [reparseOpen, setReparseOpen] = React.useState(false)
  const [reparseGroupIds, setReparseGroupIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!mergeOpen) return
    if (mergeTargetOptions.length > 0) return
    const run = async () => {
      try {
        setMergeTargetLoading(true)
        const url = `${base}/system/media/groups?limit=200&offset=0`
        const res = await adminFetch(url)
        const json = await res.json().catch(() => null)
        const rows = Array.isArray(json?.items) ? json.items : Array.isArray(json?.data) ? json.data : []
        setMergeTargetOptions(
          rows
            .map((r: any) => {
              const id = r?.id ? String(r.id) : ""
              if (!id) return null
              const handle = r?.author_handle ? String(r.author_handle) : ""
              const date = r?.post_date ? new Date(String(r.post_date)).toLocaleDateString() : ""
              const sourceUrl = r?.source_url ? String(r.source_url) : ""
              const label = [id, handle, date, sourceUrl].filter(Boolean).join(" · ")
              return { value: id, label }
            })
            .filter(Boolean) as any,
        )
      } catch {
      } finally {
        setMergeTargetLoading(false)
      }
    }
    run()
  }, [base, mergeOpen, mergeTargetOptions.length])

  const infer = React.useCallback((row: RepairGroupRow) => {
    const handle = String(row.author_handle || "").trim().replace(/^@/, "")
    const candidates = [row.sample_original_url, row.sample_url, row.preview_url]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)

    const extract = (raw: string) => {
      const m1 = raw.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([^\/?#]+)\/status(?:es)?\/(\d+)/i)
      if (m1) return { handle: m1[1], tweetId: m1[2] }
      const m2 = raw.match(/\/status(?:es)?\/(\d+)/i)
      if (m2) return { handle: "", tweetId: m2[1] }
      const m3 = raw.match(/[?&]tweet_id=(\d+)/i)
      if (m3) return { handle: "", tweetId: m3[1] }
      return null
    }

    for (const raw of candidates) {
      const hit = extract(raw)
      if (!hit) continue
      const finalHandle = hit.handle || handle
      if (finalHandle) {
        return { url: `https://x.com/${finalHandle}/status/${hit.tweetId}`, confidence: "high" as const }
      }
      return { url: `https://x.com/i/web/status/${hit.tweetId}`, confidence: "medium" as const }
    }

    return { url: "", confidence: "none" as const }
  }, [])

  const inferred = React.useMemo(() => {
    return items.map((row) => ({ row, inferred: infer(row) }))
  }, [infer, items])

  const visible = React.useMemo(() => {
    if (!onlyInferable) return inferred
    return inferred.filter((x) => x.inferred.confidence !== "none")
  }, [inferred, onlyInferable])

  const inferStats = React.useMemo(() => {
    let high = 0
    let medium = 0
    let none = 0
    inferred.forEach((x) => {
      if (x.inferred.confidence === "high") high += 1
      else if (x.inferred.confidence === "medium") medium += 1
      else none += 1
    })
    return { high, medium, none }
  }, [inferred])

  const fetchList = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("limit", String(limit))
      params.set("offset", String(offset))
      if (q.trim()) params.set("q", q.trim())
      const res = await adminFetch(`${base}/system/media/groups/repair?${params.toString()}`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "FETCH_FAILED"))
      setItems(Array.isArray(json?.data?.items) ? json.data.items : [])
      setTotal(Number(json?.data?.total || 0) || 0)
    } catch (e: any) {
      const msg = formatApiError(e, '載入修復列表失敗');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false)
    }
  }, [base, limit, offset, q])

  React.useEffect(() => {
    fetchList()
  }, [fetchList])

  const isTwitterUrl = (url: string | null | undefined): boolean =>
    typeof url === "string" && /(?:twitter\.com|x\.com)/i.test(url)

  const canReparseRow = React.useCallback(
    (row: RepairGroupRow, inf: { url: string; confidence: string }): boolean => {
      return isTwitterUrl(row.source_url) || inf.confidence !== "none"
    },
    [],
  )

  /**
   * 對於缺少 source_url 但有 inferred URL 的 group，
   * 先將 inferred URL 寫入 source_url，再進行重解析
   */
  const ensureSourceUrl = async (row: RepairGroupRow, inf: { url: string; confidence: string }): Promise<boolean> => {
    if (isTwitterUrl(row.source_url)) return true
    if (inf.confidence === "none" || !inf.url) return false
    try {
      const res = await adminFetch(`${base}/system/media/groups/${encodeURIComponent(row.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: inf.url }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) return false
      return true
    } catch {
      return false
    }
  }

  const handleReparse = async (row: RepairGroupRow, inf: { url: string; confidence: string }) => {
    const ok = await ensureSourceUrl(row, inf)
    if (!ok) {
      toast.error("無法設定 source_url，請先手動編輯")
      return
    }
    setReparseGroupIds([row.id])
    setReparseOpen(true)
  }

  const handleBatchReparse = async () => {
    const ids: string[] = []
    for (const { row, inferred: inf } of visible) {
      if (!selectedIds[row.id]) continue
      if (!canReparseRow(row, inf)) continue
      const ok = await ensureSourceUrl(row, inf)
      if (ok) ids.push(row.id)
    }
    if (ids.length === 0) {
      toast.info("沒有可重解析的推特來源")
      return
    }
    setReparseGroupIds(ids)
    setReparseOpen(true)
  }

  const selectedCount = React.useMemo(() => {
    return Object.values(selectedIds).filter(Boolean).length
  }, [selectedIds])

  const openEdit = (row: RepairGroupRow) => {
    setEditRow({ ...row })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editRow?.id) return
    setEditSaving(true)
    setError(null)
    try {
      const res = await adminFetch(`${base}/system/media/groups/${encodeURIComponent(editRow.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: editRow.source_url,
          source_text: editRow.source_text,
          author_name: editRow.author_name,
          author_handle: editRow.author_handle,
          post_date: editRow.post_date,
          status: editRow.status,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "SAVE_FAILED"))
      toast.success("已保存")
      setEditOpen(false)
      setEditRow(null)
      await fetchList()
    } catch (e: any) {
      const msg = formatApiError(e, '保存分組失敗');
      setError(msg);
      toast.error(msg);
    } finally {
      setEditSaving(false)
    }
  }

  const openMerge = (row: RepairGroupRow) => {
    setMergeRow(row)
    setMergeTargetUrl("")
    setMergeTargetId("")
    setMergeOpen(true)
  }

  const doMerge = async () => {
    if (!mergeRow?.id) return
    const targetUrl = mergeTargetUrl.trim()
    const targetId = mergeTargetId.trim()
    if (!targetUrl && !targetId) return
    setError(null)
    try {
      const res = await adminFetch(`${base}/system/media/groups/${encodeURIComponent(mergeRow.id)}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_group_id: targetId || undefined,
          target_source_url: targetId ? undefined : targetUrl,
          carry_fields: true,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "MERGE_FAILED"))
      toast.success("已合併")
      setMergeConfirmOpen(false)
      setMergeOpen(false)
      setMergeRow(null)
      await fetchList()
    } catch (e: any) {
      const msg = formatApiError(e, '合併分組失敗');
      setError(msg);
      toast.error(msg);
    }
  }

  const openUnassign = (row: RepairGroupRow) => {
    setUnassignRow(row)
    setUnassignConfirmOpen(true)
  }

  const doUnassign = async () => {
    if (!unassignRow?.id) return
    setError(null)
    try {
      const res = await adminFetch(`${base}/system/media/groups/${encodeURIComponent(unassignRow.id)}/unassign`, {
        method: "POST",
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "UNASSIGN_FAILED"))
      toast.success("已拆回 Orphans")
      setUnassignConfirmOpen(false)
      setUnassignRow(null)
      await fetchList()
    } catch (e: any) {
      const msg = formatApiError(e, '拆分分組失敗');
      setError(msg);
      toast.error(msg);
    }
  }

  const canPrev = offset > 0
  const canNext = offset + limit < total

  return (
    <div className="p-6 flex flex-col gap-4">
      <AdminPageHeader title="推文修復" description="列出缺少 source_url / post_date 的 media_groups，集中修正或合併。" />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>操作失敗</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <AdminPanel className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋 id / url / author / text" />
          <Button
            variant="neutral"
            onClick={() => {
              setOffset(0)
              void fetchList()
            }}
            disabled={loading}
          >
            查詢
          </Button>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="text-xs font-mono opacity-60">Total: {total} | Offset: {offset}</div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono opacity-60">Infer high/medium/none: {inferStats.high}/{inferStats.medium}/{inferStats.none}</div>
            <div className="flex items-center gap-2">
              <Switch checked={onlyInferable} onCheckedChange={setOnlyInferable} />
              <div className="text-xs font-mono opacity-60">只看可反推</div>
            </div>
          </div>
        </div>
      </AdminPanel>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={visible.length > 0 && visible.every(({ row: g, inferred: inf }) => canReparseRow(g, inf) ? selectedIds[g.id] : true)}
                onCheckedChange={() => {
                  const next: Record<string, boolean> = {}
                  const allChecked = visible.every(({ row: g, inferred: inf }) => !canReparseRow(g, inf) || selectedIds[g.id])
                  visible.forEach(({ row: g, inferred: inf }) => {
                    if (canReparseRow(g, inf)) next[g.id] = !allChecked
                  })
                  setSelectedIds(next)
                }}
              />
            </TableHead>
            <TableHead>Preview</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Missing</TableHead>
            <TableHead>Media</TableHead>
            <TableHead>MV</TableHead>
            <TableHead>Source URL</TableHead>
            <TableHead>Inferred</TableHead>
            <TableHead>Conf</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map(({ row: g, inferred: inf }) => {
            const rawUrl = String(g.preview_url || "")
            const previewUrl = rawUrl ? getProxyImgUrl(rawUrl) : ""
            const isVideo = isMediaVideo(rawUrl) || g.preview_url?.includes(".mp4")
            const missing: string[] = []
            if (g.missing_source_url) missing.push("source_url")
            if (g.missing_post_date) missing.push("post_date")
            const canRep = canReparseRow(g, inf)
            return (
              <TableRow key={g.id}>
                <TableCell>
                  <Checkbox
                    checked={Boolean(selectedIds[g.id])}
                    onCheckedChange={(v) => setSelectedIds((prev) => ({ ...prev, [g.id]: Boolean(v) }))}
                    disabled={!canRep}
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
                          alt={g.id}
                          className="size-16 object-cover border-2 border-black bg-black"
                          loading="lazy"
                        />
                      </a>
                    )
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-xs">{g.id}</TableCell>
                <TableCell className="font-mono text-xs">{missing.length > 0 ? missing.join(", ") : "-"}</TableCell>
                <TableCell className="font-mono text-xs">{Number(g.media_count || 0) || 0}</TableCell>
                <TableCell className="font-mono text-xs">{Number(g.mv_count || 0) || 0}</TableCell>
                <TableCell className="font-mono text-xs break-all">
                  {g.source_url ? (
                    <a href={g.source_url} target="_blank" rel="noreferrer" className="underline">
                      {g.source_url}
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs break-all">
                  {inf.url ? (
                    <a href={inf.url} target="_blank" rel="noreferrer" className="underline">
                      {inf.url}
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{inf.confidence}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(g)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openMerge(g)}>
                      Merge
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openUnassign(g)}>
                      Unassign
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/admin/system/media-groups?group=${encodeURIComponent(g.id)}`} target="_blank">
                        Open
                      </Link>
                    </Button>
                    {canRep ? (
                      <Button size="sm" variant="outline" onClick={() => void handleReparse(g, inf)}>
                        Reparse
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center opacity-60">
                {loading ? "Loading..." : "No data"}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      {selectedCount > 0 ? (
        <div className="sticky bottom-4 z-10 border-2 border-black bg-background p-3 flex items-center justify-between gap-3 shadow-md">
          <div className="text-xs font-mono">已選 {selectedCount} 個可重解析的 group</div>
          <Button onClick={() => void handleBatchReparse()}>
            批量重新解析
          </Button>
        </div>
      ) : null}

      <div className="flex gap-2 justify-end">
        <Button variant="neutral" disabled={!canPrev || loading} onClick={() => setOffset((v) => Math.max(0, v - limit))}>
          Prev
        </Button>
        <Button variant="neutral" disabled={!canNext || loading} onClick={() => setOffset((v) => v + limit)}>
          Next
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>修正 Group Meta</DialogTitle>
          </DialogHeader>
          {editRow ? (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-mono opacity-70 break-all">{editRow.id}</div>
              <Input
                value={editRow.source_url || ""}
                onChange={(e) => setEditRow((p) => (p ? { ...p, source_url: e.target.value } : p))}
                placeholder="source_url"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  value={editRow.author_name || ""}
                  onChange={(e) => setEditRow((p) => (p ? { ...p, author_name: e.target.value } : p))}
                  placeholder="author_name"
                />
                <Input
                  value={editRow.author_handle || ""}
                  onChange={(e) => setEditRow((p) => (p ? { ...p, author_handle: e.target.value } : p))}
                  placeholder="author_handle"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select
                  value={editRow.status ? editRow.status : "__none__"}
                  onValueChange={(v) => setEditRow((p) => (p ? { ...p, status: v === "__none__" ? null : v } : p))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">未設定</SelectItem>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="datetime-local"
                  value={toDatetimeLocal(editRow.post_date)}
                  onChange={(e) => setEditRow((p) => (p ? { ...p, post_date: fromDatetimeLocal(e.target.value) } : p))}
                />
              </div>
              <Textarea
                value={editRow.source_text || ""}
                onChange={(e) => setEditRow((p) => (p ? { ...p, source_text: e.target.value } : p))}
                placeholder="source_text"
                className="min-h-[140px]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="neutral" onClick={() => setEditOpen(false)} className="border-2 border-black">
                  取消
                </Button>
                <Button onClick={() => void saveEdit()} disabled={editSaving}>
                  {editSaving ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>合併 Group</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="text-xs font-mono opacity-70 break-all">Source: {mergeRow?.id}</div>
            <Input value={mergeTargetUrl} onChange={(e) => setMergeTargetUrl(e.target.value)} placeholder="target_source_url（推薦）" />
            <div className="text-xs font-mono opacity-60">或使用 group id</div>
            <SearchSelect
              options={mergeTargetOptions}
              value={mergeTargetId || null}
              onChange={(v) => setMergeTargetId(v || "")}
              placeholder={mergeTargetLoading ? "載入中..." : "搜尋 target_group_id"}
            />
            <div className="text-xs font-mono opacity-60">合併會搬移所有 media 到 target group，並刪除 source group。</div>
            <div className="flex justify-end gap-2">
              <Button variant="neutral" onClick={() => setMergeOpen(false)} className="border-2 border-black">
                取消
              </Button>
              <Button
                onClick={() => setMergeConfirmOpen(true)}
                disabled={!mergeRow?.id || (!mergeTargetUrl.trim() && !mergeTargetId.trim())}
              >
                下一步
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={mergeConfirmOpen} onOpenChange={setMergeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認合併</AlertDialogTitle>
            <AlertDialogDescription>
              將把 group {mergeRow?.id} 的所有 media 搬移到 target，並刪除該 group。確定要繼續嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doMerge()}>確認</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unassignConfirmOpen} onOpenChange={setUnassignConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認拆回 Orphans</AlertDialogTitle>
            <AlertDialogDescription>
              將把 group {unassignRow?.id} 內所有 media 的 group_id 清空（變成 orphan），並刪除該 group。確定要繼續嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doUnassign()}>確認</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReparsePreviewDialog
        open={reparseOpen}
        onOpenChange={setReparseOpen}
        groupIds={reparseGroupIds}
        defaultOverwrite={false}
        onComplete={() => {
          setSelectedIds({})
          void fetchList()
        }}
      />
    </div>
  )
}
