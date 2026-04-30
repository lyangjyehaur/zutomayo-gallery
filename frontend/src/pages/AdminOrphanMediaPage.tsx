import React from "react"
import { toast } from "sonner"

import { adminFetch, getApiRoot } from "@/lib/admin-api"
import { getProxyImgUrl, isMediaVideo } from "@/lib/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type OrphanMedia = {
  id: string
  type?: string
  media_type?: string
  url?: string
  original_url?: string
  width?: number
  height?: number
  caption?: string
  tags?: string[]
  mvs?: Array<{ id: string; title?: string }>
}

export function AdminOrphanMediaPage() {
  const base = React.useMemo(() => getApiRoot(), [])
  const [error, setError] = React.useState<string | null>(null)
  const [items, setItems] = React.useState<OrphanMedia[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [savingId, setSavingId] = React.useState<string | null>(null)

  const [q, setQ] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("")
  const [offset, setOffset] = React.useState(0)
  const limit = 50

  const [tweetUrlById, setTweetUrlById] = React.useState<Record<string, string>>({})

  const fetchList = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("limit", String(limit))
      params.set("offset", String(offset))
      if (q.trim()) params.set("q", q.trim())
      if (typeFilter.trim()) params.set("type", typeFilter.trim())

      const res = await adminFetch(`${base}/system/media/orphans?${params.toString()}`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "FETCH_FAILED"))
      const nextItems = Array.isArray(json?.data?.items) ? json.data.items : []
      setItems(nextItems)
      setTotal(Number(json?.data?.total || 0) || 0)
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [base, limit, offset, q, typeFilter])

  React.useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleAssign = React.useCallback(
    async (mediaId: string) => {
      const sourceUrl = (tweetUrlById[mediaId] || "").trim()
      if (!sourceUrl) {
        setError("請輸入推文 URL (source_url)")
        return
      }
      setSavingId(mediaId)
      setError(null)
      try {
        const res = await adminFetch(`${base}/system/media/orphans/${encodeURIComponent(mediaId)}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_url: sourceUrl }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) throw new Error(String(json?.error || "ASSIGN_FAILED"))
        toast.success("已歸屬到推文分組")
        setTweetUrlById((prev) => {
          const next = { ...prev }
          delete next[mediaId]
          return next
        })
        await fetchList()
      } catch (e: any) {
        setError(String(e?.message || e))
      } finally {
        setSavingId(null)
      }
    },
    [base, fetchList, tweetUrlById],
  )

  const canPrev = offset > 0
  const canNext = offset + limit < total

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="border-4 border-black bg-card shadow-neo p-4">
        <div className="text-lg font-black uppercase tracking-widest">未歸屬媒體</div>
        <div className="text-xs font-mono opacity-60">
          顯示 group_id 為空的 media。可輸入推文 URL，將媒體歸屬到對應的 media_group (以 source_url 唯一定位)。
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>操作失敗</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="border-4 border-black bg-card shadow-neo p-4 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋 id / url / caption" />
          <Input
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder="type 篩選 (official/fanart/cover)"
          />
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
        <div className="text-xs font-mono opacity-60">
          Total: {total} | Showing: {items.length} | Offset: {offset}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Preview</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>MVs</TableHead>
            <TableHead>推文 URL</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((m) => {
            const mvNames = Array.isArray(m.mvs) ? m.mvs.map((x) => x.title || x.id) : []
            const rawUrl = String(m.original_url || m.url || "")
            const previewUrl = rawUrl ? getProxyImgUrl(rawUrl) : ""
            const isVideo = m.media_type === "video" || isMediaVideo(rawUrl)
            return (
              <TableRow key={m.id}>
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
                <TableCell className="text-xs font-mono">{Array.isArray(m.tags) ? m.tags.join(", ") : ""}</TableCell>
                <TableCell className="text-xs font-mono">{mvNames.slice(0, 2).join(", ")}{mvNames.length > 2 ? ` +${mvNames.length - 2}` : ""}</TableCell>
                <TableCell>
                  <Input
                    value={tweetUrlById[m.id] || ""}
                    onChange={(e) => setTweetUrlById((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder="https://x.com/.../status/..."
                  />
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => void handleAssign(m.id)}
                    disabled={savingId === m.id}
                    className="border-2 border-black"
                  >
                    {savingId === m.id ? "處理中..." : "歸屬"}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center opacity-60">
                {loading ? "Loading..." : "目前沒有未歸屬媒體"}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <div className="flex gap-2 justify-end">
        <Button variant="neutral" disabled={!canPrev || loading} onClick={() => setOffset((v) => Math.max(0, v - limit))}>
          Prev
        </Button>
        <Button variant="neutral" disabled={!canNext || loading} onClick={() => setOffset((v) => v + limit)}>
          Next
        </Button>
      </div>
    </div>
  )
}
