import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Block,
  BlockTitle,
  Checkbox,
  Link,
  List,
  ListInput,
  ListItem,
  Navbar,
  NavLeft,
  NavRight,
  NavTitle,
  Page,
  Popup,
  Searchbar,
  Sheet,
  Toggle,
  Toolbar,
  ToolbarPane,
  f7,
} from 'framework7-react'
import AppNavbar from '../components/AppNavbar'
import Button from '../components/Button'
import ReviewStateBlock from '../components/ReviewStateBlock'
import ReviewSummaryPanel from '../components/ReviewSummaryPanel'
import ReviewToolbarCard from '../components/ReviewToolbarCard'
import { useWorkspace } from '../hooks/useWorkspace'
import { preferTwimgUrl } from '../lib/media'
import {
  applyRepairReparse,
  fetchMediaGroups,
  fetchRepairGroups,
  mergeRepairGroup,
  previewRepairReparse,
  unassignRepairGroup,
  updateRepairGroup,
  type MediaGroupOption,
  type RepairGroup,
  type RepairReparsePreviewData,
} from '../lib/api'

const PAGE_SIZE = 30
const STATUS_OPTIONS = ['organized', 'unorganized', 'pending', 'deleted', 'rejected']

interface InferredSource {
  url: string
  confidence: 'high' | 'medium' | 'none'
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '未提供'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const getPreviewUrl = (item: RepairGroup) => preferTwimgUrl(item.sample_original_url, item.sample_url, item.preview_url)

const isTwitterUrl = (url?: string | null) => typeof url === 'string' && /(?:twitter\.com|x\.com)/i.test(url)

const inferSource = (row: RepairGroup): InferredSource => {
  const handle = String(row.author_handle || '').trim().replace(/^@/, '')
  const sourceUrl = typeof row.source_url === 'string' ? row.source_url.trim() : ''

  const extract = (raw: string) => {
    const m1 = raw.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([^/?#]+)\/status(?:es)?\/(\d+)/i)
    if (m1) return { handle: m1[1], tweetId: m1[2] }
    const m2 = raw.match(/\/status(?:es)?\/(\d+)/i)
    if (m2) return { handle: '', tweetId: m2[1] }
    const m3 = raw.match(/[?&]tweet_id=(\d+)/i)
    if (m3) return { handle: '', tweetId: m3[1] }
    return null
  }

  if (sourceUrl) {
    const hit = extract(sourceUrl)
    if (hit) {
      const finalHandle = hit.handle || handle
      if (finalHandle) {
        return { url: `https://x.com/${finalHandle}/status/${hit.tweetId}`, confidence: 'high' }
      }
      return { url: sourceUrl, confidence: 'high' }
    }
  }

  const candidates = [row.sample_original_url, row.sample_url, row.preview_url]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)

  for (const raw of candidates) {
    const hit = extract(raw)
    if (!hit) continue
    const finalHandle = hit.handle || handle
    if (finalHandle) {
      return { url: `https://x.com/${finalHandle}/status/${hit.tweetId}`, confidence: 'high' }
    }
    return { url: `https://x.com/i/web/status/${hit.tweetId}`, confidence: 'medium' }
  }

  return { url: '', confidence: 'none' }
}

const buildSearchText = (row: RepairGroup, inferred: InferredSource) => {
  return [
    row.id,
    row.source_url,
    row.source_text,
    row.author_name,
    row.author_handle,
    row.status,
    row.preview_url,
    row.sample_url,
    row.sample_original_url,
    inferred.url,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

const canRepairSource = (row: RepairGroup, inferred: InferredSource) => !row.source_url && inferred.confidence !== 'none' && Boolean(inferred.url)
const canReparse = (row: RepairGroup, inferred: InferredSource) => isTwitterUrl(row.source_url) || inferred.confidence !== 'none'

const GROUP_FIELD_LABELS: Record<string, string> = {
  source_url: '來源網址',
  source_text: '推文內容',
  author_name: '作者名稱',
  author_handle: '作者 ID',
  post_date: '發文時間',
  like_count: '讚數',
  retweet_count: '轉推數',
  view_count: '觀看數',
  hashtags: '標籤',
}

const MEDIA_FIELD_LABELS: Record<string, string> = {
  thumbnail_url: '縮圖網址',
  media_type: '媒體類型',
  original_url: '原始網址',
  url: 'R2 網址',
}

const ALL_GROUP_FIELDS = Object.keys(GROUP_FIELD_LABELS)
const ALL_MEDIA_FIELDS = Object.keys(MEDIA_FIELD_LABELS)

export default function RepairPage() {
  const { filters, setRepairFilter, visitWorkspace } = useWorkspace()
  const [queryDraft, setQueryDraft] = useState(filters.repair.query)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [items, setItems] = useState<RepairGroup[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [detailItem, setDetailItem] = useState<RepairGroup | null>(null)
  const [editDraft, setEditDraft] = useState<RepairGroup | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeRow, setMergeRow] = useState<RepairGroup | null>(null)
  const [mergeTargetUrl, setMergeTargetUrl] = useState('')
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [mergeSearch, setMergeSearch] = useState('')
  const [mergeOptions, setMergeOptions] = useState<MediaGroupOption[]>([])
  const [loadingMergeOptions, setLoadingMergeOptions] = useState(false)
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [reparseOpen, setReparseOpen] = useState(false)
  const [reparseLoading, setReparseLoading] = useState(false)
  const [reparseApplying, setReparseApplying] = useState(false)
  const [reparseTargets, setReparseTargets] = useState<string[]>([])
  const [reparseIncludeNewMedia, setReparseIncludeNewMedia] = useState(true)
  const [reparsePreview, setReparsePreview] = useState<RepairReparsePreviewData | null>(null)
  const [selectedGroupFields, setSelectedGroupFields] = useState<Record<string, Set<string>>>({})
  const [selectedMediaFields, setSelectedMediaFields] = useState<Record<string, Set<string>>>({})
  const [selectedNewMediaUrls, setSelectedNewMediaUrls] = useState<Set<string>>(new Set())

  const loadList = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetchRepairGroups({
        limit: PAGE_SIZE,
        offset,
        q: filters.repair.query,
        all: filters.repair.showAll,
      })
      setItems(Array.isArray(response.data?.items) ? response.data.items : [])
      setTotal(Number(response.data?.total || 0))
    } catch {
      setLoadError('待修復 group 清單無法載入，請稍後重試。')
      f7.toast.create({ text: '修復清單載入失敗', closeTimeout: 2200 }).open()
    } finally {
      setLoading(false)
    }
  }, [filters.repair.query, filters.repair.showAll, offset])

  useEffect(() => {
    visitWorkspace('repair')
  }, [visitWorkspace])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadList()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadList])

  const setBusyForKeys = useCallback((keys: string[], busy: boolean) => {
    setBusyKeys((prev) => {
      const next = new Set(prev)
      keys.forEach((key) => {
        if (busy) next.add(key)
        else next.delete(key)
      })
      return next
    })
  }, [])

  const inferredItems = useMemo(() => {
    return items.map((row) => ({ row, inferred: inferSource(row) }))
  }, [items])

  const visibleItems = useMemo(() => {
    const keyword = filters.repair.query.trim().toLowerCase()
    const filtered = inferredItems.filter(({ row, inferred }) => {
      if (filters.repair.onlyInferable && inferred.confidence === 'none') return false
      if (!keyword) return true
      return buildSearchText(row, inferred).includes(keyword)
    })
    return filtered
  }, [filters.repair.onlyInferable, filters.repair.query, inferredItems])

  const inferStats = useMemo(() => {
    let high = 0
    let medium = 0
    let none = 0
    visibleItems.forEach(({ inferred }) => {
      if (inferred.confidence === 'high') high += 1
      else if (inferred.confidence === 'medium') medium += 1
      else none += 1
    })
    return { high, medium, none }
  }, [visibleItems])

  const selectedCount = useMemo(() => visibleItems.filter(({ row }) => selectedIds.has(row.id)).length, [selectedIds, visibleItems])
  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < total

  const handleRefresh = (done: () => void) => {
    loadList().finally(done)
  }

  const handleSearchSubmit = () => {
    setOffset(0)
    setRepairFilter({ query: queryDraft })
  }

  const handlePageBeforeIn = () => {
    visitWorkspace('repair')
    if (queryDraft !== filters.repair.query) {
      setQueryDraft(filters.repair.query)
    }
    if (!loading) {
      void loadList()
    }
  }

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const repairSourceUrl = useCallback(async (row: RepairGroup, inferred: InferredSource) => {
    if (!canRepairSource(row, inferred)) {
      f7.toast.create({ text: '此 group 無可用的推斷來源', closeTimeout: 1800 }).open()
      return false
    }

    const key = `group:${row.id}`
    setBusyForKeys([key], true)
    try {
      const result = await updateRepairGroup(row.id, { source_url: inferred.url })
      if (!result.success) throw new Error('REPAIR_FAILED')
      await loadList()
      setDetailItem((prev) => (prev?.id === row.id ? { ...prev, source_url: inferred.url } : prev))
      f7.toast.create({ text: '已補上 source_url', closeTimeout: 1800 }).open()
      return true
    } catch {
      f7.toast.create({ text: '補寫 source_url 失敗', closeTimeout: 2200 }).open()
      return false
    } finally {
      setBusyForKeys([key], false)
    }
  }, [loadList, setBusyForKeys])

  const loadMergeOptions = useCallback(async () => {
    if (mergeOptions.length > 0 || loadingMergeOptions) return
    setLoadingMergeOptions(true)
    try {
      setMergeOptions(await fetchMediaGroups())
    } catch {
      f7.toast.create({ text: '目標 group 清單載入失敗', closeTimeout: 2200 }).open()
    } finally {
      setLoadingMergeOptions(false)
    }
  }, [loadingMergeOptions, mergeOptions.length])

  const openMerge = (row: RepairGroup) => {
    setMergeRow(row)
    setMergeTargetUrl('')
    setMergeTargetId('')
    setMergeSearch('')
    setMergeOpen(true)
    void loadMergeOptions()
  }

  const saveEdit = async () => {
    if (!editDraft?.id) return
    const key = `group:${editDraft.id}`
    setEditSaving(true)
    setBusyForKeys([key], true)
    try {
      const result = await updateRepairGroup(editDraft.id, {
        source_url: editDraft.source_url,
        source_text: editDraft.source_text,
        author_name: editDraft.author_name,
        author_handle: editDraft.author_handle,
        post_date: editDraft.post_date,
        status: editDraft.status,
      })
      if (!result.success) throw new Error('SAVE_FAILED')
      setEditDraft(null)
      await loadList()
      f7.toast.create({ text: '已保存修復資料', closeTimeout: 1800 }).open()
    } catch {
      f7.toast.create({ text: '保存修復資料失敗', closeTimeout: 2200 }).open()
    } finally {
      setEditSaving(false)
      setBusyForKeys([key], false)
    }
  }

  const doMerge = async () => {
    if (!mergeRow?.id) return
    if (!mergeTargetId.trim() && !mergeTargetUrl.trim()) {
      f7.dialog.alert('請輸入 target group id 或 target source_url')
      return
    }

    const key = `group:${mergeRow.id}`
    setBusyForKeys([key], true)
    try {
      const result = await mergeRepairGroup(mergeRow.id, {
        target_group_id: mergeTargetId.trim() || undefined,
        target_source_url: mergeTargetId.trim() ? undefined : mergeTargetUrl.trim(),
        carry_fields: true,
      })
      if (!result.success) throw new Error('MERGE_FAILED')
      setMergeOpen(false)
      setMergeRow(null)
      setDetailItem(null)
      await loadList()
      f7.toast.create({ text: '已完成 group 合併', closeTimeout: 1800 }).open()
    } catch {
      f7.toast.create({ text: '合併 group 失敗', closeTimeout: 2200 }).open()
    } finally {
      setBusyForKeys([key], false)
    }
  }

  const requestUnassign = (row: RepairGroup) => {
    f7.dialog.confirm('確定要把這個 group 內所有 media 拆回 orphan 並刪除此 group 嗎？', '拆回 Orphans', () => {
      void (async () => {
        const key = `group:${row.id}`
        setBusyForKeys([key], true)
        try {
          const result = await unassignRepairGroup(row.id)
          if (!result.success) throw new Error('UNASSIGN_FAILED')
          setDetailItem(null)
          await loadList()
          f7.toast.create({ text: '已拆回 Orphans', closeTimeout: 1800 }).open()
        } catch {
          f7.toast.create({ text: '拆回 Orphans 失敗', closeTimeout: 2200 }).open()
        } finally {
          setBusyForKeys([key], false)
        }
      })()
    })
  }

  const loadReparsePreview = useCallback(async (targetRows: RepairGroup[], overwrite: boolean) => {
    if (targetRows.length === 0) {
      f7.toast.create({ text: '沒有可重解析的 group', closeTimeout: 1800 }).open()
      return
    }

    setReparseLoading(true)
    try {
      const readyIds: string[] = []
      for (const row of targetRows) {
        const inferred = inferSource(row)
        if (!canReparse(row, inferred)) continue
        if (!isTwitterUrl(row.source_url)) {
          const ok = await repairSourceUrl(row, inferred)
          if (!ok) continue
        }
        readyIds.push(row.id)
      }

      if (readyIds.length === 0) {
        f7.toast.create({ text: '沒有可重解析的推特來源', closeTimeout: 1800 }).open()
        return
      }

      const result = await previewRepairReparse(readyIds, overwrite)
      if (!result.success || !result.data) throw new Error('PREVIEW_FAILED')
      setReparseTargets(readyIds)
      setReparsePreview(result.data)
      const groupFields: Record<string, Set<string>> = {}
      const mediaFields: Record<string, Set<string>> = {}
      const newUrls = new Set<string>()
      for (const r of result.data.results) {
        groupFields[r.group_id] = new Set(r.diff)
        for (const mu of r.media_updates) {
          mediaFields[mu.media_id] = new Set(mu.diff)
        }
        for (const mn of r.media_new) {
          newUrls.add(mn.parsed.url)
        }
      }
      setSelectedGroupFields(groupFields)
      setSelectedMediaFields(mediaFields)
      setSelectedNewMediaUrls(newUrls)
      setReparseOpen(true)
    } catch {
      f7.toast.create({ text: '重解析預覽失敗', closeTimeout: 2200 }).open()
    } finally {
      setReparseLoading(false)
    }
  }, [repairSourceUrl])

  const openSingleReparse = (row: RepairGroup) => {
    void loadReparsePreview([row], true)
  }

  const openBatchReparse = () => {
    const targets = visibleItems
      .filter(({ row, inferred }) => selectedIds.has(row.id) && canReparse(row, inferred))
      .map(({ row }) => row)
    void loadReparsePreview(targets, true)
  }

  const applyReparse = async () => {
    if (reparseTargets.length === 0) return
    setReparseApplying(true)
    try {
      const selectedGroupFieldsPayload: Record<string, string[]> = {}
      for (const [id, fields] of Object.entries(selectedGroupFields)) {
        const arr = Array.from(fields)
        if (arr.length > 0) selectedGroupFieldsPayload[id] = arr
      }
      const selectedMediaFieldsPayload: Record<string, string[]> = {}
      for (const [id, fields] of Object.entries(selectedMediaFields)) {
        const arr = Array.from(fields)
        if (arr.length > 0) selectedMediaFieldsPayload[id] = arr
      }
      const result = await applyRepairReparse({
        group_ids: reparseTargets,
        overwrite: true,
        include_new_media: reparseIncludeNewMedia && selectedNewMediaUrls.size > 0,
        selected_group_fields: selectedGroupFieldsPayload,
        selected_media_fields: selectedMediaFieldsPayload,
        new_media_urls: selectedNewMediaUrls.size > 0 ? Array.from(selectedNewMediaUrls) : undefined,
      })
      if (!result.success) throw new Error('APPLY_FAILED')
      setReparseOpen(false)
      setSelectedIds(new Set())
      setSelectedGroupFields({})
      setSelectedMediaFields({})
      setSelectedNewMediaUrls(new Set())
      setDetailItem(null)
      await loadList()
      const skippedCount = result.data?.skipped || 0
      const errorCount = result.data?.errors?.length || 0
      f7.toast.create({
        text: `完成重解析：更新 ${result.data?.updated_groups || 0} 個 group、${result.data?.updated_media || 0} 個 media，新建 ${result.data?.new_media || 0} 個 media${skippedCount > 0 ? `，跳過 ${skippedCount} 個` : ''}${errorCount > 0 ? `，${errorCount} 個錯誤` : ''}`,
        closeTimeout: 3000,
      }).open()
    } catch {
      f7.toast.create({ text: '套用重解析失敗', closeTimeout: 2200 }).open()
    } finally {
      setReparseApplying(false)
    }
  }

  const mergeCandidates = useMemo(() => {
    const keyword = mergeSearch.trim().toLowerCase()
    const rows = mergeOptions.filter((row) => row.id !== mergeRow?.id)
    if (!keyword) return rows.slice(0, 20)
    return rows
      .filter((row) => [row.id, row.author_name, row.author_handle, row.source_url].filter(Boolean).join(' ').toLowerCase().includes(keyword))
      .slice(0, 20)
  }, [mergeOptions, mergeRow?.id, mergeSearch])

  return (
    <Page ptr onPtrRefresh={handleRefresh} onPageBeforeIn={handlePageBeforeIn}>
      <AppNavbar title="Group 修復" subtitle="repair / reparse / edit / merge / unassign" />

      <ReviewToolbarCard
       
        search={(
          <Searchbar
            disableButton={!queryDraft}
            placeholder="搜尋 group id、作者、來源網址或推文文字"
            value={queryDraft}
            onInput={(event) => setQueryDraft((event.target as HTMLInputElement).value || '')}
          />
        )}
        summary={(
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Toggle checked={filters.repair.onlyInferable} onToggleChange={(checked: boolean) => setRepairFilter({ onlyInferable: checked })} />
              <span>只看可推斷來源</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Toggle checked={filters.repair.showAll} onToggleChange={(checked: boolean) => { setRepairFilter({ showAll: checked }); setOffset(0) }} />
              <span>顯示全部 group</span>
            </label>
          </div>
        )}
        actions={(
          <>
            <Button small fill onClick={handleSearchSubmit}>套用搜尋</Button>
            {filters.repair.query && <Button small outline onClick={() => { setQueryDraft(''); setOffset(0); setRepairFilter({ query: '' }) }}>清除</Button>}
          </>
        )}
        footer="搜尋會保留在工作區狀態中，切回其他頁後再回來仍可延續同一批修復條件。"
      />

      <ReviewSummaryPanel
        title="Group 修復概況"
        description={loading ? '正在整理待修復 group...' : `目前 offset ${offset}`}
        metrics={[
          { label: '待修復總量', value: loading ? '...' : total, color: 'orange' },
          {
            label: '目前頁面',
            value: loading ? '...' : visibleItems.length,
            color: 'blue',
            detail: `高/中/無推斷：${inferStats.high}/${inferStats.medium}/${inferStats.none}`,
          },
          {
            label: '已勾選',
            value: selectedCount,
            color: 'green',
            detail: '可直接批次預覽 reparse',
          },
        ]}
      />

      <ReviewToolbarCard
       
        summary={(
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <Checkbox
              checked={visibleItems.length > 0 && visibleItems.every(({ row }) => selectedIds.has(row.id))}
              onChange={(event) => {
                const next = new Set(selectedIds)
                if (event.target.checked) {
                  visibleItems.forEach(({ row }) => next.add(row.id))
                } else {
                  visibleItems.forEach(({ row }) => next.delete(row.id))
                }
                setSelectedIds(next)
              }}
            />
            全選目前頁面項目
          </label>
        )}
        actions={(
          <>
            <Button small fill disabled={selectedCount === 0 || reparseLoading} onClick={openBatchReparse}>預覽重解析</Button>
            <Button small outline disabled={selectedCount === 0} onClick={() => setSelectedIds(new Set())}>清空勾選</Button>
          </>
        )}
        footer={`目前頁面 ${visibleItems.length} 筆，已選 ${selectedCount} 筆（僅有 Twitter 來源的項目可進行重解析）。`}
      />

      {loadError && !loading && visibleItems.length === 0 ? (
        <ReviewStateBlock
          title="修復清單載入失敗"
          description={loadError}
          tone="danger"
          actionText="重新載入"
          onAction={() => void loadList()}
        />
      ) : loading && visibleItems.length === 0 ? (
        <ReviewStateBlock
          title="正在整理待修復 group"
          description="系統會先套用搜尋與可推斷來源條件。"
          tone="info"
          loading
        />
      ) : (
      <List mediaList inset strong dividers style={{ marginTop: 12, marginBottom: 12 }}>
        {visibleItems.map(({ row, inferred }) => {
          const preview = getPreviewUrl(row)
          const isVideo = preview.includes('.mp4')
          const missing = [row.missing_source_url ? 'source_url' : '', row.missing_post_date ? 'post_date' : ''].filter(Boolean).join(' / ')
          return (
            <ListItem
              key={row.id}
              checkbox
              checked={selectedIds.has(row.id)}
              onChange={(event) => toggleSelection(row.id, event.target.checked)}
              mediaItem
              title={row.author_name || row.author_handle || row.id}
              subtitle={`${row.id} · ${missing || '欄位齊全'} · media ${row.media_count || 0} / MV ${row.mv_count || 0}`}
              text={row.source_url || row.source_text || '（無來源資訊）'}
              footer={inferred.url ? `${inferred.confidence} · ${inferred.url}` : '無法推斷來源'}
            >
              <div slot="media" style={{ width: 72, height: 72, flexShrink: 0 }}>
                {preview && (
                  isVideo ? (
                    <video src={preview} muted playsInline style={{ borderRadius: 8, width: 72, height: 72, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <img src={preview} alt={row.id} style={{ borderRadius: 8, width: 72, height: 72, objectFit: 'cover', display: 'block' }} />
                  )
                )}
              </div>
              <Badge slot="after-start" color={inferred.confidence === 'high' ? 'green' : inferred.confidence === 'medium' ? 'orange' : 'gray'}>
                {inferred.confidence}
              </Badge>
              <Button
                slot="after"
                small
                tonal
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setDetailItem(row)
                }}
              >
                詳情
              </Button>
            </ListItem>
          )
        })}
      </List>
      )}

      {!loading && visibleItems.length === 0 && (
        <ReviewStateBlock
          title="沒有符合條件的待修復 group"
          description="可清除搜尋、關閉只看可推斷來源，或切換上一頁 / 下一頁繼續查看。"
          tone="neutral"
        />
      )}

      <Block strong inset>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ opacity: 0.75, fontSize: 13 }}>目前顯示 {visibleItems.length} 筆，總量 {total}。</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button small outline disabled={!canPrev || loading} onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}>上一頁</Button>
            <Button small outline disabled={!canNext || loading} onClick={() => setOffset((prev) => prev + PAGE_SIZE)}>下一頁</Button>
          </div>
        </div>
      </Block>

      {(() => {
        if (!detailItem) return null
        const inferred = inferSource(detailItem)
        const preview = getPreviewUrl(detailItem)
        const isVideo = preview.includes('.mp4')
        return (
          <Popup opened={Boolean(detailItem)} onPopupClose={() => setDetailItem(null)}>
            <Page>
                <Navbar>
                  <NavLeft>
                    <Link onClick={() => setDetailItem(null)}>關閉</Link>
                  </NavLeft>
                  <NavTitle>Group 詳情</NavTitle>
                  <NavRight>
                    <Badge color={inferred.confidence === 'high' ? 'green' : inferred.confidence === 'medium' ? 'orange' : 'gray'}>{inferred.confidence}</Badge>
                  </NavRight>
                </Navbar>

                <Block strong inset>
                  {preview && (
                    <div>
                      {isVideo ? (
                        <video src={preview} controls playsInline style={{ width: '100%', display: 'block', maxHeight: '56vh' }} />
                      ) : (
                        <img src={preview} alt={detailItem.id} style={{ width: '100%', display: 'block', maxHeight: '56vh', objectFit: 'contain' }} />
                      )}
                    </div>
                  )}
                </Block>

                <List inset strong>
                  <ListItem title="Group ID" after={detailItem.id} />
                  <ListItem title="作者" text={detailItem.author_name || detailItem.author_handle || '未提供'} />
                  <ListItem title="來源網址" text={detailItem.source_url || '未提供'} />
                  <ListItem title="推斷網址" text={inferred.url || '無法推斷'} />
                  <ListItem title="發文時間" text={formatDateTime(detailItem.post_date)} />
                  <ListItem title="缺少欄位" text={[detailItem.missing_source_url ? 'source_url' : '', detailItem.missing_post_date ? 'post_date' : ''].filter(Boolean).join(' / ') || '（無）'} />
                  <ListItem title="媒體數量" after={String(detailItem.media_count || 0)} />
                  <ListItem title="MV 數量" after={String(detailItem.mv_count || 0)} />
                </List>

                <BlockTitle>推文內容</BlockTitle>
                <Block strong inset>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{detailItem.source_text || '（無內容）'}</div>
                </Block>

              <Block strong inset>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {canRepairSource(detailItem, inferred) && (
                    <Button fill tonal onClick={() => void repairSourceUrl(detailItem, inferred)} disabled={busyKeys.has(`group:${detailItem.id}`)}>
                      補上來源
                    </Button>
                  )}
                  {canReparse(detailItem, inferred) && (
                    <Button fill onClick={() => openSingleReparse(detailItem)} disabled={reparseLoading || busyKeys.has(`group:${detailItem.id}`)}>
                      Reparse
                    </Button>
                  )}
                  <Button outline onClick={() => setEditDraft({ ...detailItem })}>Edit</Button>
                  <Button outline onClick={() => openMerge(detailItem)}>Merge</Button>
                  <Button outline color="red" onClick={() => requestUnassign(detailItem)}>Unassign</Button>
                </div>
              </Block>
            </Page>
          </Popup>
        )
      })()}

      <Sheet opened={Boolean(editDraft)} onSheetClosed={() => setEditDraft(null)} backdrop swipeToClose style={{ height: '85vh' }}>
        <Toolbar>
          <ToolbarPane>
            <div style={{ fontWeight: 700 }}>Edit Group</div>
            <Link sheetClose>關閉</Link>
          </ToolbarPane>
        </Toolbar>
        {editDraft && (
          <Block strong inset>
            <div>
              <div style={{ opacity: 0.75 }}>{editDraft.id}</div>
              <List form inset style={{ marginTop: 14 }}>
                <ListInput
                  label="source_url"
                  type="text"
                  value={editDraft.source_url || ''}
                  onInput={(event) => setEditDraft((prev) => (prev ? { ...prev, source_url: (event.target as HTMLInputElement).value } : prev))}
                />
                <ListInput
                  label="author_name"
                  type="text"
                  value={editDraft.author_name || ''}
                  onInput={(event) => setEditDraft((prev) => (prev ? { ...prev, author_name: (event.target as HTMLInputElement).value } : prev))}
                />
                <ListInput
                  label="author_handle"
                  type="text"
                  value={editDraft.author_handle || ''}
                  onInput={(event) => setEditDraft((prev) => (prev ? { ...prev, author_handle: (event.target as HTMLInputElement).value } : prev))}
                />
                <ListInput
                  label="status"
                  type="select"
                  value={editDraft.status || ''}
                  onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, status: (event.target as HTMLSelectElement).value || null } : prev))}
                >
                  <option value="">未設定</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </ListInput>
                <ListInput
                  label="post_date"
                  type="datetime-local"
                  value={editDraft.post_date ? new Date(editDraft.post_date).toISOString().slice(0, 16) : ''}
                  onInput={(event) => setEditDraft((prev) => (prev ? { ...prev, post_date: (event.target as HTMLInputElement).value ? new Date((event.target as HTMLInputElement).value).toISOString() : null } : prev))}
                />
                <ListInput
                  label="source_text"
                  type="textarea"
                  resizable
                  value={editDraft.source_text || ''}
                  onInput={(event) => setEditDraft((prev) => (prev ? { ...prev, source_text: (event.target as HTMLTextAreaElement).value } : prev))}
                />
              </List>
              <Button fill onClick={() => void saveEdit()} loading={editSaving}>保存</Button>
            </div>
          </Block>
        )}
      </Sheet>

      <Sheet opened={mergeOpen} onSheetClosed={() => setMergeOpen(false)} backdrop swipeToClose style={{ height: '85vh' }}>
        <Toolbar>
          <ToolbarPane>
            <div style={{ fontWeight: 700 }}>Merge Group</div>
            <Link sheetClose>關閉</Link>
          </ToolbarPane>
        </Toolbar>
        <Block strong inset>
          <div>
            <div style={{ opacity: 0.75 }}>來源 group：{mergeRow?.id}</div>
            <List form inset style={{ marginTop: 14 }}>
              <ListInput
                label="target_source_url"
                type="text"
                value={mergeTargetUrl}
                onInput={(event) => setMergeTargetUrl((event.target as HTMLInputElement).value)}
                placeholder="推薦：直接輸入要併入的 source_url"
              />
              <ListInput
                label="target_group_id"
                type="text"
                value={mergeSearch}
                onInput={(event) => setMergeSearch((event.target as HTMLInputElement).value)}
                placeholder={loadingMergeOptions ? '載入中...' : '搜尋 group id / 作者 / source_url'}
              />
            </List>
            {mergeTargetId && <div style={{ opacity: 0.75 }}>目前 target_group_id：{mergeTargetId}</div>}
            <List mediaList inset strong dividers style={{ marginTop: 12, marginBottom: 12 }}>
              {mergeCandidates.map((row) => (
                <ListItem
                  key={row.id}
                  link
                  title={row.author_name || row.author_handle || row.id}
                  subtitle={row.id}
                  text={row.source_url || '（無 source_url）'}
                  onClick={() => setMergeTargetId(row.id)}
                >
                  {mergeTargetId === row.id && <Badge slot="after" color="green">已選</Badge>}
                </ListItem>
              ))}
            </List>
            <Button fill onClick={() => void doMerge()} disabled={busyKeys.has(`group:${mergeRow?.id || ''}`)}>確認合併</Button>
          </div>
        </Block>
      </Sheet>

      <Popup opened={reparseOpen} onPopupClosed={() => setReparseOpen(false)}>
        <Page>
            <Navbar>
              <NavLeft>
                <Link popupClose>關閉</Link>
              </NavLeft>
              <NavTitle>Reparse 預覽</NavTitle>
              <NavRight>
                <Badge color="blue">{reparseTargets.length}</Badge>
              </NavRight>
            </Navbar>

            {(() => {
              const totalGroupFields = Object.values(selectedGroupFields).reduce((sum, s) => sum + s.size, 0)
              const totalMediaFields = Object.values(selectedMediaFields).reduce((sum, s) => sum + s.size, 0)
              return (
                <>
                  <Block strong inset>
                    <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>
                      共 {reparseTargets.length} 個 group，已勾選 {totalGroupFields} 個 group 欄位 + {totalMediaFields} 個 media 欄位{selectedNewMediaUrls.size > 0 ? ` + ${selectedNewMediaUrls.size} 個新媒體` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Button small outline onClick={() => {
                        const nextGroup: Record<string, Set<string>> = {}
                        const nextMedia: Record<string, Set<string>> = {}
                        const nextNew = new Set<string>()
                        for (const r of (reparsePreview?.results || [])) {
                          nextGroup[r.group_id] = new Set(r.diff)
                          for (const mu of r.media_updates) nextMedia[mu.media_id] = new Set(mu.diff)
                          for (const mn of r.media_new) nextNew.add(mn.parsed.url)
                        }
                        setSelectedGroupFields(nextGroup)
                        setSelectedMediaFields(nextMedia)
                        setSelectedNewMediaUrls(nextNew)
                      }}>全選全部</Button>
                      <Button small outline onClick={() => {
                        setSelectedGroupFields({})
                        setSelectedMediaFields({})
                        setSelectedNewMediaUrls(new Set())
                      }}>取消全選</Button>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
                        <Toggle checked={reparseIncludeNewMedia} onToggleChange={(checked: boolean) => setReparseIncludeNewMedia(checked)} />
                        <span style={{ fontSize: 13 }}>補進新媒體</span>
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                      <Button small outline onClick={() => void loadReparsePreview(items.filter((row) => reparseTargets.includes(row.id)), true)} loading={reparseLoading}>重新預覽</Button>
                      <Button small fill onClick={() => void applyReparse()} loading={reparseApplying}>套用重解析</Button>
                    </div>
                  </Block>

                  <BlockTitle>欄位勾選預覽</BlockTitle>

                  {reparsePreview?.results.map((result) => {
                    const groupFields = selectedGroupFields[result.group_id] || new Set<string>()
                    const unchangedGroupFields = ALL_GROUP_FIELDS.filter(f => !result.diff.includes(f))
                    return (
                      <Block key={result.group_id} strong inset style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4, wordBreak: 'break-all' }}>{result.group_id}</div>
                        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10, wordBreak: 'break-all' }}>{result.source_url}</div>

                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          <Button small outline onClick={() => setSelectedGroupFields(prev => ({ ...prev, [result.group_id]: new Set(result.diff) }))}>
                            全選此 group
                          </Button>
                          <Button small outline onClick={() => setSelectedGroupFields(prev => ({ ...prev, [result.group_id]: new Set() }))}>
                            取消此 group
                          </Button>
                        </div>

                        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>Group 欄位</div>
                        {result.diff.length === 0 && <div style={{ fontSize: 12, opacity: 0.4 }}>（所有欄位皆無變更）</div>}
                        {result.diff.map(field => (
                          <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                            <Checkbox
                              checked={groupFields.has(field)}
                              onChange={(e) => {
                                setSelectedGroupFields(prev => {
                                  const next = new Set(prev[result.group_id] || [])
                                  if (e.target.checked) next.add(field); else next.delete(field)
                                  return { ...prev, [result.group_id]: next }
                                })
                              }}
                            />
                            <span style={{ fontSize: 13, minWidth: 72 }}>{GROUP_FIELD_LABELS[field] || field}</span>
                            <span style={{ fontSize: 11, opacity: 0.5 }}>
                              {String((result.current as Record<string, unknown>)[field] ?? '（空）')}
                              {' → '}
                              {String((result.parsed as Record<string, unknown>)[field] ?? '（空）')}
                            </span>
                          </label>
                        ))}
                        {unchangedGroupFields.length > 0 && (
                          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 6 }}>
                            無變更：{unchangedGroupFields.map(f => GROUP_FIELD_LABELS[f] || f).join('、')}
                          </div>
                        )}

                        {result.media_updates.length > 0 && (
                          <>
                            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 14, marginBottom: 6 }}>Media 欄位更新</div>
                            {result.media_updates.map(mu => {
                              const mFields = selectedMediaFields[mu.media_id] || new Set<string>()
                              const mUnchanged = ALL_MEDIA_FIELDS.filter(f => !mu.diff.includes(f))
                              return (
                                <div key={mu.media_id} style={{ marginLeft: 8, marginBottom: 10, padding: 8, borderLeft: '2px solid var(--f7-list-border-color, #ccc)' }}>
                                  <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 4, wordBreak: 'break-all' }}>{mu.media_id}</div>
                                  {mu.diff.map(field => (
                                    <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                                      <Checkbox
                                        checked={mFields.has(field)}
                                        onChange={(e) => {
                                          setSelectedMediaFields(prev => {
                                            const next = new Set(prev[mu.media_id] || [])
                                            if (e.target.checked) next.add(field); else next.delete(field)
                                            return { ...prev, [mu.media_id]: next }
                                          })
                                        }}
                                      />
                                      <span style={{ fontSize: 12, minWidth: 64 }}>{MEDIA_FIELD_LABELS[field] || field}</span>
                                      <span style={{ fontSize: 10, opacity: 0.5 }}>
                                        {String((mu.current as Record<string, unknown>)[field] ?? '（空）')}
                                        {' → '}
                                        {String((mu.parsed as Record<string, unknown>)[field] ?? '（空）')}
                                      </span>
                                    </label>
                                  ))}
                                  {mUnchanged.length > 0 && (
                                    <div style={{ fontSize: 10, opacity: 0.4, marginTop: 4 }}>
                                      無變更：{mUnchanged.map(f => MEDIA_FIELD_LABELS[f] || f).join('、')}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </>
                        )}

                        {result.media_new.length > 0 && reparseIncludeNewMedia && (
                          <>
                            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 14, marginBottom: 6 }}>可新增媒體</div>
                            {result.media_new.map((mn, idx) => (
                              <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', marginLeft: 8 }}>
                                <Checkbox
                                  checked={selectedNewMediaUrls.has(mn.parsed.url)}
                                  onChange={(e) => {
                                    setSelectedNewMediaUrls(prev => {
                                      const next = new Set(prev)
                                      if (e.target.checked) next.add(mn.parsed.url); else next.delete(mn.parsed.url)
                                      return next
                                    })
                                  }}
                                />
                                <span style={{ fontSize: 12, wordBreak: 'break-all' }}>[{mn.parsed.media_type}] {mn.parsed.url}</span>
                              </label>
                            ))}
                          </>
                        )}
                      </Block>
                    )
                  })}

                  {!reparseLoading && (!reparsePreview || reparsePreview.results.length === 0) && (
                    <ReviewStateBlock
                      title="這次沒有可套用的預覽結果"
                      description="可重新預覽或返回清單選擇其他 group。"
                      tone="neutral"
                      compact
                    />
                  )}

                  {reparsePreview?.errors && reparsePreview.errors.length > 0 && (
                    <>
                      <BlockTitle>錯誤</BlockTitle>
                      <List inset strong>
                        {reparsePreview.errors.map((error) => (
                          <ListItem key={`${error.group_id}-${error.error}`} title={error.group_id} text={error.error} />
                        ))}
                      </List>
                    </>
                  )}
                </>
              )
            })()}
        </Page>
      </Popup>
    </Page>
  )
}
