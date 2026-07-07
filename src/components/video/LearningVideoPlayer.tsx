import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Pause, Play, RotateCcw, Volume2 } from 'lucide-react'
import type { VideoDto, VideoMarkerDto } from '../../lib/analyticsTypes'
import { createVideoEventBuffer } from '../../lib/videoTracking'
import { formatDuration } from '../../lib/utils'

type LearningVideoPlayerProps = {
  video: VideoDto
  autoPlay?: boolean
}

const VIDEO_BASE_URL = (import.meta.env.VITE_VIDEO_BASE_URL || '/videos').replace(/\/$/, '')

export function LearningVideoPlayer({ video, autoPlay = false }: LearningVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const tracker = useMemo(() => createVideoEventBuffer(video.id), [video.id])
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(video.duration || 0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [hoveredMarker, setHoveredMarker] = useState<VideoMarkerDto | null>(null)
  const [resourceError, setResourceError] = useState(false)
  const seekFromRef = useRef<number | null>(null)
  const lastTrackedAtRef = useRef(Date.now())
  const lastTrackedVideoTimeRef = useRef(0)

  const activeMarker = video.markers.find((marker) => currentTime >= marker.startTime && currentTime <= marker.endTime) ?? null
  const hasVideoSource = Boolean(video.src?.trim())

  useEffect(() => {
    if (!autoPlay) return
    const element = videoRef.current
    if (!element) return
    void element.play().catch(() => undefined)
  }, [autoPlay])

  useEffect(() => {
    const handleVisibility = () => {
      tracker.push({
        eventType: 'visibilitychange',
        videoTime: videoRef.current?.currentTime ?? currentTime,
        playbackRate,
        metadata: { state: document.visibilityState },
      })
      if (document.visibilityState === 'hidden') void tracker.flush(true)
    }
    const handleBeforeUnload = () => void tracker.flush(true)

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      void tracker.flush(true)
    }
  }, [currentTime, playbackRate, tracker])

  useEffect(() => {
    setResourceError(false)
  }, [video.src])

  function handlePlay() {
    const element = videoRef.current
    if (!element) return
    setPlaying(true)
    lastTrackedAtRef.current = Date.now()
    lastTrackedVideoTimeRef.current = element.currentTime
    tracker.push({ eventType: 'play', videoTime: element.currentTime, playbackRate: element.playbackRate })
  }

  function handlePause() {
    const element = videoRef.current
    if (!element) return
    setPlaying(false)
    tracker.push({ eventType: 'pause', videoTime: element.currentTime, playbackRate: element.playbackRate })
    void tracker.flush()
  }

  function handleTimeUpdate() {
    const element = videoRef.current
    if (!element) return
    setCurrentTime(element.currentTime)
    const now = Date.now()
    const wallDelta = now - lastTrackedAtRef.current
    if (!element.paused && wallDelta >= 5000) {
      tracker.push({
        eventType: 'timeupdate',
        videoTime: element.currentTime,
        playbackRate: element.playbackRate,
        watchedDeltaMs: Math.min(wallDelta, 8000),
      })
      lastTrackedAtRef.current = now
      lastTrackedVideoTimeRef.current = element.currentTime
      void tracker.flush()
    }
  }

  function handleSeeked() {
    const element = videoRef.current
    if (!element || seekFromRef.current === null) return
    const fromTime = seekFromRef.current
    const toTime = element.currentTime
    tracker.push({ eventType: 'seek', videoTime: toTime, fromTime, toTime, playbackRate: element.playbackRate })
    if (fromTime - toTime > 5) {
      tracker.push({ eventType: 'replay', videoTime: toTime, fromTime, toTime, playbackRate: element.playbackRate })
    }
    seekFromRef.current = null
    void tracker.flush()
  }

  function togglePlayback() {
    const element = videoRef.current
    if (!element) return
    if (element.paused) {
      void element.play()
    } else {
      element.pause()
    }
  }

  function seekTo(time: number) {
    const element = videoRef.current
    if (!element) return
    seekFromRef.current = element.currentTime
    element.currentTime = Math.max(0, Math.min(duration, time))
    setCurrentTime(element.currentTime)
  }

  function changeRate(rate: number) {
    const element = videoRef.current
    if (!element) return
    element.playbackRate = rate
    setPlaybackRate(rate)
    tracker.push({ eventType: 'ratechange', videoTime: element.currentTime, playbackRate: rate })
    void tracker.flush()
  }

  function handleEnded() {
    const element = videoRef.current
    setPlaying(false)
    tracker.push({ eventType: 'ended', videoTime: element?.currentTime ?? duration, playbackRate })
    void tracker.flush()
  }

  return (
    <div className="learning-video-player" ref={wrapperRef}>
      <div className="video-stage">
        {hasVideoSource && (
          <video
            ref={videoRef}
            poster={video.poster ?? undefined}
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || video.duration || 0)}
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onSeeking={() => {
              seekFromRef.current = videoRef.current?.currentTime ?? currentTime
            }}
            onSeeked={handleSeeked}
            onRateChange={(event) => setPlaybackRate(event.currentTarget.playbackRate)}
            onEnded={handleEnded}
            onError={() => setResourceError(true)}
          >
            <source src={video.src} type="video/mp4" />
            <source src={`${VIDEO_BASE_URL}/papermaking-course.webm`} type="video/webm" />
            <track src={`${VIDEO_BASE_URL}/papermaking-course.zh.vtt`} kind="subtitles" srcLang="zh" label="中文" />
          </video>
        )}

        {(!hasVideoSource || resourceError) && (
          <div className="video-resource-empty" role="status">
            <strong>视频资源暂未配置</strong>
            <p>请检查 public/videos 文件，或在后台数据库的 VideoResource.src 中填写外部视频 URL。</p>
          </div>
        )}

        {activeMarker && (
          <aside className="video-knowledge-panel">
            <span style={{ background: activeMarker.color }} />
            <strong>{activeMarker.label}</strong>
            <p>{activeMarker.description}</p>
          </aside>
        )}
      </div>

      <div className="custom-video-controls">
        <button className="round-control" type="button" onClick={togglePlayback} aria-label={playing ? '暂停' : '播放'}>
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="round-control" type="button" onClick={() => seekTo(Math.max(0, currentTime - 10))} aria-label="回退十秒">
          <RotateCcw size={18} />
        </button>
        <span className="video-time">
          {formatDuration(currentTime * 1000)} / {formatDuration(duration * 1000)}
        </span>
        <div className="video-scrubber">
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.1"
            value={Math.min(currentTime, duration || currentTime)}
            onChange={(event) => seekTo(Number(event.target.value))}
            aria-label="视频进度"
          />
          <div className="video-marker-track" aria-hidden="true">
            {video.markers.map((marker) => (
              <button
                key={marker.id}
                type="button"
                style={{
                  left: `${duration ? (marker.startTime / duration) * 100 : 0}%`,
                  width: `${duration ? Math.max(0.9, ((marker.endTime - marker.startTime) / duration) * 100) : 1}%`,
                  background: marker.color,
                }}
                onMouseEnter={() => setHoveredMarker(marker)}
                onMouseLeave={() => setHoveredMarker(null)}
                onClick={() => seekTo(marker.startTime)}
                aria-label={`跳转到${marker.label}`}
              />
            ))}
          </div>
          {hoveredMarker && (
            <div className="marker-tooltip">
              <strong>{hoveredMarker.label}</strong>
              <span>
                {formatDuration(hoveredMarker.startTime * 1000)} - {formatDuration(hoveredMarker.endTime * 1000)}
              </span>
              <p>{hoveredMarker.description}</p>
            </div>
          )}
        </div>
        <div className="rate-group" aria-label="倍速">
          {[0.75, 1, 1.25, 1.5].map((rate) => (
            <button key={rate} type="button" className={playbackRate === rate ? 'active' : ''} onClick={() => changeRate(rate)}>
              {rate}x
            </button>
          ))}
        </div>
        <button
          className="round-control"
          type="button"
          onClick={() => {
            const element = wrapperRef.current
            if (!element || document.fullscreenElement) return
            void element.requestFullscreen?.().catch(() => undefined)
          }}
          aria-label="浏览器全屏"
        >
          <Maximize2 size={18} />
        </button>
        <Volume2 size={18} aria-hidden="true" />
      </div>
    </div>
  )
}
