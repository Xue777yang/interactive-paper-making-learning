import type { QuizState } from '../lib/adaptiveQuizEngine'
import { formatPercent } from '../lib/utils'

type QuizProgressProps = {
  state: QuizState
}

export function QuizProgress({ state }: QuizProgressProps) {
  const answered = state.answeredQuestionIds.length
  const correct = state.records.filter((record) => record.correct).length
  const rate = state.records.length ? correct / state.records.length : 0
  const covered = Object.values(state.answeredCountByKnowledgePoint).filter((count) => count > 0).length

  return (
    <aside className="quiz-progress paper-panel">
      <div className="stat-block">
        <span>当前进度</span>
        <strong>
          {answered} / {state.totalQuestions}
        </strong>
      </div>
      <div className="stat-block">
        <span>当前正确率</span>
        <strong>{formatPercent(rate)}</strong>
      </div>
      <div className="stat-block">
        <span>剩余帮助</span>
        <strong>
          {Math.max(0, state.helpLimit - state.helpUsed)} / {state.helpLimit}
        </strong>
      </div>
      <div className="stat-block">
        <span>已覆盖知识点</span>
        <strong>{covered} / 10</strong>
      </div>
      <div className="ability-pill">能力值 {state.currentAbility.toFixed(1)} / 5</div>
    </aside>
  )
}
