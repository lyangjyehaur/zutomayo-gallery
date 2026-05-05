import React, { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useCreate, useDelete, useInvalidate, useList, useUpdate } from "@refinedev/core"

import { AdminSplitView } from "@/components/admin/AdminSplitView"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export interface DictItem {
  id: string
  category: string
  code: string
  label: string
  description: string
  sort_order: number
}

export function AdminDictsPage() {
  const invalidate = useInvalidate()
  const listQuery = useList<DictItem>({ resource: "dicts", hasPagination: false })
  const createOne = useCreate()
  const updateOne = useUpdate()
  const deleteOne = useDelete()

  const [dicts, setDicts] = useState<DictItem[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [query, setQuery] = useState("")
  const [isDirty, setIsDirty] = useState(false)

  const hydrateDicts = useCallback((rows: DictItem[]) => {
    setDicts(rows)
    setSelectedId((prev) => (rows.some((row) => String(row.id) === prev) ? prev : String(rows[0]?.id || "")))
  }, [])

  useEffect(() => {
    const rows = listQuery.data?.data || []
    if (isDirty) return
    hydrateDicts(rows)
  }, [hydrateDicts, isDirty, listQuery.data])

  const handleSave = async () => {
    const invalid = dicts.filter((d) => {
      const category = String(d.category || "").trim()
      const code = String(d.code || "").trim()
      const label = String(d.label || "").trim()
      return !category || !code || !label
    })
    if (invalid.length > 0) {
      toast.error(`有 ${invalid.length} 筆字典項目缺少 category / code / label`)
      return
    }

    const toCreate = dicts.filter((d) => String(d.id).startsWith("dict-"))
    const toUpdate = dicts.filter((d) => !String(d.id).startsWith("dict-"))
    const toDelete = deletedIds.filter((id) => !String(id).startsWith("dict-"))

    await toast.promise(
      (async () => {
        for (const id of toDelete) {
          await deleteOne.mutateAsync({ resource: "dicts", id })
        }
        for (const row of toUpdate) {
          await updateOne.mutateAsync({
            resource: "dicts",
            id: row.id,
            values: {
              category: row.category,
              code: row.code,
              label: row.label,
              description: row.description,
              sort_order: row.sort_order,
            },
          })
        }

        const created: DictItem[] = []
        for (const row of toCreate) {
          const res = await createOne.mutateAsync({
            resource: "dicts",
            values: {
              category: row.category,
              code: row.code,
              label: row.label,
              description: row.description,
              sort_order: row.sort_order,
            },
          })
          created.push(res.data as any)
        }

        await invalidate({ resource: "dicts", invalidates: ["list"] })
        const refreshed = await listQuery.refetch()
        return refreshed.data?.data || created
      })(),
      {
        loading: "儲存中...",
        success: (rows) => {
          setDeletedIds([])
          setIsDirty(false)
          hydrateDicts(rows as DictItem[])
          return "儲存成功！"
        },
        error: (e) => `儲存失敗：${String((e as any)?.message || e)}`,
      },
    )
  }

  const selected = useMemo(() => dicts.find((d) => d.id === selectedId) || null, [dicts, selectedId])

  const updateSelected = (patch: Partial<DictItem>) => {
    if (!selected) return
    setIsDirty(true)
    setDicts((prev) => prev.map((d) => (d.id === selected.id ? { ...d, ...patch } : d)))
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return dicts
    return dicts.filter((d) => {
      return (
        String(d.category || "").toLowerCase().includes(q) ||
        String(d.code || "").toLowerCase().includes(q) ||
        String(d.label || "").toLowerCase().includes(q) ||
        String(d.description || "").toLowerCase().includes(q)
      )
    })
  }, [dicts, query])

  const groups = useMemo(() => {
    const map = new Map<string, DictItem[]>()
    filtered.forEach((d) => {
      const key = d.category || "(無分類)"
      const list = map.get(key) || []
      list.push(d)
      map.set(key, list)
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, list]) => ({
        key: k,
        items: [...list].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.code.localeCompare(b.code)),
      }))
  }, [filtered])

  const handleAdd = () => {
    const newId = `dict-${Date.now()}`
    const next: DictItem = {
      id: newId,
      category: selected?.category || "",
      code: "",
      label: "",
      description: "",
      sort_order: 0,
    }
    setIsDirty(true)
    setDicts((prev) => [...prev, next])
    setSelectedId(newId)
    setQuery("")
  }

  const handleDeleteSelected = () => {
    if (!selected) return
    setIsDirty(true)
    if (!String(selected.id).startsWith("dict-")) {
      setDeletedIds((prev) => [...prev, String(selected.id)])
    }
    setDicts((prev) => prev.filter((d) => d.id !== selected.id))
    setSelectedId("")
  }

  return (
    <AdminSplitView
      title="字典管理"
      description="左側列表（搜尋+分組 category），右側維護字典項目細節。"
      actions={
        <>
          <Button variant="neutral" onClick={handleAdd} className="border-2 border-black">
            新增
          </Button>
          <Button onClick={handleSave} className="border-2 border-black" disabled={listQuery.isLoading}>
            儲存
          </Button>
        </>
      }
      leftSearchValue={query}
      onLeftSearchValueChange={setQuery}
      leftSearchPlaceholder="搜尋 category / code / label..."
      groups={groups}
      getKey={(d) => d.id}
      renderItemTitle={(d) => d.label || d.code || "(未命名)"}
      renderItemSubtitle={(d) => `${d.category} · ${d.code} · ${d.sort_order || 0}`}
      selectedKey={selectedId || null}
      onSelect={setSelectedId}
      leftEmpty={<div className="p-3 text-xs font-mono opacity-60">{listQuery.isLoading ? "載入中..." : "無資料"}</div>}
      rightEmpty={<div className="text-xs font-mono opacity-60">選擇左側項目以編輯</div>}
      right={
        !selected ? null : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-black break-words">{selected.label || selected.code}</div>
                <div className="text-[10px] font-mono opacity-60 break-all">ID: {selected.id}</div>
              </div>
              <Button variant="destructive" onClick={handleDeleteSelected} className="border-2 border-black">
                刪除
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">Category</div>
                <Input value={selected.category} onChange={(e) => updateSelected({ category: e.target.value })} className="border-2 border-black font-bold h-9" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">Code</div>
                <Input value={selected.code} onChange={(e) => updateSelected({ code: e.target.value })} className="border-2 border-black font-bold h-9" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">Label</div>
                <Input value={selected.label} onChange={(e) => updateSelected({ label: e.target.value })} className="border-2 border-black font-bold h-9" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase opacity-70">Sort</div>
                <Input type="number" value={selected.sort_order || 0} onChange={(e) => updateSelected({ sort_order: parseInt(e.target.value) || 0 })} className="border-2 border-black font-bold h-9" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-black uppercase opacity-70">Description</div>
              <Textarea value={selected.description || ""} onChange={(e) => updateSelected({ description: e.target.value })} className="border-2 border-black min-h-[120px]" />
            </div>
          </>
        )
      }
    />
  )
}
