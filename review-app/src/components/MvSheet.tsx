import { useState, useMemo } from 'react'
import { Sheet, PageContent, Toolbar, List, ListItem, BlockTitle, Block, Button, Searchbar, Link } from 'framework7-react'

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
}

export default function MvSheet({ opened, onClose, onConfirm, mvs }: MvSheetProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMvIds, setSelectedMvIds] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

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
    <Sheet opened={opened} onSheetClosed={handleClose} backdrop swipeToClose style={{ height: '75vh' }}>
      <Toolbar>
        <div className="left" />
        <div className="right">
          <Link sheetClose onClick={handleClose}>取消</Link>
        </div>
      </Toolbar>
      <PageContent>
        <Searchbar
          customSearch
          value={searchQuery}
          onInput={(e: any) => setSearchQuery(e.target.value || '')}
          placeholder="搜尋 MV..."
          disableButtonText="清除"
        />

        <BlockTitle>音樂影片</BlockTitle>
        <List style={{ maxHeight: '35vh', overflowY: 'auto' }}>
          {filteredMvs.map(mv => (
            <ListItem key={mv.id} title={mv.title} checkbox checked={selectedMvIds.includes(mv.id)} onChange={() => toggleMv(mv.id)} />
          ))}
          {filteredMvs.length === 0 && (
            <ListItem title="未找到 MV" />
          )}
        </List>

        <BlockTitle>標籤</BlockTitle>
        <List>
          {TAG_OPTIONS.map(tag => (
            <ListItem key={tag.id} title={tag.label} checkbox checked={selectedTags.includes(tag.id)} onChange={() => toggleTag(tag.id)} />
          ))}
        </List>

        <Block>
          <Button fill large onClick={handleConfirm}>
            確認（已選 {selectedMvIds.length + selectedTags.length} 項）
          </Button>
        </Block>
      </PageContent>
    </Sheet>
  )
}
