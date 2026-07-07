import { useMemo } from 'react'
import { knowledgePointMeta, knowledgePoints, questions } from '../data/questions'
import { buildLearnerProfile, attachKnowledgeAverages, generateMockClassAnalytics } from '../lib/learningAnalytics'
import { loadLastReport } from '../lib/storage'
import { formatDuration, formatPercent } from '../lib/utils'
import { MasteryChart } from './MasteryChart'

type LearningReportPageProps = {
  onStartQuiz: () => void
}

export function LearningReportPage({ onStartQuiz }: LearningReportPageProps) {
  const report = loadLastReport()
  const classAnalytics = useMemo(() => attachKnowledgeAverages(generateMockClassAnalytics(questions), questions), [])

  if (!report) {
    return (
      <section className="empty-report paper-panel">
        <p className="eyebrow">学习报告</p>
        <h1>还没有本轮答题报告</h1>
        <p>完成课后测验后，这里会展示正确率、知识点掌握度和复习建议。</p>
        <button className="primary-button" type="button" onClick={onStartQuiz}>
          去开始课后测验
        </button>
      </section>
    )
  }

  const profile = buildLearnerProfile({
    answeredQuestionIds: report.records.map((record) => record.questionId),
    records: report.records,
    currentAbility: report.currentAbility,
    masteryByKnowledgePoint: report.masteryByKnowledgePoint,
    answeredCountByKnowledgePoint: Object.fromEntries(
      knowledgePoints.map((point) => [
        point,
        report.records.filter((record) => record.knowledgePoints.includes(point)).length,
      ]),
    ) as Record<(typeof knowledgePoints)[number], number>,
    helpUsed: report.helpUsed,
    helpLimit: 5,
    totalQuestions: 20,
  })

  return (
    <section className="report-page">
      <div className="section-heading">
        <p className="eyebrow">学习报告</p>
        <h1>本轮学习画像</h1>
        <p>报告基于你的答题记录、耗时、知识点掌握度和蔡伦帮助使用情况生成。</p>
      </div>

      <div className="report-kpis">
        <div className="paper-panel stat-card">
          <span>总正确率</span>
          <strong>{formatPercent(report.correctRate)}</strong>
        </div>
        <div className="paper-panel stat-card">
          <span>平均耗时</span>
          <strong>{formatDuration(report.averageTime)}</strong>
        </div>
        <div className="paper-panel stat-card">
          <span>蔡伦帮助</span>
          <strong>{report.helpUsed} 次</strong>
        </div>
        <div className="paper-panel stat-card">
          <span>能力值</span>
          <strong>{report.currentAbility.toFixed(1)} / 5</strong>
        </div>
      </div>

      <div className="report-grid">
        <article className="paper-panel">
          <h2>知识点掌握度</h2>
          <MasteryChart mastery={report.masteryByKnowledgePoint} />
        </article>

        <article className="paper-panel">
          <h2>推荐复习计划</h2>
          <div className="review-list">
            {report.recommendedReviewPlan.slice(0, 6).map((item) => (
              <div className="review-item" key={item.knowledgePoint}>
                <strong>{item.label}</strong>
                <span>{item.status}</span>
                <p>{item.advice}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="paper-panel">
        <h2>学习分析提示</h2>
        <div className="insight-list">
          {profile.behaviorSummary.map((summary) => (
            <p key={summary}>{summary}</p>
          ))}
          <p>
            班级模拟数据样本 {classAnalytics.sampleSize} 条，用于估计题目正确率和知识点平均掌握度；当前为本地生成的演示数据。
          </p>
        </div>
      </article>

      <article className="paper-panel">
        <h2>20 道题作答记录</h2>
        <div className="record-table">
          <div className="record-head">
            <span>题号</span>
            <span>结果</span>
            <span>知识点</span>
            <span>耗时</span>
            <span>帮助</span>
          </div>
          {report.records.map((record, index) => {
            const question = questions.find((item) => item.id === record.questionId)
            return (
              <div className="record-row" key={`${record.questionId}-${index}`}>
                <span>{index + 1}</span>
                <span>{record.correct ? '正确' : '错误'}</span>
                <span>
                  {record.knowledgePoints.map((point) => knowledgePointMeta[point].shortLabel).join('、')}
                </span>
                <span>{formatDuration(record.timeSpentMs)}</span>
                <span>{record.usedAgentHelp ? '使用' : '未用'}</span>
                {question && <p>{question.stem}</p>}
              </div>
            )
          })}
        </div>
      </article>
    </section>
  )
}
