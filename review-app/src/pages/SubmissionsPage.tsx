import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Block,
  BlockTitle,
  Link,
  List,
  ListInput,
  ListItem,
  Navbar,
  NavLeft,
  NavRight,
  NavTitle,
  Page,
  PageContent,
  Popup,
  Searchbar,
  Sheet,
  SwipeoutActions,
  SwipeoutButton,
  Tab,
  Tabs,
  Toolbar,
  ToolbarPane,
  f7,
} from 'framework7-react'
import AppNavbar from '../components/AppNavbar'
import Button from '../components/Button'
import ReviewStateBlock from '../components/ReviewStateBlock'
import ReviewSummaryPanel from '../components/ReviewSummaryPanel'
import Segmented from '../components/Segmented'
import ReviewToolbarCard from '../components/ReviewToolbarCard'
import { useWorkspace } from '../hooks/useWorkspace'
import { preferTwimgUrl } from '../lib/media'
import { approveSubmission, fetchSubmissions, rejectSubmission, type Submission } from '../lib/api'
import type { SubmissionStatus } from '../contexts/WorkspaceContext'

const PAGE_SIZE = 20

const formatDate = (value?: string | null) => {
  if (!value) return '未提供'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const getStatusBadgeColor = (status: SubmissionStatus) => {
  if (status === 'approved') return 'green'
  if (status === 'rejected') return 'red'
  return 'orange'
}

const getMediaPreview = (item: Submission) => {
  const firstMedia = item.media[0]
  if (!firstMedia) return null
  if (firstMedia.media_type === 'image') {
    return preferTwimgUrl(firstMedia.original_url, firstMedia.r2_url)
  }
  return preferTwimgUrl(firstMedia.thumbnail_url, firstMedia.original_url, firstMedia.r2_url)
}

const buildSearchText = (item: Submission) => {
  const submitterName = item.submitter?.display_name || ''
  const mvText = item.mvs.map((mv) => mv.title).join(' ')
  const tagsText = item.special_tags.join(' ')
  const mediaUrls = item.media
    .flatMap((media) => [media.original_url, media.r2_url, media.thumbnail_url])
    .filter(Boolean)
    .join(' ')

  return [
    item.id,
    submitterName,
    item.note,
    item.review_reason,
    mvText,
    tagsText,
    mediaUrls,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export default function SubmissionsPage() {
  const { filters, setSubmissionFilter, visitWorkspace } = useWorkspace()
  const [status, setStatus] = useState<SubmissionStatus>(filters.submissions.status)
  const [query, setQuery] = useState(filters.submissions.query)
  const [items, setItems] = useState<Submission[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [counts, setCounts] = useState<Record<SubmissionStatus, number>>({ pending: 0, approved: 0, rejected: 0 })
  const [detailItem, setDetailItem] = useState<Submission | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Submission | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const pageRef = useRef(1)
  const allowInfinite = useRef(true)

  const setBusy = useCallback((id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const loadCounts = useCallback(async (silent = false) => {
    try {
      const [pending, approved, rejected] = await Promise.all([
        fetchSubmissions('pending', 1, 1),
        fetchSubmissions('approved', 1, 1),
        fetchSubmissions('rejected', 1, 1),
      ])
      setCounts({
        pending: Number(pending.meta?.total || 0),
        approved: Number(approved.meta?.total || 0),
        rejected: Number(rejected.meta?.total || 0),
      })
    } catch {
      if (!silent) {
        f7.toast.create({ text: '投稿統計載入失敗', closeTimeout: 2000 }).open()
      }
    }
  }, [])

  const loadItems = useCallback(async (nextStatus: SubmissionStatus, pageNum: number, reset = false) => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetchSubmissions(nextStatus, pageNum, PAGE_SIZE)
      const newItems = Array.isArray(response.data) ? response.data : []
      setItems((prev) => (reset ? newItems : [...prev, ...newItems]))

      const totalPages = Number(response.meta?.totalPages || 0)
      const nextHasMore = totalPages > 0 ? pageNum < totalPages : newItems.length >= PAGE_SIZE
      setHasMore(nextHasMore)
      allowInfinite.current = nextHasMore
    } catch {
      setLoadError('投稿資料暫時無法載入，請稍後重新整理或切換分頁再試。')
      f7.toast.create({ text: '投稿清單載入失敗', closeTimeout: 2000 }).open()
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
    visitWorkspace('submissions')
  }, [visitWorkspace])

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return items
    return items.filter((item) => buildSearchText(item).includes(keyword))
  }, [items, query])

  const handleRefresh = (done: () => void) => {
    Promise.all([reloadCurrentStatus(), loadCounts(true)]).finally(done)
  }

  const handleStatusChange = (nextStatus: SubmissionStatus) => {
    if (nextStatus === status) return
    resetPagination()
    setItems([])
    setStatus(nextStatus)
    setSubmissionFilter({ status: nextStatus })
    void loadItems(nextStatus, 1, true)
  }

  const handleQueryInput = (value: string) => {
    setQuery(value)
    setSubmissionFilter({ query: value })
  }

  const handlePageBeforeIn = () => {
    visitWorkspace('submissions')
    void loadCounts(true)

    if (filters.submissions.query !== query) {
      setQuery(filters.submissions.query)
    }

    if (filters.submissions.status !== status) {
      resetPagination()
      setItems([])
      setStatus(filters.submissions.status)
      void loadItems(filters.submissions.status, 1, true)
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

  const finalizeMutation = useCallback(async (id: string, successText: string) => {
    setDetailItem((prev) => (prev?.id === id ? null : prev))
    setRejectTarget((prev) => (prev?.id === id ? null : prev))
    setRejectReason('')
    await Promise.all([reloadCurrentStatus(), loadCounts(true)])
    f7.toast.create({ text: successText, closeTimeout: 1800 }).open()
  }, [loadCounts, reloadCurrentStatus])

  const handleApprove = useCallback(async (id: string) => {
    setBusy(id, true)
    try {
      const result = await approveSubmission(id)
      if (!result?.success) throw new Error('APPROVE_FAILED')
      await finalizeMutation(id, '已通過投稿')
    } catch {
      f7.toast.create({ text: '通過失敗', closeTimeout: 2200 }).open()
    } finally {
      setBusy(id, false)
    }
  }, [finalizeMutation, setBusy])

  const openRejectSheet = (item: Submission) => {
    setRejectTarget(item)
    setRejectReason(item.review_reason || '')
  }

  const handleRejectSubmit = useCallback(async () => {
    if (!rejectTarget) return

    const reason = rejectReason.trim()
    if (!reason) {
      f7.dialog.alert('退回原因為必填')
      return
    }

    setBusy(rejectTarget.id, true)
    try {
      const result = await rejectSubmission(rejectTarget.id, reason)
      if (!result?.success) throw new Error('REJECT_FAILED')
      await finalizeMutation(rejectTarget.id, '已退回投稿')
    } catch {
      f7.toast.create({ text: '退回失敗', closeTimeout: 2200 }).open()
    } finally {
      setBusy(rejectTarget.id, false)
    }
  }, [finalizeMutation, rejectReason, rejectTarget, setBusy])

  const renderListContent = (currentStatus: SubmissionStatus) => {
    if (status !== currentStatus) return null

    return (
      <>
        {loadError && !loading && items.length === 0 ? (
          <ReviewStateBlock
            title="投稿清單載入失敗"
            description={loadError}
            tone="danger"
            actionText="重新載入"
            onAction={() => void reloadCurrentStatus()}
          />
        ) : loading && items.length === 0 ? (
          <ReviewStateBlock
            title="正在同步投稿清單"
            description="會依目前分頁狀態與搜尋條件重建列表。"
            tone="info"
            loading
          />
        ) : (
        <List mediaList inset strong dividers style={{ marginTop: 12, marginBottom: 12 }}>
          {filteredItems.map((item) => {
            const previewUrl = getMediaPreview(item)
            const mediaCount = item.media.length
            const displayName = item.submitter?.display_name || '匿名投稿者'
            const mvText = item.mvs.map((mv) => mv.title).join(' / ')
            const tagText = item.special_tags.map((tag) => tag.replace('tag:', '')).join(' / ')
            const subtitle = [mvText, tagText].filter(Boolean).join(' · ') || formatDate(item.submitted_at)
            const isBusy = busyIds.has(item.id)

            return (
              <ListItem
                key={item.id}
                swipeout={currentStatus === 'pending'}
                title={displayName}
                subtitle={subtitle}
                text={item.note || '（無留言）'}
                footer={`submitted: ${formatDate(item.submitted_at)}${item.reviewed_by ? ` · reviewer: ${item.reviewed_by}` : ''}`}
              >
                {previewUrl && (
                  <img
                    slot="media"
                    src={previewUrl}
                    style={{ borderRadius: 8, width: 80, height: 80, objectFit: 'cover' }}
                  />
                )}
                {mediaCount > 1 && <Badge slot="after-start" color="gray">{mediaCount}</Badge>}
                <Button
                  slot="after"
                  small
                  tonal
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setDetailItem(item)
                  }}
                >
                  詳情
                </Button>
                {item.review_reason && currentStatus !== 'pending' && (
                  <div slot="text" style={{ color: 'var(--f7-theme-color)', whiteSpace: 'pre-wrap' }}>
                    退回原因：{item.review_reason}
                  </div>
                )}
                {currentStatus === 'pending' && (
                  <>
                    <SwipeoutActions left>
                      <SwipeoutButton overswipe color="green" close onClick={() => { if (isBusy) return; void handleApprove(item.id) }}>
                        通過
                      </SwipeoutButton>
                    </SwipeoutActions>
                    <SwipeoutActions right>
                      <SwipeoutButton overswipe color="red" close onClick={() => { if (isBusy) return; openRejectSheet(item) }}>
                        退回
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
            title="正在載入更多投稿"
            description="向下滑動時會自動追加下一頁資料。"
            tone="info"
            loading
            compact
          />
        )}

        {!loading && items.length > 0 && filteredItems.length === 0 && (
          <ReviewStateBlock
            title="沒有符合搜尋條件的投稿"
            description="可切換狀態、清除搜尋，或繼續向下滑載入更多資料。"
            tone="warning"
            compact
          />
        )}

        {!hasMore && filteredItems.length > 0 && (
          <div style={{ margin: '8px 16px 12px', opacity: 0.75, fontSize: 13 }}>
            已載入到底，可切換狀態或調整搜尋條件繼續查看。
          </div>
        )}

        {!loading && items.length === 0 && (
          <ReviewStateBlock
            title="這個狀態目前沒有投稿"
            description={currentStatus === 'pending' ? '稍後如有新投稿，會在這裡顯示。' : '可切換到其他狀態，查看已通過或已退回紀錄。'}
            tone="neutral"
          />
        )}
      </>
    )
  }

  return (
    <Page
      ptr
      infinite
      infinitePreloader={false}
      infiniteDistance={50}
      onPtrRefresh={handleRefresh}
      onInfinite={handleInfinite}
      onPageBeforeIn={handlePageBeforeIn}
    >
      <AppNavbar title="投稿審核" subtitle="pending / approved / rejected" />

      <ReviewSummaryPanel
        title={`目前視圖 ${status}`}
        description={`已載入 ${items.length} 筆，搜尋後顯示 ${filteredItems.length} 筆。`}
        actions={(
          <>
            <Button small fill tonal onClick={() => void Promise.all([reloadCurrentStatus(), loadCounts(true)])}>刷新</Button>
            <Button small outline onClick={() => setDetailItem(filteredItems[0] || null)} disabled={filteredItems.length === 0}>看第一筆詳情</Button>
          </>
        )}
        metrics={[
          { label: '待審', value: counts.pending, color: 'orange' },
          { label: '已通過', value: counts.approved, color: 'green' },
          { label: '已退回', value: counts.rejected, color: 'red' },
        ]}
      />

      <Block>
        <Segmented strong>
          <Button active={status === 'pending'} onClick={() => handleStatusChange('pending')}>待審 {counts.pending}</Button>
          <Button active={status === 'approved'} onClick={() => handleStatusChange('approved')}>已通過 {counts.approved}</Button>
          <Button active={status === 'rejected'} onClick={() => handleStatusChange('rejected')}>已退回 {counts.rejected}</Button>
        </Segmented>
      </Block>

      <ReviewToolbarCard
       
        search={(
          <Searchbar
            disableButton={!query}
            placeholder="搜尋投稿者、MV、Tag、留言、退回原因或媒體 URL"
            value={query}
            onInput={(event) => handleQueryInput((event.target as HTMLInputElement).value || '')}
          />
        )}
        summary={(
          <>
            點進詳情可看完整媒體、作者資訊與審核結果；待審項目也支援 swipeout 快速處理。
            <div style={{ marginTop: 10 }}>
              <div>目前視圖 {status}</div>
              <div>已載入 {items.length}</div>
              <div>搜尋後 {filteredItems.length}</div>
            </div>
          </>
        )}
        actions={query ? <Link onClick={() => handleQueryInput('')}>清除搜尋</Link> : undefined}
      />

      <Tabs animated>
        <Tab id="submission-tab-pending" className="page-content" tabActive={status === 'pending'}>
          {renderListContent('pending')}
        </Tab>
        <Tab id="submission-tab-approved" className="page-content" tabActive={status === 'approved'}>
          {renderListContent('approved')}
        </Tab>
        <Tab id="submission-tab-rejected" className="page-content" tabActive={status === 'rejected'}>
          {renderListContent('rejected')}
        </Tab>
      </Tabs>

      <Popup opened={Boolean(detailItem)} onPopupClose={() => setDetailItem(null)}>
        {detailItem && (
          <Page>
              <Navbar>
                <NavLeft>
                  <Link onClick={() => setDetailItem(null)}>關閉</Link>
                </NavLeft>
                <NavTitle>投稿詳情</NavTitle>
                <NavRight>
                  <Badge color={getStatusBadgeColor(detailItem.status === 'approved' ? 'approved' : detailItem.status === 'rejected' ? 'rejected' : 'pending')}>
                    {detailItem.status}
                  </Badge>
                </NavRight>
              </Navbar>

          <Block strong inset>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{detailItem.submitter?.display_name || '匿名投稿者'}</div>
                <div style={{ opacity: 0.75, marginTop: 6 }}>submission: {detailItem.id}</div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>submitted: {formatDate(detailItem.submitted_at || detailItem.created_at)}</div>
                {detailItem.reviewed_at && (
                  <div style={{ opacity: 0.75, marginTop: 4 }}>reviewed: {formatDate(detailItem.reviewed_at)}</div>
                )}
              </Block>

              <BlockTitle>媒體預覽</BlockTitle>
              <Block strong inset>
                <div style={{ display: 'grid', gap: 12 }}>
                  {detailItem.media.map((media) => {
                    const previewUrl = media.media_type === 'video'
                      ? preferTwimgUrl(media.thumbnail_url, media.original_url, media.r2_url)
                      : preferTwimgUrl(media.original_url, media.r2_url, media.thumbnail_url)
                    return (
                      <div key={media.id}>
                        {media.media_type === 'video' ? (
                          <video src={previewUrl || undefined} controls playsInline style={{ width: '100%', display: 'block', maxHeight: '52vh' }} />
                        ) : (
                          <img src={previewUrl || undefined} alt="submission media" style={{ width: '100%', display: 'block', maxHeight: '52vh', objectFit: 'contain' }} />
                        )}
                        <div style={{ padding: 12, background: 'rgba(15, 23, 42, 0.78)', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <span>{media.media_type}</span>
                          <a href={media.original_url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>原始檔</a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Block>

              <BlockTitle>投稿資訊</BlockTitle>
              <List inset strong>
                <ListItem title="關聯 MV" text={detailItem.mvs.length > 0 ? detailItem.mvs.map((mv) => mv.title).join(' / ') : '（未選擇）'} />
                <ListItem title="特殊標籤" text={detailItem.special_tags.length > 0 ? detailItem.special_tags.join(' / ') : '（無）'} />
                <ListItem title="媒體數量" after={String(detailItem.media.length)} />
                <ListItem title="聯絡資訊" text={detailItem.contact || detailItem.submitter?.email_masked || detailItem.submitter?.email || '（未提供）'} />
                <ListItem title="社群連結" text={detailItem.submitter?.social_links ? Object.values(detailItem.submitter.social_links).filter(Boolean).join(' / ') : '（未提供）'} />
              </List>

              <BlockTitle>留言 / 審核結果</BlockTitle>
              <Block strong inset>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{detailItem.note || '（無留言）'}</div>
                {detailItem.review_reason && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(255, 59, 48, 0.1)', color: '#c62828' }}>
                    退回原因：{detailItem.review_reason}
                  </div>
                )}
              </Block>

            {detailItem.status === 'pending' && (
              <Block strong inset>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button fill onClick={() => void handleApprove(detailItem.id)} disabled={busyIds.has(detailItem.id)}>通過</Button>
                  <Button outline color="red" onClick={() => openRejectSheet(detailItem)} disabled={busyIds.has(detailItem.id)}>退回並填寫原因</Button>
                </div>
              </Block>
            )}
          </Page>
        )}
      </Popup>

      <Sheet
       
        opened={Boolean(rejectTarget)}
        onSheetClosed={() => {
          setRejectTarget(null)
          setRejectReason('')
        }}
        backdrop
        swipeToClose
        style={{ height: 'auto' }}
      >
        <Toolbar>
          <ToolbarPane>
            <div style={{ fontWeight: 700 }}>退回投稿</div>
            <Link sheetClose>關閉</Link>
          </ToolbarPane>
        </Toolbar>
        <PageContent>
          <Block strong inset>
            <div style={{ fontWeight: 700 }}>{rejectTarget?.submitter?.display_name || '匿名投稿者'}</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>退回原因會寫入投稿紀錄，投稿者稍後可看到。</div>
            <List form inset style={{ marginTop: 14, marginBottom: 0 }}>
              <ListInput
                label="退回原因"
                type="textarea"
                resizable
                value={rejectReason}
                onInput={(event) => setRejectReason((event.target as HTMLTextAreaElement).value)}
                placeholder="請清楚說明需修改的內容，例如：請補上 MV、避免重複投稿、請重新上傳較高解析度圖片。"
              />
            </List>
            <div style={{ opacity: 0.75, marginTop: 8, fontSize: 13 }}>目前 {rejectReason.trim().length} / 500 字</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <Button fill color="red" onClick={() => void handleRejectSubmit()} loading={rejectTarget ? busyIds.has(rejectTarget.id) : false}>
                送出退回
              </Button>
              <Button outline sheetClose>取消</Button>
            </div>
          </Block>
        </PageContent>
      </Sheet>
    </Page>
  )
}
