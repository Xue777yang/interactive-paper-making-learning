import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, MessageSquare, PlaySquare, Users } from 'lucide-react'
import { apiFetch } from '../../lib/apiClient'
import { formatDuration, formatPercent } from '../../lib/utils'
import { DataBar } from '../../components/teacher/DataBar'
import { StatCard } from '../../components/teacher/StatCard'
import { VideoHeatmap } from '../../components/teacher/VideoHeatmap'
import type { TeacherStudentRow } from '../../lib/analyticsTypes'

type Dashboard = {
  overview: {
    studentCount: number
    completedQuizStudents: number
    averageCorrectRate: number
    averageVideoCompletionRate: number
    averageProcessCompletionRate: number
    averageAgentQuestions: number
  }
  knowledgeMastery: Array<{ id: string; name: string; color: string; mastery: number; weak: boolean }>
  questionQuality: Array<{ id: string; stem: string; attempts: number; correctRate: number; averageTimeMs: number; flag: string }>
  video: {
    completionRate: number
    averageWatchTimeMs: number
    heatmap: Array<{ start: number; end: number; intensity: number; replayCount?: number }>
    replayHotspots: Array<{ start: number; end: number; count: number }>
    skippedHotspots: Array<{ label: string; count: number }>
    markerStats: Array<{ label: string; coverageRate: number; replayCount: number; skippedCount: number }>
  }
  agent: {
    totalConversations: number
    totalUserMessages: number
    averageQuestionsPerStudent: number
    keywords: Array<{ keyword: string; count: number }>
    emotionDistribution: Record<string, number>
    studentAttention: Array<{ id: string; displayName: string; attentionCount: number; latestState: string }>
  }
  students: TeacherStudentRow[]
  recommendations: string[]
}

const emotionText: Record<string, string> = {
  curious: '好奇',
  confused: '困惑',
  frustrated: '挫败',
  anxious: '担心',
  bored: '投入偏低',
  confident: '自信',
  neutral: '平稳',
}

export function TeacherDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  function loadDashboard() {
    setError('')
    apiFetch<{ dashboard: Dashboard }>('/teacher/dashboard')
      .then((response) => setDashboard(response.dashboard))
      .catch((nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : '教师看板加载失败。')
      })
  }

  if (error) {
    return (
      <section className="paper-panel">
        <h2>教师看板加载失败</h2>
        <p>{error}</p>
        <button className="primary-button" type="button" onClick={loadDashboard}>
          重试
        </button>
      </section>
    )
  }

  if (!dashboard) return <section className="paper-panel">正在加载教师看板...</section>

  return (
    <section className="teacher-page">
      <div className="teacher-page-title">
        <div>
          <p className="eyebrow">班级学习概览</p>
          <h1>造纸术学习数据看板</h1>
        </div>
      </div>

      <div className="teacher-stat-grid">
        <StatCard label="学生总数" value={dashboard.overview.studentCount} hint="演示班级" icon={<Users size={24} />} />
        <StatCard label="已完成答题" value={dashboard.overview.completedQuizStudents} hint="20 题会话" icon={<CheckCircle2 size={24} />} />
        <StatCard label="平均正确率" value={formatPercent(dashboard.overview.averageCorrectRate)} icon={<CheckCircle2 size={24} />} />
        <StatCard label="平均视频完成率" value={formatPercent(dashboard.overview.averageVideoCompletionRate)} icon={<PlaySquare size={24} />} />
        <StatCard label="互动演示完成率" value={formatPercent(dashboard.overview.averageProcessCompletionRate)} icon={<CheckCircle2 size={24} />} />
        <StatCard label="人均提问次数" value={dashboard.overview.averageAgentQuestions.toFixed(1)} icon={<MessageSquare size={24} />} />
      </div>

      <div className="teacher-grid two">
        <article className="paper-panel">
          <h2>知识点掌握度</h2>
          <div className="data-bar-list">
            {dashboard.knowledgeMastery.slice(0, 10).map((item) => (
              <DataBar key={item.id} label={item.weak ? `${item.name} · 薄弱` : item.name} value={item.mastery} color={item.color} />
            ))}
          </div>
        </article>

        <article className="paper-panel">
          <h2>小助手学习状态分布</h2>
          <div className="emotion-pill-grid">
            {Object.entries(dashboard.agent.emotionDistribution).map(([label, count]) => (
              <span key={label}>
                {emotionText[label] ?? label}
                <strong>{count}</strong>
              </span>
            ))}
          </div>
          <h3>高频问题关键词</h3>
          <div className="keyword-list">
            {dashboard.agent.keywords.map((item) => (
              <span key={item.keyword}>
                {item.keyword} <strong>{item.count}</strong>
              </span>
            ))}
          </div>
        </article>
      </div>

      <div className="teacher-grid two">
        <article className="paper-panel">
          <h2>视频学习分析</h2>
          <div className="mini-kpis">
            <span>完成率 {formatPercent(dashboard.video.completionRate)}</span>
            <span>平均观看 {formatDuration(dashboard.video.averageWatchTimeMs)}</span>
          </div>
          <VideoHeatmap buckets={dashboard.video.heatmap} />
          <div className="compact-list">
            {dashboard.video.markerStats.slice(0, 5).map((marker) => (
              <p key={marker.label}>
                <strong>{marker.label}</strong> 覆盖 {formatPercent(marker.coverageRate)} · 回看 {marker.replayCount} · 跳过 {marker.skippedCount}
              </p>
            ))}
          </div>
        </article>

        <article className="paper-panel">
          <h2>题目质量分析</h2>
          <div className="analytics-table compact">
            <div className="analytics-row head">
              <span>题目</span>
              <span>作答</span>
              <span>正确率</span>
              <span>标记</span>
            </div>
            {dashboard.questionQuality.slice(0, 6).map((question) => (
              <div className="analytics-row" key={question.id}>
                <span>{question.stem}</span>
                <span>{question.attempts}</span>
                <span>{formatPercent(question.correctRate)}</span>
                <span>{question.flag}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="paper-panel">
        <h2>学生列表</h2>
        <div className="student-table">
          <div className="student-row head">
            <span>学生</span>
            <span>正确率</span>
            <span>视频</span>
            <span>薄弱知识点</span>
            <span>小助手</span>
            <span>详情</span>
          </div>
          {dashboard.students.map((student) => (
            <div className="student-row" key={student.id}>
              <span>{student.displayName}</span>
              <span>{formatPercent(student.correctRate)}</span>
              <span>{formatPercent(student.videoCompletionRate)}</span>
              <span>{student.weakKnowledgePoints.map((item) => item.name).join('、') || '暂无'}</span>
              <span>{student.agentQuestionCount} 次</span>
              <Link to={`/teacher/students/${student.id}`}>查看</Link>
            </div>
          ))}
        </div>
      </article>

      <article className="paper-panel">
        <h2>教学建议</h2>
        <div className="insight-list">
          {dashboard.recommendations.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </article>
    </section>
  )
}
