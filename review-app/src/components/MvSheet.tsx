import { useState, useMemo } from 'react'
import { Sheet, Page, Navbar, List, ListItem, Checkbox, BlockTitle, Button, Searchbar, Block } from 'framework7-react'

const TAG_OPTIONS = [
  { id: 'tag:collab', label: 'Collab' },
  { id: 'tag:acane', label: 'Acane' },
  { id: 'tag:real', label: 'Real' },
  { id: 'tag:uniguri', label: 'Uniguri' },
  { id: 'tag:other', label: 'Other' },
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
    <Sheet
      opened={opened}
      onSheetClosed={handleClose}
      backdrop
      swipeToClose
      style={{ height: '75vh' }}
    >
      <Page style={{ background: '#0a0a12' }}>
        <Navbar title="Select MVs & Tags" style={{ background: 'rgba(18,18,24,0.95)' }}>
          <Button slot="right" onClick={handleClose} style={{ color: '#e8e6f0' }}>Cancel</Button>
        </Navbar>

        <Searchbar
          value={searchQuery}
          onInput={(e: any) => setSearchQuery(e.target.value || '')}
          placeholder="Search MVs..."
          disableButtonText="Clear"
          style={{ background: 'rgba(18,18,30,0.6)' }}
        />

        <BlockTitle style={{ color: '#00F5D4', marginTop: '8px' }}>Music Videos</BlockTitle>
        <List style={{ maxHeight: '35vh', overflowY: 'auto' }}>
          {filteredMvs.map(mv => (
            <ListItem
              key={mv.id}
              title={mv.title}
              style={{ color: '#e8e6f0' }}
            >
              <Checkbox
                slot="after"
                checked={selectedMvIds.includes(mv.id)}
                onChange={() => toggleMv(mv.id)}
                style={{ '--f7-checkbox-active-color': '#6C5CE7' } as any}
              />
            </ListItem>
          ))}
          {filteredMvs.length === 0 && (
            <ListItem title="No MVs found" style={{ color: 'rgba(232,230,240,0.4)' }} />
          )}
        </List>

        <BlockTitle style={{ color: '#00F5D4' }}>Tags</BlockTitle>
        <List>
          {TAG_OPTIONS.map(tag => (
            <ListItem
              key={tag.id}
              title={tag.label}
              style={{ color: '#e8e6f0' }}
            >
              <Checkbox
                slot="after"
                checked={selectedTags.includes(tag.id)}
                onChange={() => toggleTag(tag.id)}
                style={{ '--f7-checkbox-active-color': '#6C5CE7' } as any}
              />
            </ListItem>
          ))}
        </List>

        <Block>
          <Button
            fill
            large
            onClick={handleConfirm}
            style={{
              background: 'linear-gradient(135deg, #6C5CE7, #00F5D4)',
              color: '#0a0a12',
              fontWeight: 700,
            }}
          >
            Confirm ({selectedMvIds.length + selectedTags.length} selected)
          </Button>
        </Block>
      </Page>
    </Sheet>
  )
}
