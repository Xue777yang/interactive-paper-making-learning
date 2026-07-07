import { formatPercent } from '../../lib/utils'

export function DataBar({ label, value, color = '#2563eb' }: { label: string; value: number; color?: string }) {
  return (
    <div className="data-bar-row">
      <span>{label}</span>
      <div className="data-bar-track">
        <i style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, background: color }} />
      </div>
      <strong>{formatPercent(value)}</strong>
    </div>
  )
}

