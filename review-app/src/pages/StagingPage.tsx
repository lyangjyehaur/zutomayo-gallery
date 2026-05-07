import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Block,
  BlockTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  Link,
  List,
  ListItem,
  Navbar,
  NavLeft,
  NavRight,
  NavTitle,
  Page,
  PageContent,
  Popup,
  Searchbar,
  Segmented,
  Sheet,
  SwipeoutActions,
  SwipeoutButton,
  Toolbar,
  View,
  f7,
} from 'framework7-react'
import AppNavbar from '../components/AppNavbar'
import MvSheet from '../components/MvSheet'
import ReviewStateBlock from '../components/ReviewStateBlock'
import ReviewToolbarCard from '../components/ReviewToolbarCard'
import { useWorkspace } from '../hooks/useWorkspace'
import {
  approveStagingFanart,
  batchRestoreStagingFanarts,
  fetchMvs,
  fetchStagingFanarts,
  fetchStagingProgress,
  rejectStagingFanart,
  restoreStagingFanart,
  triggerStagingCrawler,
  type MV,
  type StagingFanart,
  type StagingProgressData,
} from '../lib/api'
import type { StagingStatus } from '../contexts/WorkspaceContext'

const PAGE_SIZE = 20
const DEFAULT_SEARCH_TERMS = 'from:zutomayo_art filter:media include:nativeretweets'

const createDefaultCrawlerRange = () => {
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 7)
  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
  }
}

const formatCount = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(value)
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const getStatusBadgeColor = (status: StagingStatus) => {
  if (status === 'approved') return 'green'
  if (status === 'rejected') return 'red'
  return 'orange'
}

const getProgressLabel = (progress: StagingProgressData['syncProgress'] | undefined) => {
  if (!progress?.status || progress.status === 'idle') return '閒置中'
  if (progress.status === 'crawling') return '正在抓取推文'
  if (progress.status === 'processing') {
    return `正在處理媒體 (${progress.current_run_processed || 0} / ${progress.current_run_total || 0})`
  }
  if (progress.status === 'error') return '同步發生錯誤'
  return progress.status
}

const buildSearchText = (item: StagingFanart) => {
  return [
    item.author_name,
    item.author_handle,
    item.source_text,
    item.original_url,
    item.media_url,
    item.tweet_id,
    item.hashtags.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export default function StagingPage() {
  const { filters, setStagingFilter, visitWorkspace } = useWorkspace()
  const [status, setStatus] = useState<StagingStatus>(filters.staging.status)
  const [query, setQuery] = useState(filters.staging.query)
  const [items, setItems] = useState<StagingFanart[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [refreshingProgress, setRefreshingProgress] = useState(false)
  const [mvs, setMvs] = useState<MV[]>([])
  const [progress, setProgress] = useState<StagingProgressData | null>(null)
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [detailItem, setDetailItem] = useState<StagingFanart | null>(null)
  const [mvSheetOpened, setMvSheetOpened] = useState(false)
  const [mvSheetBusy, setMvSheetBusy] = useState(false)
  const [mvSheetTargets, setMvSheetTargets] = useState<string[]>([])
  const [crawlerSheetOpened, setCrawlerSheetOpened] = useState(false)
  const [triggeringCrawler, setTriggeringCrawler] = useState(false)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [crawlerForm, setCrawlerForm] = useState(() => ({
    searchTerms: DEFAULT_SEARCH_TERMS,
    ...createDefaultCrawlerRange(),
    maxItems: '1000',
  }))
  const pageRef = useRef(1)
  const allowInfinite = useRef(true)

  const loadProgress = useCallback(async (silent = false) => {
    if (!silent) setRefreshingProgress(true)
    try {
      const response = await fetchStagingProgress()
      if (response.success && response.data) {
        setProgress(response.data)
        return
      }
      throw new Error('LOAD_PROGRESS_FAILED')
    } catch {
      if (!silent) {
        f7.toast.create({ text: '同步進度載入失敗', closeTimeout: 2000 }).open()
      }
    } finally {
      if (!silent) setRefreshingProgress(false)
    }
  }, [])

  const loadMvs = useCallback(async () => {
    try {
      const response = await fetchMvs()
      if (response.success) {
        setMvs(Array.isArray(response.data) ? response.data : [])
      }
    } catch {
      f7.toast.create({ text: 'MV 清單載入失敗', closeTimeout: 2000 }).open()
    }
  }, [])

  const loadItems = useCallback(async (nextStatus: StagingStatus, pageNum: number, reset = false) => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetchStagingFanarts(nextStatus, pageNum, PAGE_SIZE)
      const newItems = Array.isArray(response.data) ? response.data : []
      setItems((prev) => (reset ? newItems : [...prev, ...newItems]))

      const totalPages = Number(response.meta?.totalPages || 0)
      const nextHasMore = totalPages > 0 ? pageNum < totalPages : newItems.length >= PAGE_SIZE
      setHasMore(nextHasMore)
      allowInfinite.current = nextHasMore
    } catch {
      setLoadError('目前無法讀取暫存清單，請稍後重試或先更新同步進度。')
      f7.toast.create({ text: '暫存資料載入失敗', closeTimeout: 2000 }).open()
    } finally {
      setLoading(false)
    }
  }, [])

  const resetPagination = useCallback(() => {
    pageRef.current = 1
    allowInfinite.current = true
    setHasMore(true)
  }, [])

  const reloadCurrentStatus = useCallback(async () => {
    resetPagination()
    await loadItems(status, 1, true)
  }, [loadItems, resetPagination, status])

  useEffect(() => {
    const syncStatus = progress?.syncProgress?.status
    if (!syncStatus || syncStatus === 'idle' || syncStatus === 'error') return

    const timer = window.setInterval(() => {
      void loadProgress(true)
    }, 3000)

    return () => window.clearInterval(timer)
  }, [loadProgress, progress?.syncProgress?.status])

  useEffect(() => {
    visitWorkspace('staging')
  }, [visitWorkspace])

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return items
    return items.filter((item) => buildSearchText(item).includes(keyword))
  }, [items, query])

  const visibleIds = filteredItems.map((item) => item.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selection.has(id))
  const selectedCount = selection.size
  const selectedVisibleCount = visibleIds.filter((id) => selection.has(id)).length
  const syncProgress = progress?.syncProgress
  const syncProgressPercent = syncProgress?.current_run_total
    ? Math.min(100, Math.round(((syncProgress.current_run_processed || 0) / syncProgress.current_run_total) * 100))
    : 0

  const setBusyForIds = useCallback((ids: string[], busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => {
        if (busy) next.add(id)
        else next.delete(id)
      })
      return next
    })
  }, [])

  const pruneSelection = useCallback((ids: string[]) => {
    setSelection((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }, [])

  const finalizeMutations = useCallback(async (processedIds: string[], successCount: number, failCount: number, successMessage: string) => {
    if (successCount > 0) {
      pruneSelection(processedIds)
      setDetailItem((prev) => (prev && processedIds.includes(prev.id) ? null : prev))
      await Promise.all([reloadCurrentStatus(), loadProgress(true)])
    }

    if (failCount === 0) {
      f7.toast.create({ text: successMessage, closeTimeout: 1800 }).open()
      return
    }

    if (successCount === 0) {
      f7.toast.create({ text: '操作失敗，請稍後再試', closeTimeout: 2200 }).open()
      return
    }

    f7.toast.create({ text: `完成 ${successCount} 筆，失敗 ${failCount} 筆`, closeTimeout: 2200 }).open()
  }, [loadProgress, pruneSelection, reloadCurrentStatus])

  const handleRefresh = (done: () => void) => {
    Promise.all([reloadCurrentStatus(), loadProgress(true)]).finally(done)
  }

  const handleStatusChange = (nextStatus: StagingStatus) => {
    if (nextStatus === status) return
    resetPagination()
    setSelection(new Set())
    setDetailItem(null)
    setItems([])
    setStatus(nextStatus)
    setStagingFilter({ status: nextStatus })
    void loadItems(nextStatus, 1, true)
    void loadProgress(true)
  }

  const handleQueryInput = (value: string) => {
    setQuery(value)
    setStagingFilter({ query: value })
  }

  const handlePageBeforeIn = () => {
    visitWorkspace('staging')
    if (mvs.length === 0) {
      void loadMvs()
    }
    void loadProgress(true)

    if (filters.staging.query !== query) {
      setQuery(filters.staging.query)
    }

    if (filters.staging.status !== status) {
      resetPagination()
      setSelection(new Set())
      setItems([])
      setStatus(filters.staging.status)
      void loadItems(filters.staging.status, 1, true)
      return
    }

    if (loading || items.length > 0) return
    resetPagination()
    void loadItems(status, 1, true)
  }

  const handleInfinite = () => {
    if (!allowInfinite.current || loading) return
    const nextPage = pageRef.current + 1
    pageRef.current = nextPage
    void loadItems(status, nextPage)
  }

  const toggleSelection = (id: string, checked: boolean) => {
    setSelection((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelection((prev) => {
      const next = new Set(prev)
      visibleIds.forEach((id) => {
        if (checked) next.add(id)
        else next.delete(id)
      })
      return next
    })
  }

  const openApproveSheet = (ids: string[]) => {
    if (ids.length === 0) return
    if (mvs.length === 0) {
      void loadMvs()
    }
    setMvSheetTargets(ids)
    setMvSheetOpened(true)
  }

  const handleMvConfirm = async (mvIds: string[], tags: string[]) => {
    if (mvSheetTargets.length === 0) return

    setMvSheetBusy(true)
    setBusyForIds(mvSheetTargets, true)

    let successCount = 0
    let failCount = 0
    const successfulIds: string[] = []
    const payload = [...mvIds, ...tags]

    try {
      for (const id of mvSheetTargets) {
        try {
          const result = await approveStagingFanart(id, payload)
          if (!result?.success) throw new Error('APPROVE_FAILED')
          successCount += 1
          successfulIds.push(id)
        } catch {
          failCount += 1
        }
      }
    } finally {
      setBusyForIds(mvSheetTargets, false)
      setMvSheetBusy(false)
      setMvSheetTargets([])
      setMvSheetOpened(false)
    }

    await finalizeMutations(
      successfulIds,
      successCount,
      failCount,
      mvSheetTargets.length === 1 ? '已通過並建立關聯' : `已批次通過 ${successCount} 筆`,
    )
  }

  const runReject = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return

    setBusyForIds(ids, true)
    let successCount = 0
    let failCount = 0
    const successfulIds: string[] = []

    try {
      for (const id of ids) {
        try {
          const result = await rejectStagingFanart(id)
          if (!result?.success) throw new Error('REJECT_FAILED')
          successCount += 1
          successfulIds.push(id)
        } catch {
          failCount += 1
        }
      }
    } finally {
      setBusyForIds(ids, false)
    }

    await finalizeMutations(successfulIds, successCount, failCount, ids.length === 1 ? '已拒絕' : `已批次拒絕 ${successCount} 筆`)
  }, [finalizeMutations, setBusyForIds])

  const requestReject = (ids: string[]) => {
    if (ids.length === 0) return
    f7.dialog.confirm(
      ids.length === 1 ? '確定要拒絕這筆暫存資料嗎？' : `確定要拒絕目前選取的 ${ids.length} 筆資料嗎？`,
      '拒絕暫存',
      () => {
        void runReject(ids)
      },
    )
  }

  const runRestore = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return

    setBusyForIds(ids, true)
    let successCount = 0
    let failCount = 0
    const successfulIds: string[] = []

    try {
      if (ids.length > 1) {
        const result = await batchRestoreStagingFanarts(ids)
        const updatedCount = Number(result.data?.updatedCount || 0)
        successCount = updatedCount
        failCount = Math.max(0, ids.length - updatedCount)
        if (updatedCount > 0) {
          successfulIds.push(...ids)
        }
      } else {
        const result = await restoreStagingFanart(ids[0])
        if (!result?.success) throw new Error('RESTORE_FAILED')
        successCount = 1
        successfulIds.push(ids[0])
      }
    } catch {
      failCount = ids.length
    } finally {
      setBusyForIds(ids, false)
    }

    await finalizeMutations(successfulIds, successCount, failCount, ids.length === 1 ? '已恢復為待審' : `已批次恢復 ${successCount} 筆`)
  }, [finalizeMutations, setBusyForIds])

  const requestRestore = (ids: string[]) => {
    if (ids.length === 0) return
    f7.dialog.confirm(
      ids.length === 1 ? '將這筆資料還原回待審佇列？' : `將選取的 ${ids.length} 筆資料還原回待審佇列？`,
      '恢復暫存',
      () => {
        void runRestore(ids)
      },
    )
  }

  const handleTriggerCrawler = async () => {
    const searchTerms = crawlerForm.searchTerms.trim()
    const maxItems = Math.max(1, Number(crawlerForm.maxItems) || 0)

    if (!searchTerms) {
      f7.dialog.alert('請先輸入 search terms')
      return
    }

    if (!crawlerForm.startDate || !crawlerForm.endDate) {
      f7.dialog.alert('請完整選擇開始與結束日期')
      return
    }

    if (crawlerForm.startDate > crawlerForm.endDate) {
      f7.dialog.alert('開始日期不能晚於結束日期')
      return
    }

    setTriggeringCrawler(true)
    try {
      const result = await triggerStagingCrawler({
        searchTerms,
        startDate: crawlerForm.startDate,
        endDate: crawlerForm.endDate,
        maxItems,
      })

      if (!result?.success) {
        throw new Error(result?.message || 'TRIGGER_FAILED')
      }

      setCrawlerSheetOpened(false)
      f7.toast.create({ text: 'Crawler 已在背景啟動', closeTimeout: 2000 }).open()
      await loadProgress(true)
    } catch {
      f7.toast.create({ text: '啟動 crawler 失敗', closeTimeout: 2200 }).open()
    } finally {
      setTriggeringCrawler(false)
    }
  }

  return (
    <Page
      ptr
      infinite
      infiniteDistance={50}
      onPtrRefresh={handleRefresh}
      onInfinite={handleInfinite}
      onPageBeforeIn={handlePageBeforeIn}
    >
      <AppNavbar title="暫存審核" subtitle="crawler / sync / 批次操作" />

      <Block className="review-grid review-grid-cards review-fade-up">
        <Card className="review-card">
          <CardHeader>同步狀態</CardHeader>
          <CardContent>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{getProgressLabel(syncProgress)}</div>
            <div style={{ opacity: 0.75, marginTop: 8 }}>
              {syncProgress
                ? `本輪 ${syncProgress.current_run_processed || 0} / ${syncProgress.current_run_total || 0}，累計抓取 ${syncProgress.total_crawled || 0}`
                : '尚未取得同步資訊'}
            </div>
            <div className="review-progress-track" style={{ marginTop: 12 }}>
              <div
                className="review-progress-fill"
                style={{ width: `${syncProgressPercent}%` }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <Button small fill tonal onClick={() => void loadProgress()} loading={refreshingProgress}>更新進度</Button>
              <Button small outline onClick={() => setCrawlerSheetOpened(true)}>啟動 crawler</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="review-card">
          <CardHeader>佇列統計</CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>待審</span>
                <Badge color="orange">{progress?.statusCounts.pending || 0}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>已通過</span>
                <Badge color="green">{progress?.statusCounts.approved || 0}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>已拒絕</span>
                <Badge color="red">{progress?.statusCounts.rejected || 0}</Badge>
              </div>
            </div>
            <div style={{ opacity: 0.75, marginTop: 12 }}>目前篩選 {filteredItems.length} 筆，已勾選 {selectedCount} 筆。</div>
          </CardContent>
        </Card>
      </Block>

      <Block className="review-segment-wrap review-fade-up review-fade-up-delay-1">
        <Segmented strong>
          <Button active={status === 'pending'} onClick={() => handleStatusChange('pending')}>
            待審 {progress?.statusCounts.pending || 0}
          </Button>
          <Button active={status === 'approved'} onClick={() => handleStatusChange('approved')}>
            已通過 {progress?.statusCounts.approved || 0}
          </Button>
          <Button active={status === 'rejected'} onClick={() => handleStatusChange('rejected')}>
            已拒絕 {progress?.statusCounts.rejected || 0}
          </Button>
        </Segmented>
      </Block>

      <ReviewToolbarCard
        className="review-fade-up review-fade-up-delay-1"
        search={(
          <Searchbar
            disableButton={!query}
            placeholder="搜尋作者、handle、推文內容、網址或 hashtag"
            value={query}
            onInput={(event) => handleQueryInput((event.target as HTMLInputElement).value || '')}
          />
        )}
        summary={(
          <>
            搜尋只會篩目前已載入項目；下拉可刷新，往下滑可繼續載入更多資料。
            <div className="review-inline-kpis" style={{ marginTop: 10 }}>
              <div className="review-chip">目前狀態 {status}</div>
              <div className="review-chip review-chip-soft">顯示 {filteredItems.length}</div>
              <div className="review-chip review-chip-soft">已勾選 {selectedCount}</div>
            </div>
          </>
        )}
        actions={query ? <Link onClick={() => handleQueryInput('')}>清除搜尋</Link> : undefined}
      />

      <ReviewToolbarCard
        className="review-fade-up review-fade-up-delay-2"
        summary={(
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={(event) => toggleSelectAllVisible(event.target.checked)}
            />
            全選目前篩選結果 ({selectedVisibleCount})
          </label>
        )}
        actions={(
          <>
            {status === 'pending' && (
              <>
                <Button small fill disabled={selectedCount === 0 || mvSheetBusy} onClick={() => openApproveSheet(Array.from(selection))}>
                  批次通過
                </Button>
                <Button small outline color="red" disabled={selectedCount === 0} onClick={() => requestReject(Array.from(selection))}>
                  批次拒絕
                </Button>
              </>
            )}
            {status === 'rejected' && (
              <Button small fill tonal color="orange" disabled={selectedCount === 0} onClick={() => requestRestore(Array.from(selection))}>
                批次恢復
              </Button>
            )}
            <Button small outline disabled={selectedCount === 0} onClick={() => setSelection(new Set())}>清空勾選</Button>
          </>
        )}
        footer="批量工具列會跟著當前狀態切換，保持與單筆 swipeout 行為一致。"
      />

      <div className="review-list-frame">
        {loadError && !loading && items.length === 0 ? (
          <ReviewStateBlock
            title="暫存清單載入失敗"
            description={loadError}
            tone="danger"
            actionText="重新載入"
            onAction={() => void reloadCurrentStatus()}
          />
        ) : loading && items.length === 0 ? (
          <ReviewStateBlock
            title="正在同步暫存清單"
            description="會一併套用目前狀態分頁與搜尋條件。"
            tone="info"
            loading
          />
        ) : (
      <List mediaList className="review-list review-fade-up review-fade-up-delay-2">
        {filteredItems.map((item) => {
          const imgSrc = item.media_type === 'image' ? item.media_url : (item.thumbnail_url || item.media_url)
          const subtitle = `@${item.author_handle} · ❤️ ${formatCount(item.like_count)} · 🔁 ${formatCount(item.retweet_count)} · 👁 ${formatCount(item.view_count)}`
          const footer = [
            item.media_type === 'video' ? 'Video' : 'Image',
            item.hashtags.slice(0, 4).join(' '),
            `tweet:${item.tweet_id}`,
            formatDate(item.post_date),
          ].filter(Boolean).join(' · ')
          const isBusy = busyIds.has(item.id)

          return (
            <ListItem
              key={item.id}
              swipeout={status === 'pending'}
              link="#"
              title={item.author_name || item.author_handle}
              subtitle={subtitle}
              text={item.source_text || '（無推文文字）'}
              footer={footer}
              onClick={() => setDetailItem(item)}
            >
              <div slot="media" style={{ position: 'relative', width: 80, height: 80 }}>
                <input
                  type="checkbox"
                  checked={selection.has(item.id)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => toggleSelection(item.id, event.target.checked)}
                  style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}
                />
                {item.media_type === 'video' ? (
                  <video src={imgSrc} style={{ borderRadius: 8, width: 80, height: 80, objectFit: 'cover' }} muted playsInline />
                ) : (
                  <img src={imgSrc} style={{ borderRadius: 8, width: 80, height: 80, objectFit: 'cover' }} />
                )}
              </div>
              <Badge slot="after" color={getStatusBadgeColor(item.status)}>{item.status}</Badge>
              {status === 'pending' && (
                <>
                  <SwipeoutActions left>
                    <SwipeoutButton overswipe color="green" close onClick={() => { if (isBusy) return; openApproveSheet([item.id]) }}>
                      通過
                    </SwipeoutButton>
                  </SwipeoutActions>
                  <SwipeoutActions right>
                    <SwipeoutButton overswipe color="red" close onClick={() => { if (isBusy) return; requestReject([item.id]) }}>
                      拒絕
                    </SwipeoutButton>
                  </SwipeoutActions>
                </>
              )}
            </ListItem>
          )
        })}
      </List>
        )}

        {loading && items.length > 0 && (
          <ReviewStateBlock
            title="正在載入更多暫存資料"
            description="繼續往下滑會自動接續下一頁。"
            tone="info"
            loading
            compact
          />
        )}

        {!loading && items.length > 0 && filteredItems.length === 0 && (
          <ReviewStateBlock
            title="沒有符合搜尋條件的結果"
            description="可清除搜尋詞、切換狀態分頁，或繼續向下滑載入更多資料。"
            tone="warning"
            compact
          />
        )}

        {!hasMore && filteredItems.length > 0 && (
          <Block strong inset className="review-endcap">已載入到底，若要查看其他資料可切換狀態或重新同步。</Block>
        )}

        {!loading && items.length === 0 && (
          <ReviewStateBlock
            title="這個狀態目前沒有暫存資料"
            description={status === 'pending' ? '可先啟動 crawler 或等待同步完成。' : '切換其他狀態分頁，或回到首頁查看整體進度。'}
            tone="neutral"
          />
        )}
      </div>

      <MvSheet
        key={mvSheetTargets.join('|') || 'empty'}
        opened={mvSheetOpened}
        busy={mvSheetBusy}
        title={mvSheetTargets.length > 1 ? `批次通過 ${mvSheetTargets.length} 筆暫存` : '通過並關聯 MV / Tag'}
        description={mvSheetTargets.length > 1 ? '這次選擇會套用到所有選取項目。' : '可直接帶入 MV 與特殊標籤，保持與桌面版一致。'}
        confirmText={mvSheetTargets.length > 1 ? '批次通過' : '通過'}
        onClose={() => {
          setMvSheetOpened(false)
          setMvSheetTargets([])
        }}
        onConfirm={handleMvConfirm}
        mvs={mvs}
      />

      <Sheet
        className="review-sheet"
        opened={crawlerSheetOpened}
        onSheetClosed={() => setCrawlerSheetOpened(false)}
        backdrop
        swipeToClose
        style={{ height: 'auto' }}
      >
        <Toolbar>
          <div className="left" style={{ paddingLeft: 16, fontWeight: 700 }}>Crawler / Sync</div>
          <div className="right" style={{ paddingRight: 16 }}>
            <Link sheetClose>關閉</Link>
          </div>
        </Toolbar>
        <PageContent>
          <Block strong inset className="review-surface review-fade-up">
            <div className="review-form-grid">
              <label className="review-form-label">
                <div className="review-form-label-title">Search Terms</div>
                <input
                  type="text"
                  value={crawlerForm.searchTerms}
                  onChange={(event) => setCrawlerForm((prev) => ({ ...prev, searchTerms: event.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12 }}
                />
              </label>
              <div className="review-form-split">
                <label className="review-form-label">
                  <div className="review-form-label-title">開始日期</div>
                  <input
                    type="date"
                    value={crawlerForm.startDate}
                    onChange={(event) => setCrawlerForm((prev) => ({ ...prev, startDate: event.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12 }}
                  />
                </label>
                <label className="review-form-label">
                  <div className="review-form-label-title">結束日期</div>
                  <input
                    type="date"
                    value={crawlerForm.endDate}
                    onChange={(event) => setCrawlerForm((prev) => ({ ...prev, endDate: event.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12 }}
                  />
                </label>
                <label className="review-form-label">
                  <div className="review-form-label-title">最大抓取數量</div>
                  <input
                    type="number"
                    min="1"
                    value={crawlerForm.maxItems}
                    onChange={(event) => setCrawlerForm((prev) => ({ ...prev, maxItems: event.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12 }}
                  />
                </label>
              </div>
            </div>
            <div style={{ marginTop: 14, opacity: 0.75, fontSize: 13 }}>
              目前狀態：{getProgressLabel(syncProgress)}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <Button fill onClick={() => void handleTriggerCrawler()} loading={triggeringCrawler}>開始抓取</Button>
              <Button outline onClick={() => void loadProgress()}>只更新進度</Button>
            </div>
          </Block>
        </PageContent>
      </Sheet>

      {detailItem && (
        <Popup className="review-popup" opened onPopupClosed={() => setDetailItem(null)}>
          <View>
            <Page>
              <Navbar>
                <NavLeft>
                  <Link popupClose>關閉</Link>
                </NavLeft>
                <NavTitle>暫存詳情</NavTitle>
                <NavRight>
                  <Badge color={getStatusBadgeColor(detailItem.status)}>{detailItem.status}</Badge>
                </NavRight>
              </Navbar>

              <Block strong inset className="review-surface">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{detailItem.author_name || detailItem.author_handle}</div>
                    <div style={{ opacity: 0.75, marginTop: 6 }}>@{detailItem.author_handle} · {formatDateTime(detailItem.post_date)}</div>
                  </div>
                  <div style={{ textAlign: 'right', opacity: 0.75 }}>
                    <div>❤️ {formatCount(detailItem.like_count)}</div>
                    <div>🔁 {formatCount(detailItem.retweet_count)}</div>
                    <div>👁 {formatCount(detailItem.view_count)}</div>
                  </div>
                </div>
              </Block>

              <Block strong inset className="review-surface">
                <div className="review-media-frame">
                  {detailItem.media_type === 'video' ? (
                    <video
                      src={detailItem.r2_url || detailItem.media_url}
                      poster={detailItem.thumbnail_url || undefined}
                      controls
                      playsInline
                      style={{ width: '100%', display: 'block', maxHeight: '56vh' }}
                    />
                  ) : (
                    <img
                      src={detailItem.r2_url || detailItem.media_url}
                      alt={detailItem.author_name}
                      style={{ width: '100%', display: 'block', maxHeight: '56vh', objectFit: 'contain' }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <a href={detailItem.original_url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>原始推文</a>
                  <a href={detailItem.media_url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>媒體來源</a>
                  {detailItem.r2_url && (
                    <a href={detailItem.r2_url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>R2 檔案</a>
                  )}
                </div>
              </Block>

              <BlockTitle>推文與標籤</BlockTitle>
              <List inset strong>
                <ListItem title="Tweet ID" after={detailItem.tweet_id} />
                <ListItem title="Hashtags" text={detailItem.hashtags.length > 0 ? detailItem.hashtags.join(' ') : '（無）'} />
                <ListItem title="媒體尺寸" text={detailItem.media_width && detailItem.media_height ? `${detailItem.media_width} x ${detailItem.media_height}` : '未知'} />
                <ListItem title="抓取時間" text={formatDateTime(detailItem.crawled_at)} />
              </List>

              <BlockTitle>推文內容</BlockTitle>
              <Block strong inset>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{detailItem.source_text || '（無推文文字）'}</div>
              </Block>

              <Block strong inset className="review-surface">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {detailItem.status === 'pending' && (
                    <>
                      <Button fill onClick={() => openApproveSheet([detailItem.id])} disabled={busyIds.has(detailItem.id)}>通過並關聯 MV</Button>
                      <Button outline color="red" onClick={() => requestReject([detailItem.id])} disabled={busyIds.has(detailItem.id)}>拒絕</Button>
                    </>
                  )}
                  {detailItem.status === 'rejected' && (
                    <Button fill tonal color="orange" onClick={() => requestRestore([detailItem.id])} disabled={busyIds.has(detailItem.id)}>
                      恢復為待審
                    </Button>
                  )}
                </div>
              </Block>
            </Page>
          </View>
        </Popup>
      )}
    </Page>
  )
}
