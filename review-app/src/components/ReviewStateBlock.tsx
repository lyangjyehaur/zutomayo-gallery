import type { ReactNode } from 'react'
import { Block, Button, Preloader } from 'framework7-react'

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
    <Block strong inset className={`review-state review-state-${tone}${compact ? ' review-state-compact' : ''}`}>
      <div className="review-state-icon" aria-hidden="true">
        {loading ? <Preloader size={28} /> : (icon || FALLBACK_ICONS[tone])}
      </div>
      <div className="review-state-copy">
        <div className="review-state-title">{title}</div>
        <div className="review-state-description">{description}</div>
      </div>
      {actionText && onAction && (
        <Button small fill tonal className="review-state-action" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </Block>
  )
}
