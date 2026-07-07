import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/apiClient'
import type { TeacherStudentRow } from '../../lib/analyticsTypes'
import { formatPercent } from '../../lib/utils'

export function TeacherStudentsPage() {
  const [students, setStudents] = useState<TeacherStudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStudents()
  }, [])

  function loadStudents() {
    setLoading(true)
    setError('')
    apiFetch<{ students: TeacherStudentRow[] }>('/teacher/students')
      .then((response) => setStudents(response.students))
      .catch((nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : '学生数据加载失败。')
      })
      .finally(() => setLoading(false))
  }

  return (
    <section className="teacher-page">
      <div className="teacher-page-title">
        <div>
          <p className="eyebrow">学生数据</p>
          <h1>班级学生学习概览</h1>
        </div>
      </div>
      <article className="paper-panel">
        <div className="student-table">
          <div className="student-row head">
            <span>学生</span>
            <span>答题正确率</span>
            <span>视频完成率</span>
            <span>互动演示</span>
            <span>薄弱知识点</span>
            <span>最近学习</span>
            <span>详情</span>
          </div>
          {students.map((student) => (
            <div className="student-row" key={student.id}>
              <span>
                <strong>{student.displayName}</strong>
                <small>{student.username}</small>
              </span>
              <span>{formatPercent(student.correctRate)}</span>
              <span>{formatPercent(student.videoCompletionRate)}</span>
              <span>{formatPercent(student.processCompletionRate)}</span>
              <span>{student.weakKnowledgePoints.map((point) => point.name).join('、') || '暂无'}</span>
              <span>{student.lastLearningTime ? new Date(student.lastLearningTime).toLocaleString() : '暂无'}</span>
              <Link to={`/teacher/students/${student.id}`}>查看</Link>
            </div>
          ))}
        </div>
        {loading && <p className="empty-note">正在加载学生数据...</p>}
        {!loading && !error && students.length === 0 && <p className="empty-note">暂无学生数据。</p>}
        {error && (
          <div className="empty-note">
            <p>{error}</p>
            <button className="ghost-button" type="button" onClick={loadStudents}>
              重试
            </button>
          </div>
        )}
      </article>
    </section>
  )
}
