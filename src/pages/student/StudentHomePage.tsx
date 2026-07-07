import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ClipboardCheck, MessageCircleQuestion, PlaySquare, ScrollText, Target } from 'lucide-react'
import { apiFetch } from '../../lib/apiClient'
import { useAuth } from '../../lib/AuthContext'
import { formatPercent } from '../../lib/utils'

type StudentReport = {
  student?: { id: string; username: string; displayName: string }
  correctRate: number
  videoCompletionRate: number
  processCompletionRate: number
  agentQuestionCount: number
  weakKnowledgePoints: Array<{ name: string; mastery: number }>
  reviewPlan: Array<{ label: string; advice: string }>
}

export function StudentHomePage() {
  const { user } = useAuth()
  const [report, setReport] = useState<StudentReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ report: StudentReport | null }>('/quiz/report/latest')
      .then((response) => setReport(response.report))
      .finally(() => setLoading(false))
  }, [])

  const videoDone = report ? report.videoCompletionRate >= 0.8 : false
  const processDone = report ? report.processCompletionRate >= 0.8 : false
  const quizDone = report ? report.correctRate > 0 : false
  const videoRate = report?.videoCompletionRate ?? 0
  const processRate = report?.processCompletionRate ?? 0
  const quizRate = report?.correctRate ?? 0
  const totalProgress = videoRate * 0.35 + processRate * 0.35 + quizRate * 0.3
  const weakestPoint = report?.weakKnowledgePoints?.[0]?.name ?? '抄纸成形'
  const recommendation = !videoDone
    ? { label: '微课视频', advice: '先完成核心片段，再进入互动演示。' }
    : report?.weakKnowledgePoints?.length
      ? { label: weakestPoint, advice: '回看微课片段，并再次体验抄纸互动。' }
      : { label: '课后测验', advice: '完成测验后查看知识点掌握情况。' }
  const displayName = report?.student?.displayName ?? user?.displayName ?? '同学'

  return (
    <section className="student-home">
      <div className="student-hero paper-panel">
        <div className="hero-content">
          <span className="hero-user-pill">{displayName}</span>
          <h1>
            AIGC多模态资源赋能
            <br />
            传统文化智慧教学的实践与应用
          </h1>
          <p>——以造纸术交互式学习课程为例</p>
          <div className="course-tags" aria-label="课程模块">
            <span>造纸术交互式学习课程</span>
            <span>微课视频</span>
            <span>互动演示</span>
            <span>课后测验</span>
            <span>AIGC 小助手</span>
          </div>
        </div>
      </div>

      <div className="learning-entry-grid">
        <Link className="learning-entry-card paper-panel" to="/student/video">
          <span className="entry-icon video">
            <PlaySquare size={24} />
          </span>
          <span className={videoDone ? 'status-pill done' : videoRate > 0 ? 'status-pill active' : 'status-pill idle'}>
            {statusText(videoRate, videoDone)}
          </span>
          <h2>微课视频</h2>
          <p>聚焦造纸术关键流程</p>
          <strong>去观看</strong>
        </Link>
        <Link className="learning-entry-card paper-panel" to={`/student/process?reset=${Date.now()}`}>
          <span className="entry-icon process">
            <ScrollText size={24} />
          </span>
          <span className={processDone ? 'status-pill done' : processRate > 0 ? 'status-pill active' : 'status-pill idle'}>
            {statusText(processRate, processDone)}
          </span>
          <h2>互动演示</h2>
          <p>亲手完成工艺步骤</p>
          <strong>去体验</strong>
        </Link>
        <Link className="learning-entry-card paper-panel" to="/student/quiz">
          <span className="entry-icon quiz">
            <BookOpen size={24} />
          </span>
          <span className={quizDone ? 'status-pill done' : 'status-pill idle'}>{quizDone ? '已有记录' : '待开始'}</span>
          <h2>课后测验</h2>
          <p>检验知识点掌握情况</p>
          <strong>去测验</strong>
        </Link>
      </div>

      <div className="student-dashboard-grid polished">
        <article className="paper-panel progress-panel polished-progress-panel">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">学习进度</p>
              <h2>本课程完成度</h2>
            </div>
            <Target size={22} />
          </div>
          {loading ? (
            <p className="muted-note">正在读取学习记录...</p>
          ) : (
            <div className="progress-dashboard">
              <div
                className="progress-ring"
                style={{ '--progress': `${Math.round(totalProgress * 100)}%` } as CSSProperties}
                aria-label={`总完成度 ${formatPercent(totalProgress)}`}
              >
                <strong>{formatPercent(totalProgress)}</strong>
                <span>总完成度</span>
              </div>
              <div className="progress-list refined">
                <ProgressRow icon={<PlaySquare size={16} />} label="视频完成率" value={videoRate} to="/student/video" />
                <ProgressRow icon={<ScrollText size={16} />} label="互动完成率" value={processRate} to="/student/process" />
                <ProgressRow icon={<BookOpen size={16} />} label="测验正确率" value={quizRate} to="/student/quiz" />
              </div>
            </div>
          )}
        </article>

        <article className="paper-panel learning-path-panel polished-card">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">推荐学习路径</p>
              <h2>推荐复习：【{recommendation.label}】</h2>
            </div>
            <ClipboardCheck size={22} />
          </div>
          <p>{recommendation.advice}</p>
          <div className="inline-actions">
            <Link className="secondary-button" to="/student/video">
              回到视频
            </Link>
            <Link className="ghost-button" to="/student/report">
              查看报告
            </Link>
          </div>
        </article>

        <article className="paper-panel assistant-summary-card polished-card">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">AIGC 小助手</p>
              <h2>蔡伦小助手</h2>
            </div>
            <MessageCircleQuestion size={22} />
          </div>
          {report?.agentQuestionCount ? (
            <div className="assistant-mini-stats">
              <span>
                今日提问
                <strong>{report.agentQuestionCount} 次</strong>
              </span>
              <span>
                常问知识点
                <strong>{weakestPoint}</strong>
              </span>
            </div>
          ) : (
            <p>暂无提问记录</p>
          )}
          <button className="ghost-button" type="button" onClick={() => window.dispatchEvent(new Event('open-cailun-agent'))}>
            打开小助手
          </button>
        </article>
      </div>
    </section>
  )
}

function ProgressRow({ icon, label, value, to }: { icon: ReactNode; label: string; value: number; to: string }) {
  const percent = Math.round(value * 100)
  return (
    <Link
      className="progress-row refined"
      to={to}
      style={{ '--value': `${percent}%` } as CSSProperties}
      aria-label={`${label} ${formatPercent(value)}`}
    >
      <span className="progress-row-label">
        <i aria-hidden="true">{icon}</i>
        {label}
      </span>
      <div className="thin-meter">
        <i style={{ width: `${percent}%` }} />
      </div>
      <strong>{formatPercent(value)}</strong>
      <em>{percent >= 80 ? '已完成' : percent > 0 ? '继续学习' : '待开始'}</em>
    </Link>
  )
}

function statusText(value: number, done: boolean) {
  if (done) return '已完成'
  return value > 0 ? '继续学习' : '待开始'
}
