import { useMemo, useState } from 'react'
import { Sheet, PageContent, Toolbar, ToolbarPane, List, ListItem, BlockTitle, Block, Searchbar, Link, Chip } from 'framework7-react'
import Button from './Button'
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
        <ToolbarPane>
          <div />
          <Link sheetClose onClick={handleClose}>取消</Link>
        </ToolbarPane>
      </Toolbar>
      <PageContent>
        <Block strong inset style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>{title}</div>
          {description && (
            <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13 }}>{description}</div>
          )}
          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
            先選擇要關聯的 MV / 標籤，再點底部按鈕保存。
          </div>
        </Block>

        <Block strong inset>
          <div>
            <Searchbar
              customSearch
              value={searchQuery}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value || '')}
              placeholder="搜尋 MV..."
              disableButtonText="清除"
            />
          </div>
          <div style={{ marginTop: 10 }}>
            已選 MV {selectedMvIds.length} 項、標籤 {selectedTags.length} 項。
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
          {totalSelected > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button small outline onClick={() => setSelectedMvIds([])}>
                清空 MV
              </Button>
              <Button small outline onClick={() => setSelectedTags([])}>
                清空標籤
              </Button>
            </div>
          )}
        </Block>

        <Block strong inset style={{ marginTop: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>步驟 1：選擇要關聯的內容</div>
          <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
            可只選 MV、只選標籤，或兩者一起保存。
          </div>
        </Block>

        <BlockTitle>音樂影片</BlockTitle>
        <List style={{ maxHeight: '35vh', overflowY: 'auto' }}>
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
        <List>
          {TAG_OPTIONS.map(tag => (
            <ListItem key={tag.id} title={tag.label} checkbox checked={selectedTags.includes(tag.id)} onChange={() => toggleTag(tag.id)} />
          ))}
        </List>

        <Block>
          <Button fill large onClick={handleConfirm} loading={busy} disabled={busy || totalSelected === 0}>
            {totalSelected === 0 ? '請先選擇 MV / 標籤' : `${confirmText}（已選 ${totalSelected} 項）`}
          </Button>
          <div style={{ textAlign: 'center', marginTop: 8, opacity: 0.7, fontSize: 13 }}>
            步驟 2：確認本次選擇後，再保存關聯。
          </div>
        </Block>
      </PageContent>
    </Sheet>
  )
}
