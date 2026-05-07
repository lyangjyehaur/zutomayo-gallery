import { Badge, Block, List, ListItem, Navbar, Page } from 'framework7-react'
import Button from '../components/Button'
import { preferTwimgUrl } from '../lib/media'
import type { FanartGroup } from '../lib/api'

interface FanartGroupDetailPageProps {
  group?: FanartGroup
  onRestore?: () => void
  groupBusy?: boolean
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '未提供'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function FanartGroupDetailPage({
  group,
  onRestore,
  groupBusy = false,
}: FanartGroupDetailPageProps) {
  if (!group) {
    return (
      <Page>
        <Navbar title="已丟棄群組" backLink="返回" />
        <Block strong inset>
          找不到詳情資料，請返回列表重新開啟。
        </Block>
      </Page>
    )
  }

  const cover = Array.isArray(group.media) ? group.media[0] : undefined
  const previewUrl = cover ? preferTwimgUrl(cover.original_url, cover.url) : ''
  const posterUrl = cover ? preferTwimgUrl(cover.thumbnail_url, cover.original_url, cover.url) : ''

  return (
    <Page>
      <Navbar title="已丟棄群組" backLink="返回" />

      <Block strong inset>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: cover ? 12 : 0 }}>
          <Badge color="red">{Array.isArray(group.media) ? group.media.length : 0} 媒體</Badge>
        </div>
        {cover && (
          <div>
            {cover.media_type === 'video' ? (
              <video
                src={previewUrl || undefined}
                poster={posterUrl || undefined}
                controls
                playsInline
                style={{ width: '100%', display: 'block', maxHeight: '56vh' }}
              />
            ) : (
              <img
                src={previewUrl || undefined}
                alt={group.author_name || group.id}
                style={{ width: '100%', display: 'block', maxHeight: '56vh', objectFit: 'contain' }}
              />
            )}
          </div>
        )}
      </Block>

      <List inset strong>
        <ListItem title="Group ID" after={group.id} />
        <ListItem title="作者" text={group.author_name || group.author_handle || '未提供'} />
        <ListItem title="發文時間" text={formatDateTime(group.post_date)} />
        <ListItem title="來源網址" text={group.source_url || '未提供'} />
        <ListItem title="推文內容" text={group.source_text || '（無）'} />
      </List>

      <Block strong inset>
        <Button fill tonal color="orange" onClick={onRestore} disabled={groupBusy}>
          還原回未整理
        </Button>
      </Block>
    </Page>
  )
}
