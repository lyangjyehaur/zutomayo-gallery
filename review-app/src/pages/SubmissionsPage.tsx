import { useState, useEffect, useCallback, useRef } from 'react'
import { Page, Navbar, List, ListItem, SwipeoutActions, SwipeoutButton, Segmented, Button, Block, BlockTitle, Badge, f7 } from 'framework7-react'
import { fetchSubmissions, approveSubmission, rejectSubmission } from '../lib/api'
import type { Submission } from '../lib/api'

export default function SubmissionsPage() {
  const [status, setStatus] = useState<string>('pending')
  const [items, setItems] = useState<Submission[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const allowInfinite = useRef(true)

  const loadItems = useCallback(async (pageNum: number, reset = false) => {
    setLoading(true)
    try {
      const data = await fetchSubmissions(status, pageNum, 20)
      const newItems = data.data || []
      if (reset) {
        setItems(newItems)
      } else {
        setItems(prev => [...prev, ...newItems])
      }
      setHasMore(newItems.length >= 20)
      allowInfinite.current = newItems.length >= 20
    } catch {
      f7.toast.create({ text: '載入失敗', closeTimeout: 2000 }).open()
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    setPage(1)
    setItems([])
    loadItems(1, true)
  }, [status, loadItems])

  const handleRefresh = (done: () => void) => {
    setPage(1)
    loadItems(1, true).then(() => done())
  }

  const handleApprove = async (id: string) => {
    try {
      await approveSubmission(id)
      setItems(prev => prev.filter(i => i.id !== id))
      f7.toast.create({ text: '已通過', closeTimeout: 1500 }).open()
    } catch {
      f7.dialog.alert('通過失敗')
    }
  }

  const handleReject = (id: string) => {
    f7.dialog.prompt('拒絕原因：', '拒絕投稿', async (reason) => {
      try {
        await rejectSubmission(id, reason)
        setItems(prev => prev.filter(i => i.id !== id))
        f7.toast.create({ text: '已拒絕', closeTimeout: 1500 }).open()
      } catch {
        f7.dialog.alert('拒絕失敗')
      }
    })
  }

  const handleInfinite = () => {
    if (!allowInfinite.current || loading) return
    const nextPage = page + 1
    setPage(nextPage)
    loadItems(nextPage)
  }

  const getMediaPreview = (item: Submission) => {
    const firstMedia = item.media[0]
    if (!firstMedia) return null
    if (firstMedia.media_type === 'image') {
      return firstMedia.r2_url || firstMedia.original_url
    }
    return firstMedia.thumbnail_url || firstMedia.r2_url || firstMedia.original_url
  }

  return (
    <Page ptr onPtrRefresh={handleRefresh} infinite infiniteDistance={50} onInfinite={handleInfinite}>
      <Navbar title="投稿審核" backLink="返回" />

      <Block>
        <Segmented strong>
          <Button active={status === 'pending'} onClick={() => setStatus('pending')}>待審</Button>
          <Button active={status === 'approved'} onClick={() => setStatus('approved')}>已通過</Button>
          <Button active={status === 'rejected'} onClick={() => setStatus('rejected')}>已拒絕</Button>
        </Segmented>
      </Block>

      <List mediaList>
        {items.map((item) => {
          const previewUrl = getMediaPreview(item)
          const isVideo = item.media[0]?.media_type === 'video'
          const mediaCount = item.media.length
          const displayName = item.submitter?.display_name || '未知'
          const dateStr = new Date(item.submitted_at).toLocaleDateString()
          const mvText = item.mvs.map(mv => mv.title).join(', ')
          const tagText = item.special_tags.map(t => t.replace('tag:', '')).join(', ')
          const subtitle = [mvText, tagText].filter(Boolean).join(' · ') || dateStr

          if (status === 'rejected') {
            return (
              <ListItem
                key={item.id}
                title={displayName}
                subtitle={subtitle}
                text={item.note || ''}
                after={dateStr}
              >
                {previewUrl && <img slot="media" src={previewUrl} style={{ borderRadius: '8px' }} width="80" />}
                {mediaCount > 1 && <Badge slot="after" color="gray">{mediaCount}</Badge>}
                {item.review_reason && (
                  <div slot="text" style={{ color: 'var(--f7-theme-color)' }}>
                    原因：{item.review_reason}
                  </div>
                )}
              </ListItem>
            )
          }

          if (status === 'approved') {
            return (
              <ListItem
                key={item.id}
                title={displayName}
                subtitle={subtitle}
                text={item.note || ''}
                after={dateStr}
              >
                {previewUrl && <img slot="media" src={previewUrl} style={{ borderRadius: '8px' }} width="80" />}
                {mediaCount > 1 && <Badge slot="after" color="gray">{mediaCount}</Badge>}
              </ListItem>
            )
          }

          return (
            <ListItem
              key={item.id}
              swipeout
              title={displayName}
              subtitle={subtitle}
              text={item.note || ''}
              after={dateStr}
            >
              {previewUrl && <img slot="media" src={previewUrl} style={{ borderRadius: '8px' }} width="80" />}
              {mediaCount > 1 && <Badge slot="after" color="gray">{mediaCount}</Badge>}
              <SwipeoutActions left>
                <SwipeoutButton overswipe color="green" close onClick={() => handleApprove(item.id)}>通過</SwipeoutButton>
              </SwipeoutActions>
              <SwipeoutActions right>
                <SwipeoutButton overswipe color="red" close onClick={() => handleReject(item.id)}>拒絕</SwipeoutButton>
              </SwipeoutActions>
            </ListItem>
          )
        })}
      </List>

      {loading && items.length > 0 && (
        <Block className="text-align-center">載入中...</Block>
      )}

      {!hasMore && items.length > 0 && (
        <Block className="text-align-center">— 已到底部 —</Block>
      )}

      {!loading && items.length === 0 && (
        <BlockTitle>暫無資料</BlockTitle>
      )}
    </Page>
  )
}
