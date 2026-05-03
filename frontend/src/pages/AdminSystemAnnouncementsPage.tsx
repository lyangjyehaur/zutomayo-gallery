import React from "react"
import { toast } from "sonner"

import { adminFetch, getApiRoot } from "@/lib/admin-api"
import Marquee from "@/components/ui/marquee"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
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
import { Badge } from "@/components/ui/badge"

type AnnouncementRow = {
  id: string
  content: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

const languages = ["default", "zh-TW", "zh-CN", "zh-HK", "ja", "ko", "en", "es"] as const

const parseContent = (raw: string): Record<string, string> => {
  const s = String(raw || "").trim()
  if (!s) return {}
  if (s.startsWith("{") && s.endsWith("}")) {
    try {
      const obj = JSON.parse(s)
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        const out: Record<string, string> = {}
        Object.entries(obj).forEach(([k, v]) => {
          if (!k) return
          if (typeof v !== "string") return
          const t = v.trim()
          if (!t) return
          out[k] = t
        })
        return out
      }
    } catch {}
  }
  return { default: s }
}

const packContent = (map: Record<string, string>) => {
  const cleaned: Record<string, string> = {}
  Object.entries(map).forEach(([k, v]) => {
    const kk = String(k || "").trim()
    if (!kk) return
    const vv = typeof v === "string" ? v.trim() : ""
    if (!vv) return
    cleaned[kk] = vv
  })
  const keys = Object.keys(cleaned)
  if (keys.length === 0) return ""
  if (keys.length === 1 && cleaned.default) return cleaned.default
  return JSON.stringify(cleaned)
}

const pickPreview = (map: Record<string, string>, preferLang: string) => {
  const byPref = map[preferLang]
  if (byPref) return byPref
  const base = preferLang.split("-")[0]
  if (map[base]) return map[base]
  if (map["zh-TW"]) return map["zh-TW"]
  if (map["en"]) return map["en"]
  if (map["default"]) return map["default"]
  const first = Object.values(map).find(Boolean)
  return first || ""
}

export function AdminSystemAnnouncementsPage() {
  const base = React.useMemo(() => getApiRoot(), [])

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [items, setItems] = React.useState<AnnouncementRow[]>([])
  const [order, setOrder] = React.useState<string[]>([])

  const [editOpen, setEditOpen] = React.useState(false)
  const [editSaving, setEditSaving] = React.useState(false)
  const [editing, setEditing] = React.useState<AnnouncementRow | null>(null)
  const [editLang, setEditLang] = React.useState<(typeof languages)[number]>("default")
  const [editContentByLang, setEditContentByLang] = React.useState<Record<string, string>>({})
  const [editActive, setEditActive] = React.useState(true)

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const fetchList = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch(`${base}/system/announcements`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "FETCH_FAILED"))
      const list = Array.isArray(json?.data?.items) ? json.data.items : []
      const ord = Array.isArray(json?.data?.order) ? json.data.order.map(String) : []
      setItems(list)
      setOrder(ord)
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [base])

  React.useEffect(() => {
    void fetchList()
  }, [fetchList])

  const sortedItems = React.useMemo(() => {
    const rank = new Map<string, number>()
    order.forEach((id, idx) => rank.set(String(id), idx))
    return [...items].sort((a, b) => {
      const ra = rank.has(String(a.id)) ? (rank.get(String(a.id)) as number) : Number.MAX_SAFE_INTEGER
      const rb = rank.has(String(b.id)) ? (rank.get(String(b.id)) as number) : Number.MAX_SAFE_INTEGER
      if (ra !== rb) return ra - rb
      return String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
    })
  }, [items, order])

  const move = async (id: string, dir: -1 | 1) => {
    const curr = order.length > 0 ? [...order] : sortedItems.map((x) => x.id)
    const idx = curr.indexOf(id)
    if (idx < 0) return
    const nextIdx = idx + dir
    if (nextIdx < 0 || nextIdx >= curr.length) return
    const tmp = curr[idx]
    curr[idx] = curr[nextIdx]
    curr[nextIdx] = tmp
    setOrder(curr)
    try {
      const res = await adminFetch(`${base}/system/announcements/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: curr }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "SAVE_ORDER_FAILED"))
    } catch (e: any) {
      toast.error("保存排序失敗")
      setError(String(e?.message || e))
    }
  }

  const openCreate = () => {
    setEditing(null)
    setEditLang("default")
    setEditContentByLang({})
    setEditActive(true)
    setEditOpen(true)
  }

  const openEdit = (row: AnnouncementRow) => {
    setEditing(row)
    setEditLang("default")
    setEditContentByLang(parseContent(row.content))
    setEditActive(!!row.is_active)
    setEditOpen(true)
  }

  const saveEdit = async () => {
    const packed = packContent(editContentByLang)
    if (!packed) return
    setEditSaving(true)
    setError(null)
    try {
      const url = editing?.id
        ? `${base}/system/announcements/${encodeURIComponent(editing.id)}`
        : `${base}/system/announcements`
      const method = editing?.id ? "PUT" : "POST"
      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: packed.startsWith("{") ? JSON.parse(packed) : packed, is_active: editActive }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "SAVE_FAILED"))
      toast.success("已保存")
      setEditOpen(false)
      await fetchList()
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setEditSaving(false)
    }
  }

  const toggleActive = async (row: AnnouncementRow, next: boolean) => {
    setError(null)
    setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, is_active: next } : x)))
    try {
      const res = await adminFetch(`${base}/system/announcements/${encodeURIComponent(row.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "TOGGLE_FAILED"))
    } catch (e: any) {
      toast.error("更新狀態失敗")
      setError(String(e?.message || e))
      await fetchList()
    }
  }

  const requestDelete = (id: string) => {
    setDeletingId(id)
    setDeleteOpen(true)
  }

  const doDelete = async () => {
    if (!deletingId) return
    setError(null)
    try {
      const res = await adminFetch(`${base}/system/announcements/${encodeURIComponent(deletingId)}`, { method: "DELETE" })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "DELETE_FAILED"))
      toast.success("已刪除")
      setDeleteOpen(false)
      setDeletingId(null)
      await fetchList()
    } catch (e: any) {
      setError(String(e?.message || e))
    }
  }

  const previewItems = React.useMemo(() => {
    const lang = typeof navigator !== "undefined" ? navigator.language : "zh-TW"
    return sortedItems
      .filter((x) => x.is_active)
      .map((x) => pickPreview(parseContent(x.content), lang))
      .filter(Boolean)
  }, [sortedItems])

  return (
    <div className="p-6 flex flex-col gap-4">
      <AdminPageHeader
        title="公告管理"
        description="維護首頁跑馬燈公告：新增/編輯/啟用/排序，並提供即時預覽。"
        actions={
          <Button onClick={openCreate} className="border-2 border-black">
            新增公告
          </Button>
        }
      />

      {error ? (
        <AdminPanel className="border-red-500">
          <div className="text-sm font-black">操作失敗</div>
          <div className="text-xs font-mono opacity-70 break-all">{error}</div>
        </AdminPanel>
      ) : null}

      <AdminPanel className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-mono opacity-60">Active: {previewItems.length}</div>
          <Button variant="neutral" onClick={() => void fetchList()} disabled={loading} className="border-2 border-black">
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
        {previewItems.length > 0 ? <Marquee items={previewItems} /> : <div className="text-xs font-mono opacity-60">目前沒有啟用的公告</div>}
      </AdminPanel>

      <AdminPanel className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>On</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Lang</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((row) => {
              const contentMap = parseContent(row.content)
              const langKeys = Object.keys(contentMap)
              const preview = pickPreview(contentMap, "zh-TW")
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Switch checked={!!row.is_active} onCheckedChange={(v) => void toggleActive(row, v)} />
                  </TableCell>
                  <TableCell className="text-xs font-mono max-w-[560px] truncate">{preview || "-"}</TableCell>
                  <TableCell className="text-xs font-mono">
                    <div className="flex flex-wrap gap-1">
                      {langKeys.slice(0, 4).map((k) => (
                        <Badge key={k} variant="secondary">
                          {k}
                        </Badge>
                      ))}
                      {langKeys.length > 4 ? <Badge variant="secondary">+{langKeys.length - 4}</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => void move(row.id, -1)}>
                        ↑
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void move(row.id, 1)}>
                        ↓
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => requestDelete(row.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {sortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center opacity-60">
                  No data
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </AdminPanel>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl border-4 border-black shadow-neo">
          <DialogHeader>
            <DialogTitle>{editing ? "編輯公告" : "新增公告"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {languages.map((l) => (
                  <Button
                    key={l}
                    variant={editLang === l ? "neutral" : "outline"}
                    size="sm"
                    onClick={() => setEditLang(l)}
                    className="border-2 border-black"
                  >
                    {l}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono opacity-60">啟用</div>
                <Switch checked={editActive} onCheckedChange={setEditActive} />
              </div>
            </div>
            <Textarea
              value={editContentByLang[editLang] || ""}
              onChange={(e) => setEditContentByLang((prev) => ({ ...prev, [editLang]: e.target.value }))}
              placeholder={editLang === "default" ? "公告內容（單一語系或預設）" : `公告內容（${editLang}）`}
              className="min-h-[160px]"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-mono opacity-60">
                每則公告建議一行；多語言會以 JSON 形式存入 content。
              </div>
              <div className="flex gap-2">
                <Button variant="neutral" onClick={() => setEditOpen(false)} className="border-2 border-black">
                  取消
                </Button>
                <Button onClick={() => void saveEdit()} disabled={editSaving}>
                  {editSaving ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>刪除後無法復原，確定要刪除這則公告嗎？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doDelete()}>刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
