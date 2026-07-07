import { formatDuration } from '../../lib/utils'

type HeatmapBucket = {
  start: number
  end: number
  intensity: number
  replayCount?: number
}

export function VideoHeatmap({ buckets }: { buckets: HeatmapBucket[] }) {
  if (!buckets.length) return <p>暂无视频行为数据。</p>

  return (
    <div className="video-heatmap" aria-label="视频时间轴热力图">
      {buckets.map((bucket) => (
        <span
          key={`${bucket.start}-${bucket.end}`}
          style={{ opacity: 0.18 + bucket.intensity * 0.82 }}
          title={`${formatDuration(bucket.start * 1000)}-${formatDuration(bucket.end * 1000)}，回看 ${bucket.replayCount ?? 0} 次`}
        />
      ))}
    </div>
  )
}
