import type { ReactNode } from 'react'
import { Block } from 'framework7-react'

interface ReviewToolbarCardProps {
  search?: ReactNode
  summary?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  className?: string
}

export default function ReviewToolbarCard({
  search,
  summary,
  actions,
  footer,
  className = '',
}: ReviewToolbarCardProps) {
  return (
    <Block strong inset className={`review-surface review-toolbar-card review-fade-up ${className}`.trim()}>
      {search && <div className="review-toolbar-search">{search}</div>}
      {(summary || actions) && (
        <div className="review-toolbar-row">
          {summary && <div className="review-toolbar-summary">{summary}</div>}
          {actions && <div className="review-toolbar-actions">{actions}</div>}
        </div>
      )}
      {footer && <div className="review-toolbar-footer">{footer}</div>}
    </Block>
  )
}
