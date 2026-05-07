import { useState, useEffect, useCallback, useRef } from 'react'
import { Page, Navbar, List, ListItem, SwipeoutActions, SwipeoutButton, Segmented, Button, Block, BlockTitle, f7 } from 'framework7-react'
import { fetchStagingFanarts, approveStagingFanart, rejectStagingFanart, restoreStagingFanart, fetchMvs } from '../lib/api'
import type { StagingFanart, MV } from '../lib/api'
import MvSheet from '../components/MvSheet'

export default function StagingPage() {
  const [status, setStatus] = useState<string>('pending')
  const [items, setItems] = useState<StagingFanart[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [mvs, setMvs] = useState<MV[]>([])
  const [mvSheetOpened, setMvSheetOpened] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const allowInfinite = useRef(true)

  useEffect(() => {
    fetchMvs().then(res => {
      if (res.success) setMvs(res.data || [])
    }).catch(() => {})
  }, [])

  const loadItems = useCallback(async (pageNum: number, reset = false) => {
    setLoading(true)
    try {
      const data = await fetchStagingFanarts(status, pageNum, 20)
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

  const openMvSheet = (id: string) => {
    setApprovingId(id)
    setMvSheetOpened(true)
  }

  const handleMvConfirm = async (mvIds: string[], tags: string[]) => {
    if (!approvingId) return
    try {
      await approveStagingFanart(approvingId, [...mvIds, ...tags])
      setItems(prev => prev.filter(i => i.id !== approvingId))
      f7.toast.create({ text: '已通過', closeTimeout: 1500 }).open()
    } catch {
      f7.dialog.alert('通過失敗')
    } finally {
      setApprovingId(null)
      setMvSheetOpened(false)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectStagingFanart(id)
      setItems(prev => prev.filter(i => i.id !== id))
      f7.toast.create({ text: '已拒絕', closeTimeout: 1500 }).open()
    } catch {
      f7.dialog.alert('拒絕失敗')
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await restoreStagingFanart(id)
      setItems(prev => prev.filter(i => i.id !== id))
      f7.toast.create({ text: '已恢復', closeTimeout: 1500 }).open()
    } catch {
      f7.dialog.alert('恢復失敗')
    }
  }

  const handleInfinite = () => {
    if (!allowInfinite.current || loading) return
    const nextPage = page + 1
    setPage(nextPage)
    loadItems(nextPage)
  }

  const formatCount = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }

  return (
    <Page ptr onPtrRefresh={handleRefresh} infinite infiniteDistance={50} onInfinite={handleInfinite}>
      <Navbar title="暫存審核" backLink="返回" />

      <Block>
        <Segmented strong>
          <Button active={status === 'pending'} onClick={() => setStatus('pending')}>待審</Button>
          <Button active={status === 'approved'} onClick={() => setStatus('approved')}>已通過</Button>
          <Button active={status === 'rejected'} onClick={() => setStatus('rejected')}>已拒絕</Button>
        </Segmented>
      </Block>

      <List mediaList>
        {items.map((item) => {
          const imgSrc = item.media_type === 'image' ? item.media_url : (item.thumbnail_url || item.media_url)
          const subtitle = `@${item.author_handle} · ❤️ ${formatCount(item.like_count)} 🔁 ${formatCount(item.retweet_count)} 👁 ${formatCount(item.view_count)}`

          if (status === 'rejected') {
            return (
              <ListItem
                key={item.id}
                title={item.author_name}
                subtitle={subtitle}
                text={item.source_text}
                after={new Date(item.post_date).toLocaleDateString()}
              >
                <img slot="media" src={imgSrc} style={{ borderRadius: '8px' }} width="80" />
                <Button slot="after" fill small color="orange" onClick={() => handleRestore(item.id)}>恢復</Button>
              </ListItem>
            )
          }

          return (
            <ListItem
              key={item.id}
              swipeout
              title={item.author_name}
              subtitle={subtitle}
              text={item.source_text}
              after={new Date(item.post_date).toLocaleDateString()}
            >
              <img slot="media" src={imgSrc} style={{ borderRadius: '8px' }} width="80" />
              {status === 'pending' && (
                <>
                  <SwipeoutActions left>
                    <SwipeoutButton overswipe color="green" close onClick={() => openMvSheet(item.id)}>通過</SwipeoutButton>
                  </SwipeoutActions>
                  <SwipeoutActions right>
                    <SwipeoutButton overswipe color="red" close onClick={() => handleReject(item.id)}>拒絕</SwipeoutButton>
                  </SwipeoutActions>
                </>
              )}
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

      <MvSheet
        opened={mvSheetOpened}
        onClose={() => { setMvSheetOpened(false); setApprovingId(null) }}
        onConfirm={handleMvConfirm}
        mvs={mvs}
      />
    </Page>
  )
}
