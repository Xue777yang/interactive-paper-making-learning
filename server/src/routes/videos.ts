import { Router } from 'express'
import { prisma } from '../db.js'
import { authenticate, requireTeacher } from '../middleware/auth.js'
import { asyncHandler, toNumber } from '../utils.js'

export const videosRouter = Router()
export const videoMarkersRouter = Router()

const includeVideo = {
  markers: { include: { knowledgeTag: true }, orderBy: { startTime: 'asc' } },
} as const

videosRouter.use(authenticate)
videoMarkersRouter.use(authenticate)

videosRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const videos = await prisma.videoResource.findMany({
      where: { active: true },
      include: includeVideo,
      orderBy: { createdAt: 'asc' },
    })
    res.json({ videos })
  }),
)

videosRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const video = await prisma.videoResource.findUnique({
      where: { id: req.params.id },
      include: includeVideo,
    })
    if (!video) {
      res.status(404).json({ message: '视频不存在。' })
      return
    }
    res.json({ video })
  }),
)

videosRouter.get(
  '/:id/markers',
  asyncHandler(async (req, res) => {
    const markers = await prisma.videoKnowledgeMarker.findMany({
      where: { videoId: req.params.id },
      include: { knowledgeTag: true },
      orderBy: { startTime: 'asc' },
    })
    res.json({ markers })
  }),
)

videosRouter.post(
  '/:id/markers',
  requireTeacher,
  asyncHandler(async (req, res) => {
    const marker = await prisma.videoKnowledgeMarker.create({
      data: { videoId: req.params.id, ...parseMarkerPayload(req.body) },
      include: { knowledgeTag: true },
    })
    res.status(201).json({ marker })
  }),
)

videoMarkersRouter.put(
  '/:id',
  requireTeacher,
  asyncHandler(async (req, res) => {
    const marker = await prisma.videoKnowledgeMarker.update({
      where: { id: req.params.id },
      data: parseMarkerPayload(req.body),
      include: { knowledgeTag: true },
    })
    res.json({ marker })
  }),
)

videoMarkersRouter.delete(
  '/:id',
  requireTeacher,
  asyncHandler(async (req, res) => {
    await prisma.videoKnowledgeMarker.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  }),
)

function parseMarkerPayload(body: Record<string, unknown>) {
  return {
    knowledgeTagId: String(body.knowledgeTagId ?? ''),
    label: String(body.label ?? ''),
    startTime: Math.max(0, toNumber(body.startTime, 0)),
    endTime: Math.max(0, toNumber(body.endTime, 0)),
    color: String(body.color ?? '#2f855a'),
    description: String(body.description ?? ''),
    orderIndex: toNumber(body.orderIndex, 0),
  }
}
