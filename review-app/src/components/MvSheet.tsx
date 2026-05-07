import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import { Popup, Page, Navbar, NavTitle, NavRight, List, ListItem, Block, Searchbar, Link, Chip, Badge } from 'framework7-react'
import Button from './Button'
import ReviewStateBlock from './ReviewStateBlock'

const TAG_OPTIONS = [
  { id: 'tag:collab', label: '合作' },
  { id: 'tag:acane', label: 'Acane' },
  { id: 'tag:real', label: '真人' },
  { id: 'tag:uniguri', label: 'Uniguri' },
  { id: 'tag:other', label: '其他' },
]

const EMPTY_SELECTION: string[] = []

interface MvSheetProps {
  opened: boolean
  onClose: () => void
  onCancel?: () => void
  onConfirm: (mvIds: string[], tags: string[]) => void
  mvs: Array<{ id: string; title: string }>
  title?: string
  confirmText?: string
  description?: string
  initialMvIds?: string[]
  initialTags?: string[]
  busy?: boolean
}

export default function MvSheet({
  opened,
  onClose,
  onCancel,
  onConfirm,
  mvs,
  title = '選擇 MV / 標籤',
  confirmText = '確認',
  description,
  initialMvIds = EMPTY_SELECTION,
  initialTags = EMPTY_SELECTION,
  busy = false,
}: MvSheetProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMvIds, setSelectedMvIds] = useState<string[]>(() => initialMvIds)
  const [selectedTags, setSelectedTags] = useState<string[]>(() => initialTags)
  const [cancelled, setCancelled] = useState(false)
  const totalSelected = selectedMvIds.length + selectedTags.length

  const filteredMvs = useMemo(() => {
    if (!searchQuery.trim()) return mvs
    const q = searchQuery.toLowerCase()
    return mvs.filter(mv => mv.title.toLowerCase().includes(q))
  }, [mvs, searchQuery])

  const selectedMvTitles = useMemo(() => {
    if (selectedMvIds.length === 0) return []
    const selectedSet = new Set(selectedMvIds)
    return mvs.filter((mv) => selectedSet.has(mv.id)).map((mv) => mv.title)
  }, [mvs, selectedMvIds])

  const selectedTagLabels = useMemo(() => {
    if (selectedTags.length === 0) return []
    const selectedSet = new Set(selectedTags)
    return TAG_OPTIONS.filter((tag) => selectedSet.has(tag.id)).map((tag) => tag.label)
  }, [selectedTags])

  const toggleMv = (id: string) => {
    setSelectedMvIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleTag = (id: string) => {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleConfirm = () => {
    if (totalSelected === 0 || busy) return
    onConfirm(selectedMvIds, selectedTags)
  }

  const resetState = () => {
    setSelectedMvIds([])
    setSelectedTags([])
    setSearchQuery('')
  }

  const handleClosed = () => {
    const shouldReturn = cancelled
    setCancelled(false)
    resetState()
    if (shouldReturn) {
      onCancel?.()
    }
    onClose()
  }

  const handleOpen = () => {
    setSelectedMvIds([...initialMvIds])
    setSelectedTags([...initialTags])
    setSearchQuery('')
    setCancelled(false)
  }

  return (
    <Popup opened={opened} onPopupOpen={handleOpen} onPopupClosed={handleClosed}>
      <Page pageContent={false} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Navbar>
          <NavTitle>{title}</NavTitle>
          <NavRight>
            <Link popupClose onClick={() => setCancelled(true)}>取消</Link>
          </NavRight>
        </Navbar>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: 'calc(var(--f7-navbar-height) + 8px) 0 12px',
          }}
        >
          <div style={{ margin: '0 16px 8px' }}>
            {description && (
              <div style={{ opacity: 0.75, fontSize: 13, lineHeight: 1.5 }}>{description}</div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: description ? 10 : 0 }}>
              <Badge color="blue">MV {selectedMvIds.length}</Badge>
              <Badge color="purple">標籤 {selectedTags.length}</Badge>
              <Badge color={totalSelected > 0 ? 'green' : 'gray'}>已選 {totalSelected}</Badge>
            </div>
          </div>

          <div style={{ margin: '0 16px 8px' }}>
            <Searchbar
              customSearch
              value={searchQuery}
              onInput={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value || '')}
              placeholder="搜尋 MV..."
              disableButtonText="清除"
            />
          </div>

          <Block strong inset style={{ marginTop: 0, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>已選內容</div>
                <div style={{ marginTop: 4, opacity: 0.75, fontSize: 13 }}>
                  先完成選擇，再用底部主按鈕一次保存。
                </div>
              </div>
              {totalSelected > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button small outline onClick={() => setSelectedMvIds([])}>
                    清空 MV
                  </Button>
                  <Button small outline onClick={() => setSelectedTags([])}>
                    清空標籤
                  </Button>
                </div>
              )}
            </div>
            {totalSelected > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {selectedMvTitles.map((title) => (
                  <Chip key={title} text={title} />
                ))}
                {selectedTagLabels.map((label) => (
                  <Chip key={label} text={`標籤: ${label}`} />
                ))}
              </div>
            )}
            {totalSelected === 0 && (
              <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
                尚未選擇任何 MV 或標籤。
              </div>
            )}
          </Block>

          <div style={{ margin: '0 16px 8px' }}>
            <div style={{ fontWeight: 700 }}>音樂影片</div>
            <div style={{ marginTop: 4, opacity: 0.7, fontSize: 13 }}>
              可搜尋後勾選；找不到也可以只保存標籤。
            </div>
          </div>
          <List inset strong dividers style={{ marginTop: 0, marginBottom: 12 }}>
            {filteredMvs.map(mv => (
              <ListItem key={mv.id} title={mv.title} checkbox checked={selectedMvIds.includes(mv.id)} onChange={() => toggleMv(mv.id)} />
            ))}
            {filteredMvs.length === 0 && (
              <ReviewStateBlock
                title="找不到符合條件的 MV"
                description="可先清空搜尋字詞，或只選擇特殊標籤再送出。"
                tone="warning"
                compact
              />
            )}
          </List>

          <div style={{ margin: '0 16px 8px' }}>
            <div style={{ fontWeight: 700 }}>特殊標籤</div>
            <div style={{ marginTop: 4, opacity: 0.7, fontSize: 13 }}>
              標籤會和 MV 一起保存，也可單獨使用。
            </div>
          </div>
          <List inset strong dividers style={{ marginTop: 0, marginBottom: 0 }}>
            {TAG_OPTIONS.map(tag => (
              <ListItem key={tag.id} title={tag.label} checkbox checked={selectedTags.includes(tag.id)} onChange={() => toggleTag(tag.id)} />
            ))}
          </List>
        </div>

        <div
          style={{
            flexShrink: 0,
            position: 'relative',
            zIndex: 30,
            padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
            background: 'var(--f7-page-bg-color)',
            borderTop: '1px solid rgba(127, 127, 127, 0.16)',
            boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Button fill large onClick={handleConfirm} loading={busy} disabled={busy || totalSelected === 0}>
            {totalSelected === 0 ? '請先選擇 MV / 標籤' : `${confirmText}（已選 ${totalSelected} 項）`}
          </Button>
          <div style={{ textAlign: 'center', marginTop: 8, opacity: 0.7, fontSize: 13 }}>
            {totalSelected === 0 ? '至少選擇一個 MV 或標籤後才可保存。' : '確認本次選擇後再保存關聯。'}
          </div>
        </div>
      </Page>
    </Popup>
  )
}
