import { Badge, Block, BlockTitle, List, ListItem, Navbar, Page } from 'framework7-react'
import Button from '../components/Button'
import { preferTwimgUrl } from '../lib/media'
import type { StagingFanart } from '../lib/api'
import type { StagingStatus } from '../contexts/WorkspaceContext'

interface StagingDetailPageProps {
  item?: StagingFanart
  onApprove?: () => void
  onReject?: () => void
  onRestore?: () => void
  busy?: boolean
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const formatCount = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(value)
}

const getStatusBadgeColor = (status: StagingStatus) => {
  if (status === 'approved') return 'green'
  if (status === 'rejected') return 'red'
  return 'orange'
}

export default function StagingDetailPage({
  item,
  onApprove,
  onReject,
  onRestore,
  busy = false,
}: StagingDetailPageProps) {
  if (!item) {
    return (
      <Page>
        <Navbar title="暫存詳情" backLink="返回" />
        <Block strong inset>
          找不到詳情資料，請返回列表重新開啟。
        </Block>
      </Page>
    )
  }

  return (
    <Page>
      <Navbar title="暫存詳情" backLink="返回" />

      <Block strong inset>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{item.author_name || item.author_handle}</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>@{item.author_handle} · {formatDateTime(item.post_date)}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <Badge color={getStatusBadgeColor(item.status)}>{item.status}</Badge>
            </div>
          </div>
          <div style={{ textAlign: 'right', opacity: 0.75 }}>
            <div>❤️ {formatCount(item.like_count)}</div>
            <div>🔁 {formatCount(item.retweet_count)}</div>
            <div>👁 {formatCount(item.view_count)}</div>
          </div>
        </div>
      </Block>

      <Block strong inset>
        <div>
          {item.media_type === 'video' ? (
            <video
              src={preferTwimgUrl(item.media_url, item.r2_url) || undefined}
              poster={preferTwimgUrl(item.thumbnail_url, item.media_url) || undefined}
              controls
              playsInline
              style={{ width: '100%', display: 'block', maxHeight: '56vh' }}
            />
          ) : (
            <img
              src={preferTwimgUrl(item.media_url, item.r2_url) || undefined}
              alt={item.author_name}
              style={{ width: '100%', display: 'block', maxHeight: '56vh', objectFit: 'contain' }}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <a href={item.original_url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>原始推文</a>
          <a href={item.media_url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>媒體來源</a>
          {item.r2_url && (
            <a href={item.r2_url} target="_blank" rel="noreferrer" style={{ color: 'var(--f7-theme-color)' }}>R2 檔案</a>
          )}
        </div>
      </Block>

      <BlockTitle>推文與標籤</BlockTitle>
      <List inset strong>
        <ListItem title="Tweet ID" after={item.tweet_id} />
        <ListItem title="Hashtags" text={item.hashtags.length > 0 ? item.hashtags.join(' ') : '（無）'} />
        <ListItem title="媒體尺寸" text={item.media_width && item.media_height ? `${item.media_width} x ${item.media_height}` : '未知'} />
        <ListItem title="抓取時間" text={formatDateTime(item.crawled_at)} />
      </List>

      <BlockTitle>推文內容</BlockTitle>
      <Block strong inset>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.source_text || '（無推文文字）'}</div>
      </Block>

      <Block strong inset>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {item.status === 'pending' && (
            <>
              <Button fill onClick={onApprove} disabled={busy}>通過並關聯 MV</Button>
              <Button outline color="red" onClick={onReject} disabled={busy}>拒絕</Button>
            </>
          )}
          {item.status === 'rejected' && (
            <Button fill tonal color="orange" onClick={onRestore} disabled={busy}>
              恢復為待審
            </Button>
          )}
        </div>
      </Block>
    </Page>
  )
}
