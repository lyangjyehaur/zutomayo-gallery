import { Badge, Block, BlockTitle, List, ListItem, Navbar, Page } from 'framework7-react'
import Button from '../components/Button'
import { preferTwimgUrl } from '../lib/media'
import type { FanartMedia } from '../lib/api'

interface FanartMediaDetailPageProps {
  media?: FanartMedia
  view?: string
  onAssign?: () => void
  onUpdate?: () => void
  onDiscard?: () => void
  mediaBusy?: boolean
  groupBusy?: boolean
}

const TAG_LABELS: Record<string, string> = {
  'tag:collab': '綜合合繪',
  'tag:acane': 'ACAね',
  'tag:real': '實物',
  'tag:uniguri': '海膽栗子/生薑',
  'tag:other': '其他',
}

const formatTagLabel = (tag: string) => TAG_LABELS[tag] || tag.replace(/^tag:/, '')

const formatDateTime = (value?: string | null) => {
  if (!value) return '未提供'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function FanartMediaDetailPage({
  media,
  view,
  onAssign,
  onUpdate,
  onDiscard,
  mediaBusy = false,
  groupBusy = false,
}: FanartMediaDetailPageProps) {
  if (!media) {
    return (
      <Page>
        <Navbar title="FanArt 詳情" backLink="返回" />
        <Block strong inset>
          找不到詳情資料，請返回列表重新開啟。
        </Block>
      </Page>
    )
  }

  const previewUrl = preferTwimgUrl(media.original_url, media.url)
  const posterUrl = preferTwimgUrl(media.thumbnail_url, media.original_url, media.url)
  const tagLabels = media.tags || []

  return (
    <Page>
      <Navbar title="FanArt 詳情" backLink="返回" />

      <Block strong inset>
        {media.mvs && media.mvs.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Badge color="green">{media.mvs.length} MV</Badge>
          </div>
        )}
        <div>
          {media.media_type === 'video' ? (
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
              alt={media.group?.author_name || media.id}
              style={{ width: '100%', display: 'block', maxHeight: '56vh', objectFit: 'contain' }}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {media.group?.source_url && (
            <a href={media.group.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>
              原始推文
            </a>
          )}
          {media.original_url && (
            <a href={media.original_url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>
              原始媒體
            </a>
          )}
          {media.url && media.url !== media.original_url && (
            <a href={media.url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>
              R2 / 當前檔案
            </a>
          )}
        </div>
      </Block>

      <BlockTitle>來源資訊</BlockTitle>
      <List inset strong>
        <ListItem title="Media ID" after={media.id} />
        <ListItem title="作者" text={media.group?.author_name || media.group?.author_handle || '未提供'} />
        <ListItem title="發文時間" text={formatDateTime(media.group?.post_date)} />
        <ListItem title="來源網址" text={media.group?.source_url || '未提供'} />
        <ListItem title="標籤" text={tagLabels.length > 0 ? tagLabels.map((tag) => formatTagLabel(tag)).join(' / ') : '（無）'} />
        <ListItem title="關聯 MV" text={media.mvs && media.mvs.length > 0 ? media.mvs.map((mv) => mv.title).join(' / ') : '（無）'} />
      </List>

      <BlockTitle>推文內容</BlockTitle>
      <Block strong inset>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{media.group?.source_text || '（無推文文字）'}</div>
      </Block>

      <Block strong inset>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {view === 'unorganized' && (
            <>
              <Button fill onClick={onAssign} disabled={mediaBusy}>
                指派 MV / 標籤
              </Button>
              {media.group?.id && (
                <Button outline color="red" onClick={onDiscard} disabled={groupBusy}>
                  捨棄推文
                </Button>
              )}
            </>
          )}
          {view === 'organized' && (
            <Button fill tonal onClick={onUpdate} disabled={mediaBusy}>
              更新關聯
            </Button>
          )}
        </div>
      </Block>
    </Page>
  )
}
