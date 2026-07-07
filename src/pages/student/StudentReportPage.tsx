import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDuration, formatPercent } from '../../lib/utils'
import { apiFetch } from '../../lib/apiClient'

type StudentReport = {
  correctRate: number
  videoCompletionRate: number
  processCompletionRate: number
  repeatedSegments: Array<{ start: number; end: number; count: number }>
  weakKnowledgePoints: Array<{ name: string; mastery: number; color: string }>
  agentQuestionCount: number
  latestLearningState: { emotionLabel: string; summary: string; riskLevel: string } | null
  reviewPlan: Array<{ label: string; advice: string }>
}

export function StudentReportPage() {
  const [report, setReport] = useState<StudentReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ report: StudentReport | null }>('/quiz/report/latest')
      .then((response) => setReport(response.report))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <section className="paper-panel">正在生成学习报告...</section>

  if (!report) {
    return (
      <section className="empty-report paper-panel">
        <p className="eyebrow">学习报告</p>
        <h1>还没有学习记录</h1>
        <p>先完成微课视频、互动演示或课后测验。</p>
        <Link className="primary-button" to="/student/video">
          去看微课
        </Link>
      </section>
    )
  }

  return (
    <section className="report-page">
      <div className="section-heading">
        <p className="eyebrow">造纸术交互式学习课程</p>
        <h1>学习报告</h1>
      </div>

      <div className="report-kpis">
        <div className="paper-panel stat-card">
          <span>视频完成率</span>
          <strong>{formatPercent(report.videoCompletionRate)}</strong>
        </div>
        <div className="paper-panel stat-card">
          <span>测验正确率</span>
          <strong>{formatPercent(report.correctRate)}</strong>
        </div>
        <div className="paper-panel stat-card">
          <span>互动演示</span>
          <strong>{formatPercent(report.processCompletionRate)}</strong>
        </div>
        <div className="paper-panel stat-card">
          <span>小助手提问</span>
          <strong>{report.agentQuestionCount} 次</strong>
        </div>
      </div>

      <div className="report-grid">
        <article className="paper-panel report-card">
          <h2>知识点掌握</h2>
          <div className="review-list">
            {report.weakKnowledgePoints.map((item) => (
              <div className="review-item" key={item.name}>
                <strong style={{ color: item.color }}>{item.name}</strong>
                <div className="thin-meter mastery-meter" aria-label={`${item.name} 掌握度 ${formatPercent(item.mastery)}`}>
                  <i style={{ width: `${Math.round(item.mastery * 100)}%` }} />
                </div>
                <span>{formatPercent(item.mastery)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="paper-panel report-card">
          <h2>测验表现</h2>
          <div className="report-focus-number">
            <strong>{formatPercent(report.correctRate)}</strong>
            <span>当前正确率</span>
          </div>
          <h3>视频回看</h3>
          {report.repeatedSegments.length ? (
            <div className="review-list">
              {report.repeatedSegments.slice(0, 4).map((segment) => (
                <div className="review-item" key={`${segment.start}-${segment.end}`}>
                  <strong>
                    {formatDuration(segment.start * 1000)} - {formatDuration(segment.end * 1000)}
                  </strong>
                  <span>{segment.count} 次回看</span>
                </div>
              ))}
            </div>
          ) : (
            <p>暂无重复观看片段</p>
          )}
        </article>
      </div>

      <article className="paper-panel report-card">
        <h2>学习建议</h2>
        <div className="insight-list">
          {report.reviewPlan.map((item) => (
            <p key={item.label}>
              <strong>{item.label}</strong>：{item.advice}
            </p>
          ))}
        </div>
      </article>

      <article className="paper-panel report-card">
        <h2>小助手记录</h2>
        <div className="assistant-mini-stats report">
          <span>
            提问次数
            <strong>{report.agentQuestionCount} 次</strong>
          </span>
          <span>
            重点复习
            <strong>{report.weakKnowledgePoints[0]?.name ?? '暂无'}</strong>
          </span>
        </div>
      </article>
    </section>
  )
}
