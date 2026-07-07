import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../db.js'
import { authenticate, requireTeacher, type AuthenticatedRequest } from '../middleware/auth.js'
import { buildVideoAnalytics } from '../services/learningAnalytics.js'
import { asyncHandler, toNumber } from '../utils.js'

export const videoEventsRouter = Router()
export const videoAnalyticsRouter = Router()

type VideoEventType = 'play' | 'pause' | 'timeupdate' | 'seek' | 'replay' | 'ratechange' | 'ended' | 'visibilitychange'

const videoEventTypes: VideoEventType[] = [
  'play',
  'pause',
  'timeupdate',
  'seek',
  'replay',
  'ratechange',
  'ended',
  'visibilitychange',
]

videoEventsRouter.use(authenticate)
videoAnalyticsRouter.use(authenticate)

videoEventsRouter.post(
  '/batch',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest
    const events = Array.isArray(req.body?.events) ? (req.body.events as Array<Record<string, unknown>>) : []
    const data: Prisma.VideoEventCreateManyInput[] = events.flatMap((event) => {
      const eventType = normalizeVideoEventType(event.eventType)
      const videoId = String(event.videoId ?? req.body?.videoId ?? '')
      if (!eventType || !videoId) return []
      return [
        {
          userId: user.role === 'teacher' && event.userId ? String(event.userId) : user.id,
          videoId,
          eventType,
          videoTime: Math.max(0, toNumber(event.videoTime, 0)),
          fromTime: event.fromTime === undefined || event.fromTime === null ? null : Math.max(0, toNumber(event.fromTime, 0)),
          toTime: event.toTime === undefined || event.toTime === null ? null : Math.max(0, toNumber(event.toTime, 0)),
          playbackRate: event.playbackRate === undefined ? null : toNumber(event.playbackRate, 1),
          watchedDeltaMs: event.watchedDeltaMs === undefined ? null : Math.max(0, toNumber(event.watchedDeltaMs, 0)),
          metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        },
      ]
    })

    if (!data.length) {
      res.json({ inserted: 0 })
      return
    }

    await prisma.videoEvent.createMany({ data })
    res.status(201).json({ inserted: data.length })
  }),
)

videoAnalyticsRouter.get(
  '/:videoId',
  requireTeacher,
  asyncHandler(async (req, res) => {
    const analytics = await buildVideoAnalytics(req.params.videoId)
    res.json({ analytics })
  }),
)

videoAnalyticsRouter.get(
  '/:videoId/student/:studentId',
  requireTeacher,
  asyncHandler(async (req, res) => {
    const analytics = await buildVideoAnalytics(req.params.videoId, req.params.studentId)
    res.json({ analytics })
  }),
)

function normalizeVideoEventType(value: unknown): VideoEventType | null {
  return videoEventTypes.includes(value as VideoEventType) ? (value as VideoEventType) : null
}
