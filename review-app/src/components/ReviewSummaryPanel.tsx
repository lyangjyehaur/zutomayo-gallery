import type { ReactNode } from 'react'
import { Badge, Block } from 'framework7-react'

interface ReviewSummaryMetric {
  label: string
  value: ReactNode
  color?: string
  detail?: ReactNode
}

interface ReviewSummaryPanelProps {
  title?: ReactNode
  description?: ReactNode
  metrics?: ReviewSummaryMetric[]
  actions?: ReactNode
  progress?: ReactNode
  footer?: ReactNode
}

export default function ReviewSummaryPanel({
  title,
  description,
  metrics = [],
  actions,
  progress,
  footer,
}: ReviewSummaryPanelProps) {
  return (
    <Block strong inset style={{ marginBottom: 12 }}>
      {(title || actions) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          {title && <div style={{ fontWeight: 700 }}>{title}</div>}
          {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
        </div>
      )}
      {description && (
        <div style={{ marginTop: title || actions ? 6 : 0, opacity: 0.75, fontSize: 13 }}>
          {description}
        </div>
      )}
      {progress && <div style={{ marginTop: 10 }}>{progress}</div>}
      {metrics.length > 0 && (
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {metrics.map((metric) => (
            <div
              key={metric.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(127, 127, 127, 0.08)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{metric.label}</div>
                {metric.detail && (
                  <div style={{ marginTop: 2, fontSize: 12, opacity: 0.7 }}>
                    {metric.detail}
                  </div>
                )}
              </div>
              <Badge color={metric.color || 'gray'}>{metric.value}</Badge>
            </div>
          ))}
        </div>
      )}
      {footer && <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>{footer}</div>}
    </Block>
  )
}
