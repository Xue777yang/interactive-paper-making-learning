import { FormEvent, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/apiClient'
import type { KnowledgeTagDto, VideoDto, VideoMarkerDto } from '../../lib/analyticsTypes'
import { formatDuration, formatPercent } from '../../lib/utils'
import { DataBar } from '../../components/teacher/DataBar'
import { VideoHeatmap } from '../../components/teacher/VideoHeatmap'

type VideoAnalytics = {
  video: VideoDto | null
  completionRate: number
  averageWatchTimeMs: number
  heatmap: Array<{ start: number; end: number; intensity: number; replayCount?: number }>
  replayHotspots: Array<{ start: number; end: number; count: number }>
  skippedHotspots: Array<{ markerId: string; label: string; count: number }>
  markerStats: Array<{ markerId: string; label: string; coverageRate: number; replayCount: number; skippedCount: number; averageStayTimeMs: number }>
  studentSummaries: Array<{ studentId: string; displayName: string; completionRate: number; totalWatchTimeMs: number }>
  performanceLinks: Array<{ markerLabel: string; correctRate: number; answerCount: number; note: string }>
}

const emptyMarker = {
  id: '',
  label: '',
  startTime: 0,
  endTime: 10,
  knowledgeTagId: '',
  description: '',
  color: '#2563eb',
  orderIndex: 0,
}

export function TeacherVideoAnalyticsPage() {
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null)
  const [videos, setVideos] = useState<VideoDto[]>([])
  const [tags, setTags] = useState<KnowledgeTagDto[]>([])
  const [selectedVideoId, setSelectedVideoId] = useState('')
  const [form, setForm] = useState(emptyMarker)
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null)
  const selectedVideo = useMemo(() => videos.find((video) => video.id === selectedVideoId) ?? analytics?.video ?? null, [analytics?.video, selectedVideoId, videos])

  useEffect(() => {
    void refreshBase()
  }, [])

  useEffect(() => {
    if (!selectedVideoId) return
    void refreshAnalytics(selectedVideoId)
  }, [selectedVideoId])

  async function refreshBase() {
    const [analyticsResponse, videoResponse, tagResponse] = await Promise.all([
      apiFetch<{ analytics: VideoAnalytics }>('/teacher/video-analytics'),
      apiFetch<{ videos: VideoDto[] }>('/videos'),
      apiFetch<{ tags: KnowledgeTagDto[] }>('/knowledge-tags'),
    ])
    setAnalytics(analyticsResponse.analytics)
    setVideos(videoResponse.videos)
    setTags(tagResponse.tags)
    setSelectedVideoId(analyticsResponse.analytics.video?.id ?? videoResponse.videos[0]?.id ?? '')
  }

  async function refreshAnalytics(videoId = selectedVideoId) {
    if (!videoId) return
    const response = await apiFetch<{ analytics: VideoAnalytics }>(`/video-analytics/${videoId}`)
    setAnalytics(response.analytics)
    const videoResponse = await apiFetch<{ videos: VideoDto[] }>('/videos')
    setVideos(videoResponse.videos)
  }

  function editMarker(marker: VideoMarkerDto) {
    setEditingMarkerId(marker.id)
    setForm({
      id: marker.id,
      label: marker.label,
      startTime: marker.startTime,
      endTime: marker.endTime,
      knowledgeTagId: marker.knowledgeTagId,
      description: marker.description,
      color: marker.color,
      orderIndex: marker.orderIndex,
    })
  }

  async function submitMarker(event: FormEvent) {
    event.preventDefault()
    const tag = tags.find((item) => item.id === form.knowledgeTagId)
    const body = {
      label: form.label,
      startTime: form.startTime,
      endTime: form.endTime,
      knowledgeTagId: form.knowledgeTagId,
      description: form.description,
      color: form.color || tag?.color,
      orderIndex: form.orderIndex,
    }

    if (editingMarkerId) {
      await apiFetch(`/video-markers/${editingMarkerId}`, { method: 'PUT', body: JSON.stringify(body) })
    } else if (selectedVideoId) {
      await apiFetch(`/videos/${selectedVideoId}/markers`, { method: 'POST', body: JSON.stringify(body) })
    }

    setForm(emptyMarker)
    setEditingMarkerId(null)
    await refreshAnalytics()
  }

  async function deleteMarker(markerId: string) {
    await apiFetch(`/video-markers/${markerId}`, { method: 'DELETE' })
    await refreshAnalytics()
  }

  if (!analytics) return <section className="paper-panel">正在加载视频分析...</section>

  return (
    <section className="teacher-page">
      <div className="teacher-page-title">
        <div>
          <p className="eyebrow">视频学习分析</p>
          <h1>观看行为、知识点 marker 与答题关联</h1>
        </div>
        <select value={selectedVideoId} onChange={(event) => setSelectedVideoId(event.target.value)}>
          {videos.map((video) => (
            <option key={video.id} value={video.id}>
              {video.title}
            </option>
          ))}
        </select>
      </div>

      <div className="teacher-grid two">
        <article className="paper-panel">
          <h2>班级视频行为</h2>
          <div className="mini-kpis">
            <span>完成率 {formatPercent(analytics.completionRate)}</span>
            <span>平均观看 {formatDuration(analytics.averageWatchTimeMs)}</span>
          </div>
          <VideoHeatmap buckets={analytics.heatmap} />
          <div className="compact-list">
            {analytics.replayHotspots.slice(0, 4).map((segment) => (
              <p key={`${segment.start}-${segment.end}`}>
                回看热点 {formatDuration(segment.start * 1000)} - {formatDuration(segment.end * 1000)}：{segment.count} 次
              </p>
            ))}
            {analytics.skippedHotspots.slice(0, 4).map((segment) => (
              <p key={segment.markerId}>
                跳过较多：{segment.label} · {segment.count} 次
              </p>
            ))}
          </div>
        </article>

        <article className="paper-panel">
          <h2>按知识点片段统计</h2>
          <div className="data-bar-list">
            {analytics.markerStats.map((marker) => (
              <DataBar key={marker.markerId} label={`${marker.label} · 回看 ${marker.replayCount} · 跳过 ${marker.skippedCount}`} value={marker.coverageRate} />
            ))}
          </div>
        </article>
      </div>

      <div className="teacher-grid video-marker-grid">
        <article className="paper-panel">
          <h2>{editingMarkerId ? '编辑视频 marker' : '新增视频 marker'}</h2>
          <form className="editor-form" onSubmit={submitMarker}>
            <label>
              label
              <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} required />
            </label>
            <div className="form-row">
              <label>
                开始秒
                <input type="number" min="0" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: Number(event.target.value) })} />
              </label>
              <label>
                结束秒
                <input type="number" min="0" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: Number(event.target.value) })} />
              </label>
            </div>
            <label>
              知识点
              <select value={form.knowledgeTagId} onChange={(event) => {
                const tag = tags.find((item) => item.id === event.target.value)
                setForm({ ...form, knowledgeTagId: event.target.value, color: tag?.color ?? form.color })
              }} required>
                <option value="">请选择</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              描述
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <div className="form-row">
              <label>
                颜色
                <input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
              </label>
              <label>
                排序
                <input type="number" value={form.orderIndex} onChange={(event) => setForm({ ...form, orderIndex: Number(event.target.value) })} />
              </label>
            </div>
            <div className="inline-actions">
              <button className="primary-button" type="submit">
                {editingMarkerId ? '保存 marker' : '新增 marker'}
              </button>
              {editingMarkerId && (
                <button className="ghost-button" type="button" onClick={() => {
                  setEditingMarkerId(null)
                  setForm(emptyMarker)
                }}>
                  取消
                </button>
              )}
            </div>
          </form>
        </article>

        <article className="paper-panel">
          <h2>{selectedVideo?.title ?? '视频'} marker 列表</h2>
          <div className="marker-admin-list">
            {(selectedVideo?.markers ?? []).map((marker) => (
              <div className="marker-admin-card" key={marker.id}>
                <span style={{ background: marker.color }} />
                <div>
                  <strong>{marker.label}</strong>
                  <small>
                    {formatDuration(marker.startTime * 1000)} - {formatDuration(marker.endTime * 1000)} · {marker.knowledgeTag?.name}
                  </small>
                  <p>{marker.description}</p>
                </div>
                <div className="inline-actions">
                  <button className="secondary-button" type="button" onClick={() => editMarker(marker)}>
                    编辑
                  </button>
                  <button className="ghost-button" type="button" onClick={() => void deleteMarker(marker.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="paper-panel">
        <h2>视频学习行为与答题表现</h2>
        <div className="compact-list">
          {analytics.performanceLinks.map((item) => (
            <p key={item.markerLabel}>
              <strong>{item.markerLabel}</strong>：相关题 {item.answerCount} 条，正确率 {formatPercent(item.correctRate)}。{item.note}
            </p>
          ))}
        </div>
      </article>
    </section>
  )
}
