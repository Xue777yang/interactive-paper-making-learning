import { useEffect, useState } from 'react'
import { ArrowLeft, PlayCircle } from 'lucide-react'
import { apiFetch } from '../../lib/apiClient'
import type { VideoDto } from '../../lib/analyticsTypes'
import { LearningVideoPlayer } from '../../components/video/LearningVideoPlayer'

export function StudentVideoPage() {
  const [video, setVideo] = useState<VideoDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    apiFetch<{ videos: VideoDto[] }>('/videos')
      .then((response) => setVideo(response.videos[0] ?? null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <section className="paper-panel">正在加载微课视频...</section>
  }

  if (!video) {
    return (
      <section className="paper-panel">
        <h1>还没有可用视频</h1>
        <p>教师端创建视频资源后，这里会自动显示。</p>
      </section>
    )
  }

  if (started) {
    return (
      <section className="immersive-video-shell" aria-label="全屏视频学习">
        <div className="immersive-video-header">
          <button className="icon-text-button" type="button" onClick={() => setStarted(false)}>
            <ArrowLeft size={16} />
            返回课程
          </button>
          <div>
            <strong>{video.title}</strong>
            <span>小蔡伦可在右下角继续实时答疑</span>
          </div>
        </div>
        <LearningVideoPlayer video={video} autoPlay />
      </section>
    )
  }

  return (
    <section className="student-video-page">
      <div className="section-heading">
        <p className="eyebrow">教学视频</p>
        <h1>{video.title}</h1>
        <p>{video.description}</p>
      </div>
      <article className="video-start-panel paper-panel">
        <div>
          <p className="eyebrow">微课资源</p>
          <h2>点击后进入沉浸式视频学习</h2>
          <p>进度条上的彩色片段来自后台知识点 marker，播放、暂停、跳转、回看和倍速都会记录到学习数据。</p>
        </div>
        <button className="primary-button video-start-button" type="button" onClick={() => setStarted(true)}>
          <PlayCircle size={20} />
          开始视频学习
        </button>
      </article>
      <LearningVideoPlayer video={video} />
    </section>
  )
}
