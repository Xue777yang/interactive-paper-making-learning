import { Router } from 'express'
import { prisma } from '../db.js'
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, toNumber } from '../utils.js'

export const processEventsRouter = Router()

processEventsRouter.use(authenticate)

processEventsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest
    if (user.role !== 'student') {
      res.status(403).json({ message: '教师账号不能写入学生互动演示记录。' })
      return
    }

    const event = await prisma.processEvent.create({
      data: {
        userId: user.id,
        stepId: String(req.body?.stepId ?? ''),
        eventType: String(req.body?.type ?? req.body?.eventType ?? 'step_completed'),
        progress: req.body?.progress === undefined ? null : toNumber(req.body.progress, 0),
        completed: Boolean(req.body?.completed),
        timeSpentMs: req.body?.timeSpent === undefined ? null : toNumber(req.body.timeSpent, 0),
        interactionCount: req.body?.interactionCount === undefined ? null : toNumber(req.body.interactionCount, 0),
        knowledgePoints: JSON.stringify(Array.isArray(req.body?.knowledgePoints) ? req.body.knowledgePoints : []),
        metadata: JSON.stringify({
          phase: req.body?.phase ?? '',
          actions: Array.isArray(req.body?.actions) ? req.body.actions : [],
          completedAt: req.body?.completedAt ?? new Date().toISOString(),
        }),
      },
    })
    res.status(201).json({ event })
  }),
)
