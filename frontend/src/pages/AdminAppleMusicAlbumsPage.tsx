import React, { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useInvalidate, useList, useUpdate } from "@refinedev/core"

import { AdminSplitView } from "@/components/admin/AdminSplitView"
import { Switch } from "@/components/ui/switch"

export interface AppleMusicAlbum {
  id: string
  album_name: string
  artist_name: string
  release_date: string
  collection_type: string
  track_count: number
  is_hidden: boolean
  source_url: string
}

export function AdminAppleMusicAlbumsPage() {
  const invalidate = useInvalidate()
  const listQuery = useList<AppleMusicAlbum>({ resource: "appleMusicAlbums", hasPagination: false })
  const updateOne = useUpdate()

  const [albums, setAlbums] = useState<AppleMusicAlbum[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    const rows = listQuery.data?.data || []
    if (rows.length === 0) return
    setAlbums((prev) => (prev.length > 0 ? prev : rows))
    setSelectedId((prev) => (typeof prev === "string" ? prev : String(rows[0].id)))
  }, [listQuery.data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return albums
    return albums.filter((a) => {
      return (
        String(a.album_name || "").toLowerCase().includes(q) ||
        String(a.artist_name || "").toLowerCase().includes(q) ||
        String(a.id).includes(q)
      )
    })
  }, [albums, query])

  const groups = useMemo(() => {
    const map = new Map<string, AppleMusicAlbum[]>()
    filtered.forEach((a) => {
      const key = a.collection_type || "unknown"
      const list = map.get(key) || []
      list.push(a)
      map.set(key, list)
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, list]) => ({
        key: k,
        items: [...list].sort((a, b) => String(b.release_date || "").localeCompare(String(a.release_date || ""))),
      }))
  }, [filtered])

  const selected = useMemo(() => {
    if (typeof selectedId !== "string") return null
    return albums.find((a) => String(a.id) === selectedId) || null
  }, [albums, selectedId])

  const updateSelected = (patch: Partial<AppleMusicAlbum>) => {
    if (!selected) return
    setAlbums((prev) => prev.map((a) => (String(a.id) === String(selected.id) ? ({ ...a, ...patch } as any) : a)))
  }

  return (
    <AdminSplitView
      title="Apple Music 專輯管理"
      description="左側列表（搜尋+分組），右側維護顯示/隱藏與檢視資訊。"
      leftSearchValue={query}
      onLeftSearchValueChange={setQuery}
      leftSearchPlaceholder="搜尋專輯/藝人..."
      groups={groups}
      getKey={(a) => a.id}
      renderItemTitle={(a) => a.album_name}
      renderItemSubtitle={(a) => a.artist_name}
      selectedKey={selectedId || null}
      onSelect={setSelectedId}
      leftEmpty={<div className="p-3 text-xs font-mono opacity-60">{listQuery.isLoading ? "載入中..." : "無資料"}</div>}
      rightEmpty={<div className="text-xs font-mono opacity-60">選擇左側項目以查看詳情</div>}
      right={
        !selected ? null : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-black break-words">{selected.album_name}</div>
                <div className="text-xs font-mono opacity-60 break-words">{selected.artist_name}</div>
                <div className="text-[10px] font-mono opacity-60">
                  {new Date(selected.release_date).toLocaleDateString()} · {selected.collection_type} · {selected.track_count} tracks · ID {selected.id}
                </div>
                <a href={selected.source_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                  來源連結
                </a>
              </div>
              <div className="flex items-center gap-3 border-2 border-black p-3 bg-card">
                <div className="text-xs font-black uppercase tracking-widest">Hidden</div>
                <Switch
                  checked={!!selected.is_hidden}
                  onCheckedChange={(c) => {
                    updateSelected({ is_hidden: c })
                    toast.promise(
                      updateOne
                        .mutateAsync({ resource: "appleMusicAlbums", id: selected.id, values: { is_hidden: c } })
                        .then(() => invalidate({ resource: "appleMusicAlbums", invalidates: ["list", "detail"] })),
                      { loading: "儲存中...", success: "已更新", error: "更新失敗" },
                    )
                  }}
                />
              </div>
            </div>
          </>
        )
      }
    />
  )
}
