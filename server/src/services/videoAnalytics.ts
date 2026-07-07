import { average } from '../utils.js'

export type VideoEventLike = {
  eventType: string
  videoTime: number
  fromTime?: number | null
  toTime?: number | null
  watchedDeltaMs?: number | null
  playbackRate?: number | null
  createdAt?: Date | string
}

export type VideoMarkerLike = {
  id: string
  label: string
  startTime: number
  endTime: number
  color?: string
  knowledgeTag?: { id: string; name: string; code: string; color: string } | null
}

export type WatchedInterval = {
  start: number
  end: number
}

export type MarkerWatchStat = {
  markerId: string
  label: string
  coverageRate: number
  replayCount: number
  skippedCount: number
  averageStayTimeMs: number
}

export function mergeWatchedIntervals(events: VideoEventLike[]): WatchedInterval[] {
  const intervals: WatchedInterval[] = []
  let playStartedAt: number | null = null

  for (const event of sortEvents(events)) {
    if (event.eventType === 'play') {
      playStartedAt = event.videoTime
    }

    if (event.eventType === 'timeupdate' && event.watchedDeltaMs && event.watchedDeltaMs > 0) {
      const deltaSeconds = Math.min(12, event.watchedDeltaMs / 1000)
      intervals.push({
        start: Math.max(0, event.videoTime - deltaSeconds),
        end: Math.max(0, event.videoTime),
      })
    }

    if ((event.eventType === 'pause' || event.eventType === 'ended') && playStartedAt !== null) {
      if (event.videoTime > playStartedAt) {
        intervals.push({ start: playStartedAt, end: event.videoTime })
      }
      playStartedAt = null
    }

    if (event.eventType === 'seek') {
      playStartedAt = event.toTime ?? event.videoTime
    }
  }

  return mergeIntervals(intervals)
}

export function calculateEffectiveWatchTime(events: VideoEventLike[]) {
  return sumIntervals(mergeWatchedIntervals(events)) * 1000
}

export function calculateTotalWatchTime(events: VideoEventLike[]) {
  const trackedMs = events.reduce((sum, event) => sum + Math.max(0, event.watchedDeltaMs ?? 0), 0)
  return trackedMs || calculateEffectiveWatchTime(events)
}

export function calculateCompletionRate(videoDuration: number, watchedIntervals: WatchedInterval[]) {
  if (!videoDuration) return 0
  return Math.min(1, sumIntervals(watchedIntervals) / videoDuration)
}

export function calculateReplayHotspots(events: VideoEventLike[]) {
  const buckets = new Map<number, { start: number; end: number; count: number }>()
  for (const event of events) {
    const isReplay =
      event.eventType === 'replay' ||
      (event.eventType === 'seek' &&
        typeof event.fromTime === 'number' &&
        typeof event.toTime === 'number' &&
        event.fromTime - event.toTime > 5)

    if (!isReplay) continue
    const start = Math.max(0, Math.floor((event.toTime ?? event.videoTime) / 10) * 10)
    const current = buckets.get(start) ?? { start, end: start + 10, count: 0 }
    current.count += 1
    buckets.set(start, current)
  }

  return [...buckets.values()].sort((left, right) => right.count - left.count)
}

export function calculateSkippedHotspots(events: VideoEventLike[], markers: VideoMarkerLike[]) {
  const counts = new Map<string, number>()
  for (const event of events) {
    if (event.eventType !== 'seek' || typeof event.fromTime !== 'number' || typeof event.toTime !== 'number') continue
    if (event.toTime <= event.fromTime + 5) continue
    for (const marker of markers) {
      if (event.fromTime <= marker.startTime && event.toTime >= marker.endTime) {
        counts.set(marker.id, (counts.get(marker.id) ?? 0) + 1)
      }
    }
  }

  return markers
    .map((marker) => ({ markerId: marker.id, label: marker.label, count: counts.get(marker.id) ?? 0 }))
    .sort((left, right) => right.count - left.count)
}

export function calculateMarkerWatchStats(
  markers: VideoMarkerLike[],
  watchedIntervals: WatchedInterval[],
  events: VideoEventLike[],
): MarkerWatchStat[] {
  return markers.map((marker) => {
    const markerLength = Math.max(1, marker.endTime - marker.startTime)
    const coveredSeconds = watchedIntervals.reduce((sum, interval) => {
      const start = Math.max(interval.start, marker.startTime)
      const end = Math.min(interval.end, marker.endTime)
      return sum + Math.max(0, end - start)
    }, 0)

    const replayCount = events.filter((event) => {
      const time = event.toTime ?? event.videoTime
      return (
        (event.eventType === 'replay' ||
          (event.eventType === 'seek' &&
            typeof event.fromTime === 'number' &&
            typeof event.toTime === 'number' &&
            event.fromTime - event.toTime > 5)) &&
        time >= marker.startTime &&
        time <= marker.endTime
      )
    }).length

    const skippedCount = events.filter(
      (event) =>
        event.eventType === 'seek' &&
        typeof event.fromTime === 'number' &&
        typeof event.toTime === 'number' &&
        event.toTime > event.fromTime + 5 &&
        event.fromTime <= marker.startTime &&
        event.toTime >= marker.endTime,
    ).length

    const staySamples = events
      .filter((event) => event.eventType === 'timeupdate' && event.videoTime >= marker.startTime && event.videoTime <= marker.endTime)
      .map((event) => event.watchedDeltaMs ?? 0)
      .filter((value) => value > 0)

    return {
      markerId: marker.id,
      label: marker.label,
      coverageRate: Math.min(1, coveredSeconds / markerLength),
      replayCount,
      skippedCount,
      averageStayTimeMs: average(staySamples),
    }
  })
}

export function buildTimelineHeatmap(events: VideoEventLike[], duration: number, bucketSize = 10) {
  const bucketCount = Math.max(1, Math.ceil(duration / bucketSize))
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    start: index * bucketSize,
    end: Math.min(duration, (index + 1) * bucketSize),
    watchMs: 0,
    replayCount: 0,
  }))

  for (const event of events) {
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor(event.videoTime / bucketSize)))
    if (event.eventType === 'timeupdate') buckets[index].watchMs += event.watchedDeltaMs ?? 0
    if (event.eventType === 'replay') buckets[index].replayCount += 1
  }

  const maxWatch = Math.max(1, ...buckets.map((bucket) => bucket.watchMs))
  return buckets.map((bucket) => ({ ...bucket, intensity: bucket.watchMs / maxWatch }))
}

function mergeIntervals(intervals: WatchedInterval[]) {
  const sorted = intervals
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start)
  const merged: WatchedInterval[] = []

  for (const interval of sorted) {
    const last = merged.at(-1)
    if (!last || interval.start > last.end + 0.75) {
      merged.push({ ...interval })
    } else {
      last.end = Math.max(last.end, interval.end)
    }
  }

  return merged
}

function sumIntervals(intervals: WatchedInterval[]) {
  return intervals.reduce((sum, interval) => sum + Math.max(0, interval.end - interval.start), 0)
}

function sortEvents(events: VideoEventLike[]) {
  return [...events].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
    return leftTime - rightTime
  })
}
