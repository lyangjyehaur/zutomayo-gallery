import React from "react"
import { toast } from "sonner"
import { adminFetch, getApiRoot } from "@/lib/admin-api"
import { getProxyImgUrl } from "@/lib/image"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type PreviewResult = {
  group_id: string
  source_url: string
  current: Record<string, any>
  parsed: Record<string, any>
  diff: string[]
  media_updates: Array<{
    media_id: string
    action: "update"
    current: Record<string, any>
    parsed: Record<string, any>
    diff: string[]
  }>
  media_new: Array<{
    action: "create"
    parsed: { url: string; original_url: string; thumbnail_url: string | null; media_type: string }
  }>
}

type PreviewError = { group_id: string; error: string }

type ReparsePreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupIds: string[]
  defaultOverwrite?: boolean
  onComplete: () => void
}

const FIELD_LABELS: Record<string, string> = {
  source_url: "source_url",
  source_text: "推文內容",
  author_name: "作者名稱",
  author_handle: "作者帳號",
  post_date: "發布時間",
  like_count: "喜歡數",
  retweet_count: "轉推數",
  view_count: "觀看數",
  hashtags: "標籤",
  thumbnail_url: "縮圖",
  media_type: "媒體類型",
  url: "URL",
  original_url: "原始 URL",
}

const formatValue = (v: any): string => {
  if (v === null || v === undefined) return "(空)"
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "(空)"
  if (typeof v === "string" && v.includes("T") && !isNaN(Date.parse(v))) {
    try {
      return new Date(v).toLocaleString()
    } catch {
      return v
    }
  }
  return String(v)
}

export function ReparsePreviewDialog({
  open,
  onOpenChange,
  groupIds,
  defaultOverwrite = true,
  onComplete,
}: ReparsePreviewDialogProps) {
  const base = React.useMemo(() => getApiRoot(), [])
  const [overwrite, setOverwrite] = React.useState(defaultOverwrite)
  const [loading, setLoading] = React.useState(false)
  const [applying, setApplying] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [results, setResults] = React.useState<PreviewResult[]>([])
  const [errors, setErrors] = React.useState<PreviewError[]>([])
  const [selectedGroupFields, setSelectedGroupFields] = React.useState<Record<string, boolean>>({})
  const [selectedMediaFields, setSelectedMediaFields] = React.useState<Record<string, boolean>>({})
  const [selectedNewUrls, setSelectedNewUrls] = React.useState<Record<string, boolean>>({})
  const [applyProgress, setApplyProgress] = React.useState<string | null>(null)

  // 當 open 或 groupIds 變化時重新預覽
  React.useEffect(() => {
    if (!open || groupIds.length === 0) {
      setResults([])
      setErrors([])
      setSelectedGroupFields({})
      setSelectedMediaFields({})
      setSelectedNewUrls({})
      return
    }
    setOverwrite(defaultOverwrite)
  }, [open, groupIds, defaultOverwrite])

  const fetchPreview = React.useCallback(async () => {
    if (groupIds.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch(`${base}/system/media/groups/reparse-twitter/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_ids: groupIds, overwrite }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "PREVIEW_FAILED"))
      setResults(Array.isArray(json?.data?.results) ? json.data.results : [])
      setErrors(Array.isArray(json?.data?.errors) ? json.data.errors : [])
      // 預設全選所有可套用項目
      const allGroupFields: Record<string, boolean> = {}
      const allMediaFields: Record<string, boolean> = {}
      const allNew: Record<string, boolean> = {}
      ;(json?.data?.results || []).forEach((r: PreviewResult) => {
        ;(r.diff || []).forEach((field) => {
          allGroupFields[`${r.group_id}:${field}`] = true
        })
        ;(r.media_updates || []).forEach((m) => {
          ;(m.diff || []).forEach((field) => {
            allMediaFields[`${m.media_id}:${field}`] = true
          })
        })
        ;(r.media_new || []).forEach((m: any) => {
          allNew[m.parsed.url] = true
        })
      })
      setSelectedGroupFields(allGroupFields)
      setSelectedMediaFields(allMediaFields)
      setSelectedNewUrls(allNew)
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [base, groupIds, overwrite])

  React.useEffect(() => {
    if (open && groupIds.length > 0) {
      void fetchPreview()
    }
  }, [open, fetchPreview])

  // 切換 overwrite 後重新預覽
  const handleOverwriteChange = React.useCallback((checked: boolean) => {
    setOverwrite(checked)
  }, [])

  React.useEffect(() => {
    if (!open || groupIds.length === 0) return
    void fetchPreview()
  }, [overwrite])

  const totalDiffCount = React.useMemo(() => {
    let count = 0
    results.forEach((r) => {
      count += r.diff.length
      count += r.media_updates.reduce((s, m) => s + m.diff.length, 0)
    })
    return count
  }, [results])

  const totalNewMedia = React.useMemo(() => {
    return results.reduce((s, r) => s + r.media_new.length, 0)
  }, [results])

  const selectedNewCount = React.useMemo(() => {
    return Object.values(selectedNewUrls).filter(Boolean).length
  }, [selectedNewUrls])

  const selectedDiffCount = React.useMemo(() => {
    return Object.values(selectedGroupFields).filter(Boolean).length + Object.values(selectedMediaFields).filter(Boolean).length
  }, [selectedGroupFields, selectedMediaFields])

  const allNewSelected = React.useMemo(() => {
    return totalNewMedia > 0 && selectedNewCount === totalNewMedia
  }, [totalNewMedia, selectedNewCount])

  const toggleSelectAllNew = React.useCallback(() => {
    const next: Record<string, boolean> = {}
    if (!allNewSelected) {
      results.forEach((r) => {
        r.media_new.forEach((m) => {
          next[m.parsed.url] = true
        })
      })
    }
    setSelectedNewUrls(next)
  }, [allNewSelected, results])

  const doApply = React.useCallback(
    async (includeNewMedia: boolean) => {
      setApplying(true)
      setError(null)
      setApplyProgress("正在應用變更...")
      try {
        const body: Record<string, any> = {
          group_ids: groupIds,
          overwrite,
          include_new_media: includeNewMedia,
          selected_group_fields: results.reduce<Record<string, string[]>>((acc, r) => {
            const fields = r.diff.filter((field) => selectedGroupFields[`${r.group_id}:${field}`])
            if (fields.length > 0) acc[r.group_id] = fields
            return acc
          }, {}),
          selected_media_fields: results.reduce<Record<string, string[]>>((acc, r) => {
            r.media_updates.forEach((m) => {
              const fields = m.diff.filter((field) => selectedMediaFields[`${m.media_id}:${field}`])
              if (fields.length > 0) acc[m.media_id] = fields
            })
            return acc
          }, {}),
        }
        if (includeNewMedia) {
          body.new_media_urls = Object.entries(selectedNewUrls)
            .filter(([, v]) => v)
            .map(([k]) => k)
        }
        const res = await adminFetch(`${base}/system/media/groups/reparse-twitter/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) throw new Error(String(json?.error || "APPLY_FAILED"))
        const d = json?.data || {}
        toast.success(
          `完成：${d.updated_groups || 0} groups / ${d.updated_media || 0} media 更新` +
            (d.new_media ? `, ${d.new_media} 新增` : "") +
            (d.r2_backups ? `, ${d.r2_backups} R2 備份` : "") +
            (d.skipped ? `, ${d.skipped} 跳過` : ""),
        )
        setApplyProgress(null)
        onComplete()
        onOpenChange(false)
      } catch (e: any) {
        setError(String(e?.message || e))
        setApplyProgress(null)
      } finally {
        setApplying(false)
      }
    },
    [base, groupIds, overwrite, results, selectedGroupFields, selectedMediaFields, selectedNewUrls, onComplete, onOpenChange],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>推特重新解析預覽</DialogTitle>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>錯誤</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="text-center py-8 text-sm font-mono opacity-60">正在解析推文，請稍候...</div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 控制列 */}
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-mono opacity-70">
                {groupIds.length} 個 group | {selectedDiffCount}/{totalDiffCount} 個變更已選 | {selectedNewCount}/{totalNewMedia} 個新媒體已選
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-mono">只填充空值</div>
                <Switch checked={overwrite} onCheckedChange={handleOverwriteChange} />
                <div className="text-xs font-mono">覆蓋所有值</div>
              </div>
            </div>

            {/* 錯誤列表 */}
            {errors.length > 0 ? (
              <div className="border-2 border-red-400 p-3">
                <div className="text-xs font-bold text-red-600 mb-2">解析失敗</div>
                {errors.map((e, i) => (
                  <div key={i} className="text-xs font-mono">
                    {e.group_id}: {e.error}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Diff 結果 */}
            {results.map((r) => {
              const hasChanges = r.diff.length > 0 || r.media_updates.length > 0 || r.media_new.length > 0
              return (
                <div key={r.group_id} className="border-2 border-black p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-mono font-bold break-all">{r.group_id}</div>
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono underline opacity-70 shrink-0"
                    >
                      Open Tweet
                    </a>
                  </div>

                  {!hasChanges ? (
                    <div className="text-xs font-mono opacity-50">無變更</div>
                  ) : (
                    <>
                      {/* Group Meta Diff */}
                      {r.diff.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          <div className="text-xs font-bold">Group Meta</div>
                          {r.diff.map((field) => {
                            const selectionKey = `${r.group_id}:${field}`
                            const checked = Boolean(selectedGroupFields[selectionKey])
                            return (
                            <div key={field} className="grid grid-cols-[28px_120px_1fr_auto_1fr] gap-2 text-xs font-mono items-start">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) =>
                                  setSelectedGroupFields((prev) => ({ ...prev, [selectionKey]: Boolean(v) }))
                                }
                              />
                              <div className="font-bold opacity-70">{FIELD_LABELS[field] || field}</div>
                              <div className="opacity-50 break-all">{formatValue(r.current[field])}</div>
                              <div className="opacity-40">→</div>
                              <div className="text-green-700 font-bold break-all">{formatValue(r.parsed[field])}</div>
                            </div>
                            )
                          })}
                        </div>
                      ) : null}

                      {/* Media Updates */}
                      {r.media_updates.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          <div className="text-xs font-bold">Media 更新</div>
                          {r.media_updates.map((m) =>
                            m.diff.length > 0 ? (
                              <div key={m.media_id} className="ml-3 flex flex-col gap-1">
                                <div className="text-xs font-mono opacity-60">{m.media_id}</div>
                                {m.diff.map((field) => {
                                  const selectionKey = `${m.media_id}:${field}`
                                  const checked = Boolean(selectedMediaFields[selectionKey])
                                  return (
                                  <div key={field} className="grid grid-cols-[28px_100px_1fr_auto_1fr] gap-2 text-xs font-mono items-start ml-3">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) =>
                                        setSelectedMediaFields((prev) => ({ ...prev, [selectionKey]: Boolean(v) }))
                                      }
                                    />
                                    <div className="opacity-70">{FIELD_LABELS[field] || field}</div>
                                    <div className="opacity-50 break-all">{formatValue(m.current[field])}</div>
                                    <div className="opacity-40">→</div>
                                    <div className="text-green-700 font-bold break-all">
                                      {formatValue(m.parsed[field])}
                                    </div>
                                  </div>
                                  )
                                })}
                              </div>
                            ) : null,
                          )}
                        </div>
                      ) : null}

                      {/* New Media */}
                      {r.media_new.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-bold text-blue-700">新增媒體</div>
                            <Checkbox checked={allNewSelected} onCheckedChange={toggleSelectAllNew} />
                            <div className="text-xs font-mono opacity-50">全選</div>
                          </div>
                          {r.media_new.map((m, mi) => {
                            const url = String(m.parsed.url || "")
                            const thumbUrl = m.parsed.thumbnail_url || url
                            const proxyThumb = thumbUrl ? getProxyImgUrl(thumbUrl) : ""
                            const checked = Boolean(selectedNewUrls[url])
                            return (
                              <div key={mi} className="ml-3 flex items-center gap-3 border-2 border-blue-300 p-2">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) =>
                                    setSelectedNewUrls((prev) => ({ ...prev, [url]: Boolean(v) }))
                                  }
                                />
                                {proxyThumb ? (
                                  <img
                                    src={proxyThumb}
                                    alt="new media"
                                    className="size-12 object-cover border-2 border-black bg-black"
                                    loading="lazy"
                                  />
                                ) : null}
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-mono font-bold">{m.parsed.media_type}</div>
                                  <div className="text-xs font-mono opacity-60 truncate">{url}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )
            })}

            {/* 底部操作 */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t-2 border-black">
              <Button variant="neutral" onClick={() => onOpenChange(false)} className="border-2 border-black">
                取消
              </Button>
              <div className="flex items-center gap-2">
                {totalNewMedia > 0 ? (
                  <>
                    <Button
                      variant="neutral"
                      onClick={() => void doApply(false)}
                      disabled={applying || selectedDiffCount === 0}
                      className="border-2 border-black"
                    >
                      僅更新勾選變更
                    </Button>
                    <Button
                      onClick={() => void doApply(true)}
                      disabled={applying || (selectedDiffCount === 0 && selectedNewCount === 0)}
                    >
                      {applying
                        ? applyProgress || "應用中..."
                        : `更新 ${selectedDiffCount} 個變更 + 新增 ${selectedNewCount} 個媒體`}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => void doApply(false)}
                    disabled={applying || selectedDiffCount === 0}
                  >
                    {applying ? applyProgress || "應用中..." : `應用 ${selectedDiffCount} 個變更`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
