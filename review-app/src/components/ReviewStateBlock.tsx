import type { ReactNode } from 'react'
import { Block, Preloader } from 'framework7-react'
import Button from './Button'

type ReviewStateTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

interface ReviewStateBlockProps {
  title: string
  description: string
  tone?: ReviewStateTone
  icon?: ReactNode
  actionText?: string
  onAction?: () => void
  compact?: boolean
  loading?: boolean
}

const FALLBACK_ICONS: Record<ReviewStateTone, string> = {
  neutral: '...?',
  info: 'SYNC',
  success: 'OK',
  warning: 'WAIT',
  danger: 'ERR',
}

export default function ReviewStateBlock({
  title,
  description,
  tone = 'neutral',
  icon,
  actionText,
  onAction,
  compact = false,
  loading = false,
}: ReviewStateBlockProps) {
  return (
    <Block strong inset style={compact ? { marginTop: 0, marginBottom: 0 } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div aria-hidden="true" style={{ minWidth: 36, textAlign: 'center', fontWeight: 700 }}>
            {loading ? <Preloader size={24} /> : (icon || FALLBACK_ICONS[tone])}
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{title}</div>
            <div style={{ opacity: 0.75, marginTop: 4 }}>{description}</div>
          </div>
        </div>
        {actionText && onAction && (
          <Button small fill onClick={onAction}>
            {actionText}
          </Button>
        )}
      </div>
    </Block>
  )
}
