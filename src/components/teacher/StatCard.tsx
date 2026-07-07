import type { ReactNode } from 'react'

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <article className="paper-panel teacher-stat-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
      {icon && <i>{icon}</i>}
    </article>
  )
}

