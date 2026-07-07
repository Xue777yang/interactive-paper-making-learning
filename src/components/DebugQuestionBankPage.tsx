import { useMemo } from 'react'
import { knowledgePointMeta, knowledgePoints, questions } from '../data/questions'
import { attachKnowledgeAverages, generateMockClassAnalytics } from '../lib/learningAnalytics'
import { formatDuration, formatPercent } from '../lib/utils'

export function DebugQuestionBankPage() {
  const analytics = useMemo(() => attachKnowledgeAverages(generateMockClassAnalytics(questions), questions), [])
  const counts = knowledgePoints.map((point) => ({
    point,
    count: questions.filter((question) => question.knowledgePoints.includes(point)).length,
  }))

  return (
    <section className="debug-page">
      <div className="section-heading">
        <p className="eyebrow">开发调试</p>
        <h1>题库管理</h1>
        <p>当前题库共 {questions.length} 题，每题 4 个选项，并标注难度、知识点和解析。</p>
      </div>

      <div className="debug-summary">
        {counts.map(({ point, count }) => (
          <div className="paper-panel debug-count" key={point}>
            <span>{knowledgePointMeta[point].shortLabel}</span>
            <strong>{count} 题</strong>
            <small>班级均值 {formatPercent(analytics.averageMasteryByKnowledgePoint[point])}</small>
          </div>
        ))}
      </div>

      <div className="question-bank-table paper-panel">
        <div className="bank-head">
          <span>ID</span>
          <span>题干</span>
          <span>知识点</span>
          <span>难度</span>
          <span>答案</span>
          <span>模拟质量</span>
        </div>
        {questions.map((question) => {
          const quality = analytics.questionQuality[question.id]
          return (
            <div className="bank-row" key={question.id}>
              <span>{question.id}</span>
              <p>{question.stem}</p>
              <span>{question.knowledgePoints.map((point) => knowledgePointMeta[point].shortLabel).join('、')}</span>
              <span>{question.difficulty}</span>
              <span>{String.fromCharCode(65 + question.answerIndex)}. {question.options[question.answerIndex]}</span>
              <span>
                {quality.flag} · {formatPercent(quality.correctRate)} · {formatDuration(quality.averageTimeMs)}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
