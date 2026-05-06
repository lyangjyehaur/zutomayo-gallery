import { useState, useEffect, useCallback, useRef } from 'react'
import { Page, Navbar, List, ListItem, SwipeoutActions, SwipeoutButton, Segmented, Button, Block, f7 } from 'framework7-react'
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
      f7.toast.create({ text: 'Failed to load', closeTimeout: 2000 }).open()
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
      f7.toast.create({ text: 'Approved', closeTimeout: 1500 }).open()
    } catch {
      f7.dialog.alert('Failed to approve')
    } finally {
      setApprovingId(null)
      setMvSheetOpened(false)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectStagingFanart(id)
      setItems(prev => prev.filter(i => i.id !== id))
      f7.toast.create({ text: 'Rejected', closeTimeout: 1500 }).open()
    } catch {
      f7.dialog.alert('Failed to reject')
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await restoreStagingFanart(id)
      setItems(prev => prev.filter(i => i.id !== id))
      f7.toast.create({ text: 'Restored', closeTimeout: 1500 }).open()
    } catch {
      f7.dialog.alert('Failed to restore')
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
      <Navbar title="Staging Review" backLink="Back" />

      <Block>
        <Segmented strong>
          <Button active={status === 'pending'} onClick={() => setStatus('pending')}>Pending</Button>
          <Button active={status === 'approved'} onClick={() => setStatus('approved')}>Approved</Button>
          <Button active={status === 'rejected'} onClick={() => setStatus('rejected')}>Rejected</Button>
        </Segmented>
      </Block>

      <List mediaList className="staging-list">
        {items.map((item) => {
          const imgSrc = item.media_type === 'image' ? item.media_url : (item.thumbnail_url || item.media_url)
          const isVideo = item.media_type === 'video'

          if (status === 'rejected') {
            return (
              <ListItem key={item.id} className="staging-card-item">
                <div className="staging-card" slot="content-start">
                  <div className="staging-card-media">
                    <img src={imgSrc} alt="" className="media-preview" />
                    {isVideo && <div className="video-overlay"><span className="play-icon">▶</span></div>}
                  </div>
                  <div className="staging-card-body">
                    <div className="staging-card-author">
                      <div className="author-avatar">{item.author_name.charAt(0)}</div>
                      <div className="author-info">
                        <span className="author-name">{item.author_name}</span>
                        <span className="author-handle">@{item.author_handle}</span>
                      </div>
                    </div>
                    <div className="staging-card-text">{item.source_text}</div>
                    <div className="staging-card-stats">
                      <span>❤️ {formatCount(item.like_count)}</span>
                      <span>🔁 {formatCount(item.retweet_count)}</span>
                      <span>👁 {formatCount(item.view_count)}</span>
                      <span className="staging-card-date">{new Date(item.post_date).toLocaleDateString()}</span>
                    </div>
                    <div className="staging-card-actions">
                      <Button fill small color="orange" onClick={() => handleRestore(item.id)}>Restore</Button>
                    </div>
                  </div>
                </div>
              </ListItem>
            )
          }

          return (
            <ListItem key={item.id} swipeout className="staging-card-item">
              <div className="staging-card" slot="content-start">
                <div className="staging-card-media">
                  <img src={imgSrc} alt="" className="media-preview" />
                  {isVideo && <div className="video-overlay"><span className="play-icon">▶</span></div>}
                </div>
                <div className="staging-card-body">
                  <div className="staging-card-author">
                    <div className="author-avatar">{item.author_name.charAt(0)}</div>
                    <div className="author-info">
                      <span className="author-name">{item.author_name}</span>
                      <span className="author-handle">@{item.author_handle}</span>
                    </div>
                  </div>
                  <div className="staging-card-text">{item.source_text}</div>
                  <div className="staging-card-stats">
                    <span>❤️ {formatCount(item.like_count)}</span>
                    <span>🔁 {formatCount(item.retweet_count)}</span>
                    <span>👁 {formatCount(item.view_count)}</span>
                    <span className="staging-card-date">{new Date(item.post_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {status === 'pending' && (
                <>
                  <SwipeoutActions left>
                    <SwipeoutButton overswipe color="green" close onClick={() => openMvSheet(item.id)}>Approve</SwipeoutButton>
                  </SwipeoutActions>
                  <SwipeoutActions right>
                    <SwipeoutButton overswipe color="red" close onClick={() => handleReject(item.id)}>Reject</SwipeoutButton>
                  </SwipeoutActions>
                </>
              )}
            </ListItem>
          )
        })}
      </List>

      {loading && items.length > 0 && (
        <Block className="text-align-center">
          <span style={{ color: 'rgba(232,230,240,0.5)' }}>Loading...</span>
        </Block>
      )}

      {!hasMore && items.length > 0 && (
        <Block className="text-align-center">
          <span style={{ color: 'rgba(232,230,240,0.3)' }}>— End of list —</span>
        </Block>
      )}

      {!loading && items.length === 0 && (
        <Block className="text-align-center">
          <span style={{ color: 'rgba(232,230,240,0.4)' }}>No items found</span>
        </Block>
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
