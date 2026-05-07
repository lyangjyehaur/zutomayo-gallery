import { useMemo, useState } from 'react'
import { Sheet, PageContent, Toolbar, List, ListItem, BlockTitle, Block, Button, Searchbar, Link } from 'framework7-react'
import ReviewStateBlock from './ReviewStateBlock'

const TAG_OPTIONS = [
  { id: 'tag:collab', label: '合作' },
  { id: 'tag:acane', label: 'Acane' },
  { id: 'tag:real', label: '真人' },
  { id: 'tag:uniguri', label: 'Uniguri' },
  { id: 'tag:other', label: '其他' },
]

interface MvSheetProps {
  opened: boolean
  onClose: () => void
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
  onConfirm,
  mvs,
  title = '選擇 MV / 標籤',
  confirmText = '確認',
  description,
  initialMvIds = [],
  initialTags = [],
  busy = false,
}: MvSheetProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMvIds, setSelectedMvIds] = useState<string[]>(() => initialMvIds)
  const [selectedTags, setSelectedTags] = useState<string[]>(() => initialTags)

  const filteredMvs = useMemo(() => {
    if (!searchQuery.trim()) return mvs
    const q = searchQuery.toLowerCase()
    return mvs.filter(mv => mv.title.toLowerCase().includes(q))
  }, [mvs, searchQuery])

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
    onConfirm(selectedMvIds, selectedTags)
    setSelectedMvIds([])
    setSelectedTags([])
    setSearchQuery('')
  }

  const handleClose = () => {
    setSelectedMvIds([])
    setSelectedTags([])
    setSearchQuery('')
    onClose()
  }

  return (
    <Sheet className="review-sheet" opened={opened} onSheetClosed={handleClose} backdrop swipeToClose style={{ height: '75vh' }}>
      <Toolbar>
        <div className="left" />
        <div className="right">
          <Link sheetClose onClick={handleClose}>取消</Link>
        </div>
      </Toolbar>
      <PageContent>
        <Block strong inset className="review-panel-block review-fade-up" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>{title}</div>
          {description && (
            <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13 }}>{description}</div>
          )}
        </Block>

        <Block strong inset className="review-surface review-toolbar-card review-fade-up review-fade-up-delay-1">
          <div className="review-toolbar-search">
            <Searchbar
              customSearch
              value={searchQuery}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value || '')}
              placeholder="搜尋 MV..."
              disableButtonText="清除"
            />
          </div>
          <div className="review-toolbar-summary">
            已選 MV {selectedMvIds.length} 項、標籤 {selectedTags.length} 項；手機可直接捲動清單、平板則保留較高資訊密度。
          </div>
        </Block>

        <BlockTitle>音樂影片</BlockTitle>
        <List className="review-list review-fade-up review-fade-up-delay-2" style={{ maxHeight: '35vh', overflowY: 'auto' }}>
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

        <BlockTitle>標籤</BlockTitle>
        <List className="review-list review-fade-up review-fade-up-delay-3">
          {TAG_OPTIONS.map(tag => (
            <ListItem key={tag.id} title={tag.label} checkbox checked={selectedTags.includes(tag.id)} onChange={() => toggleTag(tag.id)} />
          ))}
        </List>

        <Block className="review-fade-up review-fade-up-delay-3">
          <Button fill large onClick={handleConfirm} loading={busy}>
            {confirmText}（已選 {selectedMvIds.length + selectedTags.length} 項）
          </Button>
        </Block>
      </PageContent>
    </Sheet>
  )
}
