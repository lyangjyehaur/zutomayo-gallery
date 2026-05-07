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
  const hasPanelContent = Boolean(summary || actions || footer)

  return (
    <>
      {search && (
        <div style={{ margin: '0 16px 8px' }}>
          {search}
        </div>
      )}
      {hasPanelContent && (
        <Block
          strong
          inset
          className={className || undefined}
          style={search ? { marginTop: 0 } : undefined}
        >
          {(summary || actions) && (
            <div style={{ display: 'grid', gap: 12 }}>
              {summary && <div>{summary}</div>}
              {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
            </div>
          )}
          {footer && <div style={{ marginTop: 12 }}>{footer}</div>}
        </Block>
      )}
    </>
  )
}
