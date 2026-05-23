import React, { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useCreate, useDelete, useInvalidate, useList, useUpdate } from "@refinedev/core"

import { AdminSplitView } from "@/components/admin/AdminSplitView"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export type ArtistRow = {
  id: string
  name: string
  twitter?: string
  profile_url?: string
  bio?: string
  instagram?: string
  youtube?: string
  pixiv?: string
  tiktok?: string
  website?: string
}

export function AdminArtistsPage() {
  const invalidate = useInvalidate()
  const listQuery = useList<ArtistRow>({ resource: "artists", hasPagination: false })
  const createOne = useCreate()
  const updateOne = useUpdate()
  const deleteOne = useDelete()

  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [query, setQuery] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const hydrateArtists = useCallback((rows: ArtistRow[]) => {
    setArtists(rows)
    setSelectedId((prev) => (rows.some((row) => String(row.id) === prev) ? prev : String(rows[0]?.id || "")))
  }, [])

  useEffect(() => {
    const rows = listQuery.data?.data || []
    hydrateArtists(rows)
  }, [hydrateArtists, listQuery.data])

  const selected = useMemo(() => artists.find((a) => a.id === selectedId) || null, [artists, selectedId])

  const updateSelected = (patch: Partial<ArtistRow>) => {
    if (!selected) return
    setArtists((prev) => prev.map((a) => (a.id === selected.id ? { ...a, ...patch } : a)))
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return artists
    return artists.filter((a) => {
      return (
        String(a.name || "").toLowerCase().includes(q) ||
        String(a.twitter || "").toLowerCase().includes(q) ||
        String(a.instagram || "").toLowerCase().includes(q) ||
        String(a.pixiv || "").toLowerCase().includes(q)
      )
    })
  }, [artists, query])

  const groups = useMemo(() => {
    const map = new Map<string, ArtistRow[]>()
    filtered.forEach((a) => {
      const first = String(a.name || "").trim().slice(0, 1).toUpperCase()
      const key = first >= "A" && first <= "Z" ? first : "#"
      const list = map.get(key) || []
      list.push(a)
      map.set(key, list)
    })
    return Array.from(map.entries())
      .sort((a, b) => {
        if (a[0] === "#") return 1
        if (b[0] === "#") return -1
        return a[0].localeCompare(b[0])
      })
      .map(([k, list]) => ({
        key: k,
        items: [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
      }))
  }, [filtered])

  const isNew = (id: string) => String(id).startsWith("artist-")

  const handleAdd = () => {
    const newId = `artist-${Date.now()}`
    setArtists((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        twitter: "",
        profile_url: "",
        bio: "",
        instagram: "",
        youtube: "",
        pixiv: "",
        tiktok: "",
        website: "",
      },
    ])
    setSelectedId(newId)
    setQuery("")
  }

  const handleSaveSelected = async () => {
    if (!selected) return
    if (!String(selected.name || "").trim()) {
      toast.error("請輸入畫師名稱")
      return
    }

    // Check duplicate name
    const dup = artists.find((a) => a.id !== selected.id && String(a.name).trim() === String(selected.name).trim())
    if (dup) {
      toast.error(`畫師名稱重複：${dup.name}`)
      return
    }

    const values = {
      name: selected.name,
      twitter: selected.twitter,
      profile_url: selected.profile_url,
      bio: selected.bio,
      instagram: selected.instagram,
      youtube: selected.youtube,
      pixiv: selected.pixiv,
      tiktok: selected.tiktok,
      website: selected.website,
    }

    setIsSaving(true)
    try {
      if (isNew(selected.id)) {
        const result = await createOne.mutateAsync({ resource: "artists", values })
        toast.success("新增成功")
        await invalidate({ resource: "artists", invalidates: ["list"] })
        const refreshed = await listQuery.refetch()
        const rows = (refreshed.data?.data || []) as ArtistRow[]
        setArtists(rows)
        // Select the newly created artist
        const newId = (result?.data as any)?.id
        if (newId) setSelectedId(String(newId))
      } else {
        await updateOne.mutateAsync({ resource: "artists", id: selected.id, values })
        toast.success("儲存成功")
        await invalidate({ resource: "artists", invalidates: ["list"] })
        const refreshed = await listQuery.refetch()
        setArtists((refreshed.data?.data || []) as ArtistRow[])
      }
    } catch (e: any) {
      toast.error(`儲存失敗：${e?.message || String(e)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (!selected) return
    if (!confirm(`確定要刪除「${selected.name || "(未命名)"}」嗎？`)) return

    if (!isNew(selected.id)) {
      try {
        await deleteOne.mutateAsync({ resource: "artists", id: selected.id })
        toast.success("已刪除")
      } catch (e: any) {
        toast.error(`刪除失敗：${e?.message || String(e)}`)
        return
      }
    }

    setArtists((prev) => prev.filter((a) => a.id !== selected.id))
    setSelectedId("")
    await invalidate({ resource: "artists", invalidates: ["list"] })
  }

  return (
    <AdminSplitView
      title="畫師管理"
      description="左側列表（搜尋+分組），右側維護畫師資料。"
      actions={
        <Button variant="neutral" onClick={handleAdd} className="border-2 border-black">
          新增
        </Button>
      }
      leftSearchValue={query}
      onLeftSearchValueChange={setQuery}
      leftSearchPlaceholder="搜尋畫師..."
      groups={groups}
      getKey={(a) => a.id}
      renderItemTitle={(a) => a.name || "(未命名)"}
      renderItemSubtitle={(a) => `${a.twitter ? `@${a.twitter}` : ""} ${a.pixiv ? `pixiv:${a.pixiv}` : ""}`}
      selectedKey={selectedId || null}
      onSelect={setSelectedId}
      leftEmpty={<div className="p-3 text-xs font-mono opacity-60">{listQuery.isLoading ? "載入中..." : "無資料"}</div>}
      rightEmpty={<div className="text-xs font-mono opacity-60">選擇左側項目以編輯</div>}
      right={
        !selected ? null : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-black break-words">{selected.name || "(未命名)"}</div>
                <div className="text-[10px] font-mono opacity-60 break-all">ID: {selected.id}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="destructive" onClick={() => void handleDeleteSelected()} className="border-2 border-black">
                  刪除
                </Button>
                <Button onClick={() => void handleSaveSelected()} className="border-2 border-black" disabled={isSaving}>
                  {isSaving ? "儲存中..." : isNew(selected.id) ? "新增" : "儲存"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 md:col-span-2">
                <div className="text-[10px] font-black uppercase opacity-70">Name</div>
                <Input value={selected.name} onChange={(e) => updateSelected({ name: e.target.value })} className="border-2 border-black font-bold h-9" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">Twitter</div>
                <Input
                  value={selected.twitter || ""}
                  onChange={(e) => updateSelected({ twitter: e.target.value })}
                  className="border-2 border-black font-bold h-9"
                  placeholder="username"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">Avatar URL</div>
                <Input value={selected.profile_url || ""} onChange={(e) => updateSelected({ profile_url: e.target.value })} className="border-2 border-black font-bold h-9" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">Instagram</div>
                <Input value={selected.instagram || ""} onChange={(e) => updateSelected({ instagram: e.target.value })} className="border-2 border-black font-bold h-9" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">YouTube</div>
                <Input value={selected.youtube || ""} onChange={(e) => updateSelected({ youtube: e.target.value })} className="border-2 border-black font-bold h-9" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">Pixiv</div>
                <Input value={selected.pixiv || ""} onChange={(e) => updateSelected({ pixiv: e.target.value })} className="border-2 border-black font-bold h-9" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">TikTok</div>
                <Input value={selected.tiktok || ""} onChange={(e) => updateSelected({ tiktok: e.target.value })} className="border-2 border-black font-bold h-9" />
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <div className="text-[10px] font-black uppercase opacity-70">Website</div>
                <Input value={selected.website || ""} onChange={(e) => updateSelected({ website: e.target.value })} className="border-2 border-black font-bold h-9" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-black uppercase opacity-70">Bio</div>
              <Textarea value={selected.bio || ""} onChange={(e) => updateSelected({ bio: e.target.value })} className="border-2 border-black min-h-[140px]" />
            </div>
          </>
        )
      }
    />
  )
}
