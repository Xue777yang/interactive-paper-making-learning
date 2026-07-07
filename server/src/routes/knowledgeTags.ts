import { Router } from 'express'
import { prisma } from '../db.js'
import { authenticate, requireTeacher } from '../middleware/auth.js'
import { asyncHandler, toNumber } from '../utils.js'

export const knowledgeTagsRouter = Router()

knowledgeTagsRouter.use(authenticate)

knowledgeTagsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const tags = await prisma.knowledgeTag.findMany({
      include: {
        _count: {
          select: {
            questionTags: true,
            videoMarkers: true,
          },
        },
      },
      orderBy: [{ active: 'desc' }, { orderIndex: 'asc' }],
    })
    res.json({ tags })
  }),
)

knowledgeTagsRouter.post(
  '/',
  requireTeacher,
  asyncHandler(async (req, res) => {
    const tag = await prisma.knowledgeTag.create({ data: parseTagPayload(req.body) })
    res.status(201).json({ tag })
  }),
)

knowledgeTagsRouter.put(
  '/:id',
  requireTeacher,
  asyncHandler(async (req, res) => {
    const tag = await prisma.knowledgeTag.update({
      where: { id: req.params.id },
      data: parseTagPayload(req.body, true),
    })
    res.json({ tag })
  }),
)

knowledgeTagsRouter.delete(
  '/:id',
  requireTeacher,
  asyncHandler(async (req, res) => {
    const mergeToId = typeof req.body?.mergeToId === 'string' ? req.body.mergeToId : ''
    const [questionRefs, markerRefs] = await Promise.all([
      prisma.questionKnowledgeTag.count({ where: { knowledgeTagId: req.params.id } }),
      prisma.videoKnowledgeMarker.count({ where: { knowledgeTagId: req.params.id } }),
    ])

    if (mergeToId && mergeToId !== req.params.id) {
      const questionLinks = await prisma.questionKnowledgeTag.findMany({ where: { knowledgeTagId: req.params.id } })
      for (const link of questionLinks) {
        await prisma.questionKnowledgeTag.upsert({
          where: {
            questionId_knowledgeTagId: {
              questionId: link.questionId,
              knowledgeTagId: mergeToId,
            },
          },
          update: {},
          create: { questionId: link.questionId, knowledgeTagId: mergeToId },
        })
      }
      await prisma.videoKnowledgeMarker.updateMany({
        where: { knowledgeTagId: req.params.id },
        data: { knowledgeTagId: mergeToId },
      })
      await prisma.knowledgeTag.update({ where: { id: req.params.id }, data: { active: false } })
      res.json({ ok: true, mode: 'merged' })
      return
    }

    if (questionRefs > 0 || markerRefs > 0) {
      const tag = await prisma.knowledgeTag.update({
        where: { id: req.params.id },
        data: { active: false },
      })
      res.json({ tag, mode: 'deactivated' })
      return
    }

    await prisma.knowledgeTag.delete({ where: { id: req.params.id } })
    res.json({ ok: true, mode: 'deleted' })
  }),
)

function parseTagPayload(body: Record<string, unknown>, partial = false) {
  const data = {
    code: String(body.code ?? '').trim(),
    name: String(body.name ?? '').trim(),
    description: String(body.description ?? '').trim(),
    color: String(body.color ?? '#2f855a').trim(),
    parentId: typeof body.parentId === 'string' && body.parentId ? body.parentId : null,
    orderIndex: toNumber(body.orderIndex, 0),
    active: typeof body.active === 'boolean' ? body.active : true,
  }

  if (!partial && (!data.code || !data.name)) {
    throw Object.assign(new Error('知识点 code 和名称不能为空。'), { statusCode: 400 })
  }

  return data
}
