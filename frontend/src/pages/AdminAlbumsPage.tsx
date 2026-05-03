import React, { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useCreate, useDelete, useInvalidate, useList, useUpdate } from "@refinedev/core"

import { AdminSplitView } from "@/components/admin/AdminSplitView"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select"

interface DictItem {
  id: string
  category: string
  code: string
  label: string
  description: string
  sort_order: number
}

export interface Album {
  id: string
  name: string
  type: string
  apple_music_album_id?: string
  hide_date: boolean
}

export function AdminAlbumsPage() {
  const invalidate = useInvalidate()
  const albumList = useList<Album>({ resource: "albums", hasPagination: false })
  const dictList = useList<DictItem>({ resource: "dicts", hasPagination: false })
  const amList = useList<any>({ resource: "appleMusicAlbums", hasPagination: false })
  const createOne = useCreate()
  const updateOne = useUpdate()
  const deleteOne = useDelete()

  const [albums, setAlbums] = useState<Album[]>([])
  const [dicts, setDicts] = useState<DictItem[]>([])
  const [amOptions, setAmOptions] = useState<SearchSelectOption[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [query, setQuery] = useState("")

  const typeLabelByCode = useMemo(() => {
    const map = new Map<string, string>()
    dicts.filter((d) => d.category === "album_type").forEach((d) => map.set(d.code, d.label))
    return map
  }, [dicts])

  useEffect(() => {
    const rows = albumList.data?.data || []
    if (rows.length === 0) return
    setAlbums((prev) => (prev.length > 0 ? prev : rows))
    setSelectedId((prev) => (prev ? prev : String(rows[0].id)))
  }, [albumList.data])

  useEffect(() => {
    const rows = dictList.data?.data || []
    if (rows.length === 0) return
    setDicts((prev) => (prev.length > 0 ? prev : rows))
  }, [dictList.data])

  useEffect(() => {
    const rows = amList.data?.data || []
    if (rows.length === 0) return
    setAmOptions(
      rows
        .map((a: any) => ({
          value: String(a.id),
          label: `${String(a.album_name || "")} — ${String(a.artist_name || "")}`.trim(),
        }))
        .filter((o: any) => o.value && o.label),
    )
  }, [amList.data])

  const handleSave = async () => {
    const invalid = albums.filter((a) => !String(a.name || "").trim())
    if (invalid.length > 0) {
      toast.error(`有 ${invalid.length} 筆專輯缺少名稱`)
      return
    }

    const toCreate = albums.filter((a) => String(a.id).startsWith("album-"))
    const toUpdate = albums.filter((a) => !String(a.id).startsWith("album-"))
    const toDelete = deletedIds.filter((id) => !String(id).startsWith("album-"))

    await toast.promise(
      (async () => {
        for (const id of toDelete) {
          await deleteOne.mutateAsync({ resource: "albums", id })
        }
        for (const row of toUpdate) {
          await updateOne.mutateAsync({
            resource: "albums",
            id: row.id,
            values: {
              name: row.name,
              type: row.type,
              apple_music_album_id: row.apple_music_album_id || null,
              hide_date: !!row.hide_date,
            },
          })
        }
        for (const row of toCreate) {
          await createOne.mutateAsync({
            resource: "albums",
            values: {
              name: row.name,
              type: row.type,
              apple_music_album_id: row.apple_music_album_id || null,
              hide_date: !!row.hide_date,
            },
          })
        }
        await invalidate({ resource: "albums", invalidates: ["list"] })
      })(),
      {
        loading: "儲存中...",
        success: () => {
          setDeletedIds([])
          return "儲存成功！"
        },
        error: (e) => `儲存失敗：${String((e as any)?.message || e)}`,
      },
    )
  }

  const handleAdd = () => {
    const newId = `album-${Date.now()}`
    const next: Album = { id: newId, name: "", type: "", hide_date: false }
    setAlbums((prev) => [...prev, next])
    setSelectedId(newId)
    setQuery("")
  }

  const handleDeleteSelected = () => {
    if (!selectedId) return
    setAlbums((prev) => {
      const idx = prev.findIndex((a) => a.id === selectedId)
      if (idx < 0) return prev
      const row = prev[idx]
      if (row && !String(row.id).startsWith("album-")) {
        setDeletedIds((p) => [...p, String(row.id)])
      }
      const next = [...prev]
      next.splice(idx, 1)
      const fallback = next[idx]?.id || next[idx - 1]?.id || ""
      setSelectedId(fallback ? String(fallback) : "")
      return next
    })
  }

  const selected = useMemo(() => albums.find((a) => a.id === selectedId) || null, [albums, selectedId])

  const updateSelected = (patch: Partial<Album>) => {
    if (!selected) return
    setAlbums((prev) => prev.map((a) => (a.id === selected.id ? { ...a, ...patch } : a)))
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return albums
    return albums.filter((a) => {
      return String(a.name || "").toLowerCase().includes(q) || String(a.id || "").toLowerCase().includes(q)
    })
  }, [albums, query])

  const groups = useMemo(() => {
    const map = new Map<string, Album[]>()
    filtered.forEach((a) => {
      const label = typeLabelByCode.get(a.type) || "未分類"
      const list = map.get(label) || []
      list.push(a)
      map.set(label, list)
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, list]) => ({
        key: k,
        items: [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
      }))
  }, [filtered, typeLabelByCode])

  return (
    <AdminSplitView
      title="專輯管理"
      description="左側列表（搜尋+分組），右側維護專輯細節。"
      actions={
        <>
          <Button variant="neutral" onClick={handleAdd} className="border-2 border-black">
            新增
          </Button>
          <Button onClick={handleSave} className="border-2 border-black" disabled={albumList.isLoading || dictList.isLoading || amList.isLoading}>
            儲存
          </Button>
        </>
      }
      leftSearchValue={query}
      onLeftSearchValueChange={setQuery}
      leftSearchPlaceholder="搜尋專輯..."
      groups={groups}
      getKey={(a) => a.id}
      renderItemTitle={(a) => a.name || "(未命名)"}
      renderItemSubtitle={(a) => a.type || "none"}
      selectedKey={selectedId || null}
      onSelect={setSelectedId}
      leftEmpty={<div className="p-3 text-xs font-mono opacity-60">{albumList.isLoading ? "載入中..." : "無資料"}</div>}
      rightEmpty={<div className="text-xs font-mono opacity-60">選擇左側專輯以編輯</div>}
      right={
        !selected ? null : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-black break-words">{selected.name || "(未命名)"}</div>
                <div className="text-[10px] font-mono opacity-60 break-all">ID: {selected.id}</div>
              </div>
              <Button variant="destructive" onClick={handleDeleteSelected} className="border-2 border-black">
                刪除
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">Album Name</div>
                <Input value={selected.name} onChange={(e) => updateSelected({ name: e.target.value })} className="border-2 border-black font-bold h-9" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">Type</div>
                <Select value={selected.type || ""} onValueChange={(v) => updateSelected({ type: v })}>
                  <SelectTrigger className="border-2 border-black font-bold h-9 rounded-none">
                    <SelectValue placeholder="選擇分類" />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-black rounded-none">
                    {dicts
                      .filter((d) => d.category === "album_type")
                      .map((d) => (
                        <SelectItem key={d.id} value={d.code}>
                          {d.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">Apple Music Album</div>
                <SearchSelect
                  options={amOptions}
                  value={selected.apple_music_album_id || null}
                  onChange={(v) => updateSelected({ apple_music_album_id: v || undefined })}
                  placeholder="搜尋 Apple Music 專輯..."
                />
              </div>

              <div className="flex items-center justify-between border-2 border-black p-3 bg-card">
                <div className="flex flex-col">
                  <div className="text-xs font-black tracking-widest">隱藏日期</div>
                  <div className="text-[10px] font-mono opacity-60">hide_date</div>
                </div>
                <Switch checked={!!selected.hide_date} onCheckedChange={(c) => updateSelected({ hide_date: c })} />
              </div>
            </div>
          </>
        )
      }
    />
  )
}
