import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useList } from "@refinedev/core"

import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getAllAnnotations,
  getAnnotationsByMv,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getR2Domain,
  type MediaAnnotationRow,
  type CreateAnnotationPayload,
} from "@/lib/admin-api"
import type { MVItem } from "@/lib/types"

type AnnotationWithMedia = MediaAnnotationRow & {
  mediaUrl?: string
  mediaThumbnail?: string
  mvTitle?: string
  mvId?: string
}

const STYLE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "highlight", label: "Highlight" },
  { value: "subtle", label: "Subtle" },
  { value: "accent", label: "Accent" },
]

function CoordinatePicker({
  imageUrl,
  x,
  y,
  onPositionChange,
}: {
  imageUrl: string
  x: number
  y: number
  onPositionChange: (x: number, y: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const offsetX = e.clientX - rect.left
      const offsetY = e.clientY - rect.top
      const pctX = Math.round((offsetX / rect.width) * 10000) / 100
      const pctY = Math.round((offsetY / rect.height) * 10000) / 100
      onPositionChange(
        Math.max(0, Math.min(100, pctX)),
        Math.max(0, Math.min(100, pctY)),
      )
    },
    [onPositionChange],
  )

  return (
    <div
      ref={containerRef}
      className="relative cursor-crosshair border-2 border-black bg-muted overflow-hidden select-none"
      onClick={handleClick}
    >
      <img
        src={imageUrl}
        alt="Annotation target"
        className="w-full h-auto block"
        draggable={false}
      />
      {x >= 0 && y >= 0 ? (
        <div
          className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-red-500 bg-red-500/30 animate-pulse" />
          <div className="absolute inset-1 rounded-full bg-red-500" />
        </div>
      ) : null}
    </div>
  )
}

function AnnotationForm({
  annotation,
  mediaItems,
  mvData,
  initialMvId,
  onSave,
  onCancel,
  isSaving,
}: {
  annotation: Partial<AnnotationWithMedia> | null
  mediaItems: Array<{ id: string; url: string; thumbnail_url?: string; caption?: string; mvTitle?: string; mvId?: string }>
  mvData: Array<{ id: string; title: string }>
  initialMvId: string
  onSave: (data: CreateAnnotationPayload) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const isEditing = !!annotation?.id
  const [step, setStep] = useState(isEditing ? 2 : 0)
  const [formMvId, setFormMvId] = useState(initialMvId || "")
  const [mediaId, setMediaId] = useState(annotation?.media_id || "")
  const [label, setLabel] = useState(annotation?.label || "")
  const [x, setX] = useState(Number(annotation?.x) || 0)
  const [y, setY] = useState(Number(annotation?.y) || 0)
  const [style, setStyle] = useState(annotation?.style || "default")
  const [sortOrder, setSortOrder] = useState(annotation?.sort_order ?? 0)

  const filteredMedia = useMemo(
    () => (formMvId ? mediaItems.filter((m) => m.mvId === formMvId) : []),
    [mediaItems, formMvId],
  )

  const selectedMedia = useMemo(
    () => mediaItems.find((m) => m.id === mediaId),
    [mediaItems, mediaId],
  )

  const r2Domain = useMemo(() => getR2Domain(), [])

  const resolveUrl = useCallback(
    (raw: string | undefined) => {
      if (!raw) return ""
      if (raw.startsWith("http")) return raw
      return `${r2Domain}/${raw.replace(/^\/+/, "")}`
    },
    [r2Domain],
  )

  const imageUrl = useMemo(() => {
    if (selectedMedia) return resolveUrl(selectedMedia.url || selectedMedia.thumbnail_url)
    if (isEditing && annotation?.mediaUrl) return annotation.mediaUrl
    if (isEditing && annotation?.mediaThumbnail) return annotation.mediaThumbnail
    return ""
  }, [resolveUrl, selectedMedia, isEditing, annotation])

  const handlePositionChange = useCallback((newX: number, newY: number) => {
    setX(newX)
    setY(newY)
  }, [])

  const handleSelectMv = useCallback((mvId: string) => {
    setFormMvId(mvId)
    setStep(1)
  }, [])

  const handleSelectMedia = useCallback((id: string) => {
    setMediaId(id)
    setX(0)
    setY(0)
    setStep(2)
  }, [])

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1))
  }, [])

  const handleSubmit = useCallback(() => {
    if (!mediaId.trim()) {
      toast.error("請選擇媒體")
      return
    }
    if (!label.trim()) {
      toast.error("請輸入標註文字")
      return
    }
    onSave({
      media_id: mediaId,
      label: label.trim(),
      x,
      y,
      style: style || "default",
      sort_order: sortOrder,
    })
  }, [label, mediaId, onSave, sortOrder, style, x, y])

  if (step === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-[10px] font-black uppercase opacity-70">
          Step 1 — 選擇 MV
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[60vh] overflow-auto">
          {mvData.map((mv) => (
            <button
              key={mv.id}
              type="button"
              onClick={() => handleSelectMv(mv.id)}
              className="border-2 border-black/20 hover:border-black bg-muted px-3 py-2 text-left transition-colors"
            >
              <div className="text-xs font-bold truncate">{mv.title}</div>
            </button>
          ))}
        </div>
        {mvData.length === 0 && (
          <div className="border-2 border-dashed border-black/30 p-6 text-center text-xs font-mono opacity-60">
            無可用 MV
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="neutral" onClick={onCancel} className="border-2 border-black">
            取消
          </Button>
        </div>
      </div>
    )
  }

  if (step === 1) {
    const selectedMv = mvData.find((m) => m.id === formMvId)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button variant="neutral" size="sm" onClick={handleBack} className="border-2 border-black text-xs h-7">
            ← 返回選 MV
          </Button>
          <div className="text-[10px] font-black uppercase opacity-70">
            Step 2 — 選擇圖片{selectedMv ? ` (${selectedMv.title})` : ""}
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-[60vh] overflow-auto">
          {filteredMedia.map((m) => {
            const thumb = resolveUrl(m.thumbnail_url || m.url)
            const isSelected = m.id === mediaId
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMedia(m.id)}
                className={`relative border-2 ${isSelected ? "border-black" : "border-black/20"} bg-muted overflow-hidden aspect-square group`}
              >
                {thumb ? (
                  <img src={thumb} alt="" className="w-full h-full object-cover" draggable={false} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] font-mono opacity-40">N/A</div>
                )}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-black text-white flex items-center justify-center text-xs font-bold">✓</div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white px-1 py-0.5">
                  {m.caption && <div className="text-[8px] opacity-70 truncate">{m.caption}</div>}
                </div>
              </button>
            )
          })}
        </div>
        {filteredMedia.length === 0 && (
          <div className="border-2 border-dashed border-black/30 p-6 text-center text-xs font-mono opacity-60">
            此 MV 無可用媒體
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="neutral" onClick={onCancel} className="border-2 border-black">
            取消
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {!isEditing && (
          <Button variant="neutral" size="sm" onClick={handleBack} className="border-2 border-black text-xs h-7">
            ← 返回選圖
          </Button>
        )}
        <div className="text-[10px] font-black uppercase opacity-70">
          Step 3 — 定位與標註
        </div>
      </div>

      {imageUrl ? (
        <div className="flex flex-col gap-1">
          <CoordinatePicker
            imageUrl={imageUrl}
            x={x}
            y={y}
            onPositionChange={handlePositionChange}
          />
        </div>
      ) : (
        <div className="border-2 border-dashed border-black/30 p-6 text-center text-xs font-mono opacity-60">
          無法載入圖片
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1 md:col-span-2">
          <div className="text-[10px] font-black uppercase opacity-70">Label</div>
          <Textarea
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="border-2 border-black font-bold min-h-[80px] resize-y"
            placeholder="標註文字（支援換行）"
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-black uppercase opacity-70">Style</div>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger className="border-2 border-black font-bold h-9 rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-2 border-black rounded-none">
              {STYLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-black uppercase opacity-70">X Position (%)</div>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
            className="border-2 border-black font-bold h-9"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-black uppercase opacity-70">Y Position (%)</div>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
            className="border-2 border-black font-bold h-9"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-black uppercase opacity-70">Sort Order</div>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="border-2 border-black font-bold h-9"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="neutral" onClick={onCancel} className="border-2 border-black">
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving} className="border-2 border-black">
          {isSaving ? "儲存中..." : annotation?.id ? "更新" : "建立"}
        </Button>
      </div>
    </div>
  )
}

export function AdminAnnotationsPage() {
  const mvList = useList<MVItem>({ resource: "mvs", hasPagination: false })

  const [annotations, setAnnotations] = useState<AnnotationWithMedia[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMvId, setSelectedMvId] = useState<string>("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAnnotation, setEditingAnnotation] = useState<AnnotationWithMedia | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const r2Domain = useMemo(() => getR2Domain(), [])

  const mvData = useMemo(() => mvList.data?.data || [], [mvList.data])

  const mediaItems = useMemo(() => {
    if (!selectedMvId) {
      return mvData.flatMap((mv) =>
        (mv.images || []).filter((img) => img.usage !== 'cover').map((img) => ({
          id: img.id || img.url,
          url: img.url,
          thumbnail_url: img.thumbnail_url,
          caption: img.caption,
          mvTitle: mv.title,
          mvId: mv.id,
        })),
      )
    }
    const mv = mvData.find((m) => m.id === selectedMvId)
    if (!mv) return []
    return (mv.images || []).filter((img) => img.usage !== 'cover').map((img) => ({
      id: img.id || img.url,
      url: img.url,
      thumbnail_url: img.thumbnail_url,
      caption: img.caption,
      mvTitle: mv.title,
      mvId: mv.id,
    }))
  }, [mvData, selectedMvId])

  const mediaLookup = useMemo(() => {
    const map = new Map<string, { url?: string; thumbnail_url?: string; caption?: string; mvTitle?: string; mvId?: string }>()
    for (const item of mediaItems) {
      map.set(item.id, item)
    }
    return map
  }, [mediaItems])

  const resolveMediaUrl = useCallback(
    (raw: string | undefined, preferThumbnail?: boolean) => {
      if (!raw) return ""
      if (raw.startsWith("http")) return raw
      return `${r2Domain}/${raw.replace(/^\/+/, "")}`
    },
    [r2Domain],
  )

  const loadAnnotations = useCallback(async () => {
    setIsLoading(true)
    try {
      if (selectedMvId) {
        const grouped = await getAnnotationsByMv(selectedMvId)
        const mv = mvData.find((m) => m.id === selectedMvId)
        const all: AnnotationWithMedia[] = []
        for (const [mediaId, items] of Object.entries(grouped)) {
          const media = mv?.images?.find((img) => (img.id || img.url) === mediaId)
          if (media?.usage === 'cover') continue
          for (const a of items) {
            all.push({
              ...a,
              mediaUrl: resolveMediaUrl(media?.url),
              mediaThumbnail: resolveMediaUrl(media?.thumbnail_url),
              mvTitle: mv?.title,
              mvId: mv?.id,
            })
          }
        }
        all.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        setAnnotations(all)
      } else {
        const grouped = await getAllAnnotations()
        const all: AnnotationWithMedia[] = []
        for (const [mediaId, items] of Object.entries(grouped)) {
          let foundMedia: { url?: string; thumbnail_url?: string; caption?: string; mvTitle?: string; mvId?: string; usage?: string } | undefined
          for (const mv of mvData) {
            const media = mv.images?.find((img) => (img.id || img.url) === mediaId)
            if (media) {
              foundMedia = { ...media, mvTitle: mv.title, mvId: mv.id }
              break
            }
          }
          if (foundMedia?.usage === 'cover') continue
          for (const a of items) {
            all.push({
              ...a,
              mediaUrl: resolveMediaUrl(foundMedia?.url),
              mediaThumbnail: resolveMediaUrl(foundMedia?.thumbnail_url),
              mvTitle: foundMedia?.mvTitle,
              mvId: foundMedia?.mvId,
            })
          }
        }
        all.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        setAnnotations(all)
      }
    } catch (e: any) {
      toast.error(`載入標註失敗：${String(e?.message || e)}`)
    } finally {
      setIsLoading(false)
    }
  }, [mvData, resolveMediaUrl, selectedMvId])

  useEffect(() => {
    if (mvData.length === 0) return
    loadAnnotations()
  }, [mvData.length, selectedMvId])

  const groupedByMv = useMemo(() => {
    const map = new Map<string, AnnotationWithMedia[]>()
    for (const a of annotations) {
      const key = a.mvTitle || a.mvId || "Unknown"
      const list = map.get(key) || []
      list.push(a)
      map.set(key, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [annotations])

  const handleCreate = useCallback(() => {
    setEditingAnnotation(null)
    setIsFormOpen(true)
  }, [])

  const handleEdit = useCallback((annotation: AnnotationWithMedia) => {
    setEditingAnnotation(annotation)
    setIsFormOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("確定要刪除此標註嗎？")) return
      try {
        await deleteAnnotation(id)
        toast.success("標註已刪除")
        await loadAnnotations()
      } catch (e: any) {
        toast.error(`刪除失敗：${String(e?.message || e)}`)
      }
    },
    [loadAnnotations],
  )

  const handleSave = useCallback(
    async (data: CreateAnnotationPayload) => {
      setIsSaving(true)
      try {
        if (editingAnnotation?.id) {
          await updateAnnotation(editingAnnotation.id, data)
          toast.success("標註已更新")
        } else {
          await createAnnotation(data)
          toast.success("標註已建立")
        }
        setIsFormOpen(false)
        setEditingAnnotation(null)
        await loadAnnotations()
      } catch (e: any) {
        toast.error(`儲存失敗：${String(e?.message || e)}`)
      } finally {
        setIsSaving(false)
      }
    },
    [editingAnnotation, loadAnnotations],
  )

  const handleCancel = useCallback(() => {
    setIsFormOpen(false)
    setEditingAnnotation(null)
  }, [])

  return (
    <div className="p-6 flex flex-col gap-4">
      <AdminPageHeader
        title="標註管理"
        description="管理媒體圖片上的標註位置與文字。"
        actions={
          <>
            <Button onClick={handleCreate} className="border-2 border-black">
              新增標註
            </Button>
          </>
        }
      />

      <AdminPanel>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-black uppercase opacity-70 whitespace-nowrap">
              Filter by MV
            </div>
            <Select value={selectedMvId} onValueChange={(v) => setSelectedMvId(v === "__all__" ? "" : v)}>
              <SelectTrigger className="border-2 border-black font-bold h-9 rounded-none w-[300px]">
                <SelectValue placeholder="全部 MV" />
              </SelectTrigger>
              <SelectContent className="border-2 border-black rounded-none">
                <SelectItem value="__all__">全部 MV</SelectItem>
                {mvData.map((mv) => (
                  <SelectItem key={mv.id} value={mv.id}>
                    {mv.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="p-4 text-xs font-mono opacity-60">載入中...</div>
          ) : annotations.length === 0 ? (
            <div className="p-4 text-xs font-mono opacity-60">無標註資料</div>
          ) : (
            groupedByMv.map(([mvTitle, items]) => (
              <div key={mvTitle} className="flex flex-col gap-2">
                <div className="text-xs font-black uppercase tracking-widest opacity-70 border-b-2 border-black/10 pb-1">
                  {mvTitle} <span className="opacity-40">({items.length})</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">縮圖</TableHead>
                      <TableHead>標註文字</TableHead>
                      <TableHead>位置</TableHead>
                      <TableHead>樣式</TableHead>
                      <TableHead>排序</TableHead>
                      <TableHead className="w-[120px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          {a.mediaThumbnail || a.mediaUrl ? (
                            <img
                              src={a.mediaThumbnail || a.mediaUrl}
                              alt=""
                              className="w-12 h-12 object-cover border border-black"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted border border-black flex items-center justify-center text-[8px] font-mono">
                              N/A
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-bold">{a.label}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {Number(a.x).toFixed(1)}%, {Number(a.y).toFixed(1)}%
                        </TableCell>
                        <TableCell>{a.style || "default"}</TableCell>
                        <TableCell>{a.sort_order ?? 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="neutral"
                              size="sm"
                              onClick={() => handleEdit(a)}
                              className="border-2 border-black text-xs h-7"
                            >
                              編輯
                            </Button>
                            <Button
                              variant="neutral"
                              size="sm"
                              onClick={() => void handleDelete(a.id)}
                              className="border-2 border-red-600 text-red-600 text-xs h-7 hover:bg-red-600 hover:text-white"
                            >
                              刪除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </div>
      </AdminPanel>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleCancel() }}>
        <DialogContent className="md:max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingAnnotation ? "編輯標註" : "新增標註"}</DialogTitle>
          </DialogHeader>
          <AnnotationForm
            annotation={editingAnnotation}
            mediaItems={mediaItems}
            mvData={mvData.map((mv) => ({ id: mv.id, title: mv.title }))}
            initialMvId={selectedMvId}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
