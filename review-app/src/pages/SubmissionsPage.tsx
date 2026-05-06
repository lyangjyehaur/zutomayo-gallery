import { useState, useEffect, useCallback, useRef } from 'react'
import { Page, Navbar, List, ListItem, SwipeoutActions, SwipeoutButton, Segmented, Button, Block, Chip, f7 } from 'framework7-react'
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

  const handleApprove = async (id: string) => {
    try {
      await approveSubmission(id)
      setItems(prev => prev.filter(i => i.id !== id))
      f7.toast.create({ text: 'Approved', closeTimeout: 1500 }).open()
    } catch {
      f7.dialog.alert('Failed to approve')
    }
  }

  const handleReject = (id: string) => {
    f7.dialog.prompt('Reason for rejection:', 'Reject Submission', async (reason) => {
      try {
        await rejectSubmission(id, reason)
        setItems(prev => prev.filter(i => i.id !== id))
        f7.toast.create({ text: 'Rejected', closeTimeout: 1500 }).open()
      } catch {
        f7.dialog.alert('Failed to reject')
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
      <Navbar title="Submissions" backLink="Back" />

      <Block>
        <Segmented strong>
          <Button active={status === 'pending'} onClick={() => setStatus('pending')}>Pending</Button>
          <Button active={status === 'approved'} onClick={() => setStatus('approved')}>Approved</Button>
          <Button active={status === 'rejected'} onClick={() => setStatus('rejected')}>Rejected</Button>
        </Segmented>
      </Block>

      <List mediaList className="submission-list">
        {items.map((item) => {
          const previewUrl = getMediaPreview(item)
          const isVideo = item.media[0]?.media_type === 'video'
          const mediaCount = item.media.length

          if (status === 'rejected') {
            return (
              <ListItem key={item.id} className="submission-card-item">
                <div className="submission-card" slot="content-start">
                  {previewUrl && (
                    <div className="submission-card-media">
                      <img src={previewUrl} alt="" className="media-preview" />
                      {isVideo && <div className="video-overlay"><span className="play-icon">▶</span></div>}
                      {mediaCount > 1 && <div className="media-count-badge">{mediaCount}</div>}
                    </div>
                  )}
                  <div className="submission-card-body">
                    <div className="submission-card-author">
                      <div className="author-avatar">{(item.submitter?.display_name || '?').charAt(0)}</div>
                      <div className="author-info">
                        <span className="author-name">{item.submitter?.display_name || 'Unknown'}</span>
                        <span className="author-handle">{new Date(item.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {item.note && <div className="submission-card-text">{item.note}</div>}
                    <div className="submission-card-mvs">
                      {item.mvs.map(mv => (
                        <Chip key={mv.id} text={mv.title} style={{ '--f7-chip-bg-color': 'rgba(108,92,231,0.3)', '--f7-chip-text-color': '#00F5D4', '--f7-chip-height': '24px', '--f7-chip-font-size': '11px', margin: '2px' } as any} />
                      ))}
                      {item.special_tags.map(tag => (
                        <Chip key={tag} text={tag.replace('tag:', '')} style={{ '--f7-chip-bg-color': 'rgba(0,245,212,0.15)', '--f7-chip-text-color': '#00F5D4', '--f7-chip-height': '24px', '--f7-chip-font-size': '11px', margin: '2px' } as any} />
                      ))}
                    </div>
                    {item.review_reason && (
                      <div className="submission-card-reason">
                        <span style={{ color: '#ff6b6b', fontWeight: 600 }}>Reason: </span>
                        {item.review_reason}
                      </div>
                    )}
                  </div>
                </div>
              </ListItem>
            )
          }

          if (status === 'approved') {
            return (
              <ListItem key={item.id} className="submission-card-item">
                <div className="submission-card" slot="content-start">
                  {previewUrl && (
                    <div className="submission-card-media">
                      <img src={previewUrl} alt="" className="media-preview" />
                      {isVideo && <div className="video-overlay"><span className="play-icon">▶</span></div>}
                      {mediaCount > 1 && <div className="media-count-badge">{mediaCount}</div>}
                    </div>
                  )}
                  <div className="submission-card-body">
                    <div className="submission-card-author">
                      <div className="author-avatar">{(item.submitter?.display_name || '?').charAt(0)}</div>
                      <div className="author-info">
                        <span className="author-name">{item.submitter?.display_name || 'Unknown'}</span>
                        <span className="author-handle">{new Date(item.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {item.note && <div className="submission-card-text">{item.note}</div>}
                    <div className="submission-card-mvs">
                      {item.mvs.map(mv => (
                        <Chip key={mv.id} text={mv.title} style={{ '--f7-chip-bg-color': 'rgba(108,92,231,0.3)', '--f7-chip-text-color': '#00F5D4', '--f7-chip-height': '24px', '--f7-chip-font-size': '11px', margin: '2px' } as any} />
                      ))}
                      {item.special_tags.map(tag => (
                        <Chip key={tag} text={tag.replace('tag:', '')} style={{ '--f7-chip-bg-color': 'rgba(0,245,212,0.15)', '--f7-chip-text-color': '#00F5D4', '--f7-chip-height': '24px', '--f7-chip-font-size': '11px', margin: '2px' } as any} />
                      ))}
                    </div>
                  </div>
                </div>
              </ListItem>
            )
          }

          return (
            <ListItem key={item.id} swipeout className="submission-card-item">
              <div className="submission-card" slot="content-start">
                {previewUrl && (
                  <div className="submission-card-media">
                    <img src={previewUrl} alt="" className="media-preview" />
                    {isVideo && <div className="video-overlay"><span className="play-icon">▶</span></div>}
                    {mediaCount > 1 && <div className="media-count-badge">{mediaCount}</div>}
                  </div>
                )}
                <div className="submission-card-body">
                  <div className="submission-card-author">
                    <div className="author-avatar">{(item.submitter?.display_name || '?').charAt(0)}</div>
                    <div className="author-info">
                      <span className="author-name">{item.submitter?.display_name || 'Unknown'}</span>
                      <span className="author-handle">{new Date(item.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {item.note && <div className="submission-card-text">{item.note}</div>}
                  <div className="submission-card-mvs">
                    {item.mvs.map(mv => (
                      <Chip key={mv.id} text={mv.title} style={{ '--f7-chip-bg-color': 'rgba(108,92,231,0.3)', '--f7-chip-text-color': '#00F5D4', '--f7-chip-height': '24px', '--f7-chip-font-size': '11px', margin: '2px' } as any} />
                    ))}
                    {item.special_tags.map(tag => (
                      <Chip key={tag} text={tag.replace('tag:', '')} style={{ '--f7-chip-bg-color': 'rgba(0,245,212,0.15)', '--f7-chip-text-color': '#00F5D4', '--f7-chip-height': '24px', '--f7-chip-font-size': '11px', margin: '2px' } as any} />
                    ))}
                  </div>
                </div>
              </div>
              <SwipeoutActions left>
                <SwipeoutButton overswipe color="green" close onClick={() => handleApprove(item.id)}>Approve</SwipeoutButton>
              </SwipeoutActions>
              <SwipeoutActions right>
                <SwipeoutButton overswipe color="red" close onClick={() => handleReject(item.id)}>Reject</SwipeoutButton>
              </SwipeoutActions>
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
    </Page>
  )
}
