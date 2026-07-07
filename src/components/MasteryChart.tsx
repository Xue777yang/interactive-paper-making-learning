import type { KnowledgePoint } from '../data/questions'
import { knowledgePointMeta, knowledgePoints } from '../data/questions'
import { formatPercent } from '../lib/utils'

type MasteryChartProps = {
  mastery: Record<KnowledgePoint, number>
  compact?: boolean
}

export function MasteryChart({ mastery, compact = false }: MasteryChartProps) {
  return (
    <div className={compact ? 'mastery-chart compact' : 'mastery-chart'}>
      {knowledgePoints.map((point) => {
        const value = mastery[point] ?? 0
        return (
          <div className="mastery-row" key={point}>
            <div className="mastery-label">
              <span>{knowledgePointMeta[point].label}</span>
              <strong>{formatPercent(value)}</strong>
            </div>
            <div className="mastery-track" aria-label={`${knowledgePointMeta[point].label}掌握度 ${formatPercent(value)}`}>
              <span style={{ width: `${Math.round(value * 100)}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
