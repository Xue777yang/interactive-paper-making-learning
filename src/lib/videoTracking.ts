import { apiUrl, getAuthToken } from './apiClient'

export type VideoEventPayload = {
  videoId: string
  eventType: 'play' | 'pause' | 'timeupdate' | 'seek' | 'replay' | 'ratechange' | 'ended' | 'visibilitychange'
  videoTime: number
  fromTime?: number | null
  toTime?: number | null
  playbackRate?: number
  watchedDeltaMs?: number
  metadata?: Record<string, unknown>
}

export function createVideoEventBuffer(videoId: string) {
  let queue: VideoEventPayload[] = []

  function push(event: Omit<VideoEventPayload, 'videoId'>) {
    queue.push({
      videoId,
      ...event,
      videoTime: Number.isFinite(event.videoTime) ? event.videoTime : 0,
    })
  }

  async function flush(keepalive = false) {
    if (!queue.length) return
    const events = queue
    queue = []
    const token = getAuthToken()
    if (!token) return

    try {
      await fetch(apiUrl('/video-events/batch'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
        keepalive,
      })
    } catch {
      queue = [...events, ...queue].slice(-80)
    }
  }

  return { push, flush }
}
