import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../../lib/apiClient'
import { DataBar } from '../../components/teacher/DataBar'
import { formatDuration, formatPercent } from '../../lib/utils'

type StudentDetail = {
  id: string
  displayName: string
  username: string
  answerRecords: Array<{
    id: string
    stem: string
    correct: boolean
    selectedIndex: number
    answerIndex: number
    timeSpentMs: number
    usedAgentHelp: boolean
    knowledgeTags: Array<{ id: string; name: string; color: string }>
  }>
  knowledgeMastery: Array<{ id: string; name: string; color: string; mastery: number; attempts: number }>
  videoSummaries: Array<{
    title: string
    completionRate: number
    totalWatchTimeMs: number
    replaySegments: Array<{ start: number; end: number; count: number }>
    markerStats: Array<{ label: string; coverageRate: number; replayCount: number; skippedCount: number }>
  }>
  conversations: Array<{
    id: string
    contextType: string
    messages: Array<{ role: string; content: string; emotion?: { emotionLabel: string; summary: string } | null }>
  }>
  emotionTrend: Array<{ emotionLabel: string; valence: number; riskLevel: string; createdAt: string }>
  teachingAdvice: string[]
}

export function TeacherStudentDetailPage() {
  const { studentId } = useParams()
  const [student, setStudent] = useState<StudentDetail | null>(null)

  useEffect(() => {
    if (!studentId) return
    apiFetch<{ student: StudentDetail }>(`/teacher/students/${studentId}`).then((response) => setStudent(response.student))
  }, [studentId])

  if (!student) return <section className="paper-panel">正在加载学生详情...</section>

  const video = student.videoSummaries[0]

  return (
    <section className="teacher-page">
      <div className="teacher-page-title">
        <div>
          <p className="eyebrow">学生个人详情</p>
          <h1>{student.displayName}</h1>
        </div>
        <Link className="ghost-button" to="/teacher/students">
          返回学生列表
        </Link>
      </div>

      <div className="teacher-grid two">
        <article className="paper-panel">
          <h2>知识点掌握度</h2>
          <div className="data-bar-list">
            {student.knowledgeMastery.map((item) => (
              <DataBar key={item.id} label={`${item.name} · ${item.attempts} 题`} value={item.mastery} color={item.color} />
            ))}
          </div>
        </article>
        <article className="paper-panel">
          <h2>视频观看轨迹</h2>
          {video ? (
            <>
              <p>
                {video.title}：完成率 {formatPercent(video.completionRate)}，总观看 {formatDuration(video.totalWatchTimeMs)}
              </p>
              <div className="compact-list">
                {video.markerStats.slice(0, 6).map((marker) => (
                  <p key={marker.label}>
                    <strong>{marker.label}</strong> 覆盖 {formatPercent(marker.coverageRate)} · 回看 {marker.replayCount} · 跳过 {marker.skippedCount}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <p>暂无视频记录。</p>
          )}
        </article>
      </div>

      <article className="paper-panel">
        <h2>答题记录</h2>
        <div className="analytics-table">
          <div className="analytics-row head">
            <span>题目</span>
            <span>结果</span>
            <span>耗时</span>
            <span>知识点</span>
            <span>帮助</span>
          </div>
          {student.answerRecords.slice(-12).map((record) => (
            <div className="analytics-row" key={record.id}>
              <span>{record.stem}</span>
              <span>{record.correct ? '正确' : '错误'}</span>
              <span>{formatDuration(record.timeSpentMs)}</span>
              <span>{record.knowledgeTags.map((tag) => tag.name).join('、')}</span>
              <span>{record.usedAgentHelp ? '使用' : '未用'}</span>
            </div>
          ))}
        </div>
      </article>

      <div className="teacher-grid two">
        <article className="paper-panel">
          <h2>小助手对话摘要</h2>
          <div className="compact-list">
            {student.conversations.slice(0, 4).map((conversation) => (
              <p key={conversation.id}>
                <strong>{conversation.contextType}</strong>：
                {conversation.messages
                  .slice(-2)
                  .map((message) => message.content)
                  .join(' / ')}
              </p>
            ))}
          </div>
        </article>
        <article className="paper-panel">
          <h2>学习状态趋势</h2>
          <div className="compact-list">
            {student.emotionTrend.map((emotion) => (
              <p key={`${emotion.createdAt}-${emotion.emotionLabel}`}>
                <strong>{emotion.emotionLabel}</strong> · valence {emotion.valence.toFixed(2)} · {emotion.riskLevel}
              </p>
            ))}
          </div>
        </article>
      </div>

      <article className="paper-panel">
        <h2>推荐教师干预建议</h2>
        <div className="insight-list">
          {student.teachingAdvice.map((advice) => (
            <p key={advice}>{advice}</p>
          ))}
        </div>
      </article>
    </section>
  )
}
