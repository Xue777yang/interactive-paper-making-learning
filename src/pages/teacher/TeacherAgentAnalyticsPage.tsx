import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/apiClient'

type AgentAnalytics = {
  totalConversations: number
  totalUserMessages: number
  averageQuestionsPerStudent: number
  keywords: Array<{ keyword: string; count: number }>
  emotionDistribution: Record<string, number>
  emotionTrend: Array<{ emotionLabel: string; valence: number; arousal: number; riskLevel: string; summary: string; studentName: string; createdAt: string }>
  studentAttention: Array<{ id: string; displayName: string; attentionCount: number; latestState: string }>
  conversations: Array<{ id: string; studentName: string; contextType: string; updatedAt: string; messageCount: number; lastMessage: string }>
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

export function TeacherAgentAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null)

  useEffect(() => {
    apiFetch<{ analytics: AgentAnalytics }>('/teacher/agent-analytics').then((response) => setAnalytics(response.analytics))
  }, [])

  if (!analytics) return <section className="paper-panel">正在加载小助手分析...</section>

  return (
    <section className="teacher-page">
      <div className="teacher-page-title">
        <div>
          <p className="eyebrow">蔡伦小助手分析</p>
          <h1>对话、关键词与学习状态信号</h1>
        </div>
      </div>

      <div className="teacher-stat-grid">
        <article className="paper-panel teacher-stat-card">
          <span>总对话次数</span>
          <strong>{analytics.totalConversations}</strong>
        </article>
        <article className="paper-panel teacher-stat-card">
          <span>学生提问数</span>
          <strong>{analytics.totalUserMessages}</strong>
        </article>
        <article className="paper-panel teacher-stat-card">
          <span>人均提问</span>
          <strong>{analytics.averageQuestionsPerStudent.toFixed(1)}</strong>
        </article>
      </div>

      <div className="teacher-grid two">
        <article className="paper-panel">
          <h2>情绪分布</h2>
          <div className="emotion-pill-grid">
            {Object.entries(analytics.emotionDistribution).map(([label, count]) => (
              <span key={label}>
                {emotionText[label] ?? label}
                <strong>{count}</strong>
              </span>
            ))}
          </div>
        </article>

        <article className="paper-panel">
          <h2>高频问题关键词</h2>
          <div className="keyword-list">
            {analytics.keywords.map((item) => (
              <span key={item.keyword}>
                {item.keyword} <strong>{item.count}</strong>
              </span>
            ))}
          </div>
        </article>
      </div>

      <div className="teacher-grid two">
        <article className="paper-panel">
          <h2>需要关注的学生</h2>
          <div className="compact-list">
            {analytics.studentAttention.map((student) => (
              <p key={student.id}>
                <Link to={`/teacher/students/${student.id}`}>{student.displayName}</Link> · {emotionText[student.latestState] ?? student.latestState} · {student.attentionCount} 次学习状态信号
              </p>
            ))}
          </div>
        </article>
        <article className="paper-panel">
          <h2>学习状态趋势</h2>
          <div className="compact-list">
            {analytics.emotionTrend.slice(-8).map((item) => (
              <p key={`${item.createdAt}-${item.studentName}`}>
                <strong>{item.studentName}</strong> · {emotionText[item.emotionLabel] ?? item.emotionLabel} · {item.summary}
              </p>
            ))}
          </div>
        </article>
      </div>

      <article className="paper-panel">
        <h2>最近对话</h2>
        <div className="analytics-table">
          <div className="analytics-row head">
            <span>学生</span>
            <span>场景</span>
            <span>消息数</span>
            <span>最后消息</span>
            <span>时间</span>
          </div>
          {analytics.conversations.map((conversation) => (
            <div className="analytics-row" key={conversation.id}>
              <span>{conversation.studentName}</span>
              <span>{conversation.contextType}</span>
              <span>{conversation.messageCount}</span>
              <span>{conversation.lastMessage}</span>
              <span>{new Date(conversation.updatedAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
