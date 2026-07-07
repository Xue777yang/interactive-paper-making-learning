import { Router } from 'express'
import { prisma } from '../db.js'
import { authenticate, requireTeacher, type AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, toNumber } from '../utils.js'

export const questionsRouter = Router()

const includeQuestion = {
  tags: { include: { knowledgeTag: true } },
  _count: { select: { answerRecords: true } },
} as const

questionsRouter.use(authenticate)

questionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const tagId = typeof req.query.tagId === 'string' ? req.query.tagId : ''
    const difficulty = typeof req.query.difficulty === 'string' ? Number(req.query.difficulty) : undefined
    const active = typeof req.query.active === 'string' ? req.query.active === 'true' : undefined

    const questions = await prisma.question.findMany({
      where: {
        ...(search ? { stem: { contains: search } } : {}),
        ...(tagId ? { tags: { some: { knowledgeTagId: tagId } } } : {}),
        ...(difficulty ? { difficulty } : {}),
        ...(typeof active === 'boolean' ? { active } : {}),
      },
      include: includeQuestion,
      orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
    })
    res.json({ questions })
  }),
)

questionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id },
      include: {
        ...includeQuestion,
        answerRecords: true,
      },
    })
    if (!question) {
      res.status(404).json({ message: '题目不存在。' })
      return
    }
    res.json({ question })
  }),
)

questionsRouter.post(
  '/',
  requireTeacher,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest
    const payload = parseQuestionPayload(req.body)
    const id = typeof req.body.id === 'string' && req.body.id.trim() ? req.body.id.trim() : `question-${Date.now()}`
    const tagIds = payload.tagIds ?? []
    const question = await prisma.question.create({
      data: {
        id,
        ...payload.data,
        createdById: user.id,
        tags: {
          create: tagIds.map((knowledgeTagId) => ({ knowledgeTagId })),
        },
      },
      include: includeQuestion,
    })
    res.status(201).json({ question })
  }),
)

questionsRouter.put(
  '/:id',
  requireTeacher,
  asyncHandler(async (req, res) => {
    const payload = parseQuestionPayload(req.body, true)
    const question = await prisma.question.update({
      where: { id: req.params.id },
      data: {
        ...payload.data,
        ...(payload.tagIds
          ? {
              tags: {
                deleteMany: {},
                create: payload.tagIds.map((knowledgeTagId) => ({ knowledgeTagId })),
              },
            }
          : {}),
      },
      include: includeQuestion,
    })
    res.json({ question })
  }),
)

questionsRouter.delete(
  '/:id',
  requireTeacher,
  asyncHandler(async (req, res) => {
    const answerCount = await prisma.answerRecord.count({ where: { questionId: req.params.id } })
    if (answerCount > 0) {
      const question = await prisma.question.update({
        where: { id: req.params.id },
        data: { active: false },
        include: includeQuestion,
      })
      res.json({ question, mode: 'deactivated' })
      return
    }

    await prisma.question.delete({ where: { id: req.params.id } })
    res.json({ ok: true, mode: 'deleted' })
  }),
)

questionsRouter.post(
  '/:id/tags',
  requireTeacher,
  asyncHandler(async (req, res) => {
    const tagIds = normalizeTagIds(req.body.tagIds ?? req.body.knowledgeTagIds)
    await prisma.questionKnowledgeTag.deleteMany({ where: { questionId: req.params.id } })
    await prisma.questionKnowledgeTag.createMany({
      data: tagIds.map((knowledgeTagId) => ({ questionId: req.params.id, knowledgeTagId })),
    })
    const question = await prisma.question.findUnique({ where: { id: req.params.id }, include: includeQuestion })
    res.json({ question })
  }),
)

questionsRouter.delete(
  '/:id/tags/:tagId',
  requireTeacher,
  asyncHandler(async (req, res) => {
    await prisma.questionKnowledgeTag.delete({
      where: {
        questionId_knowledgeTagId: {
          questionId: req.params.id,
          knowledgeTagId: req.params.tagId,
        },
      },
    })
    res.json({ ok: true })
  }),
)

function parseQuestionPayload(body: Record<string, unknown>, partial = false) {
  const options = Array.isArray(body.options)
    ? body.options.map((item) => String(item))
    : [body.optionA, body.optionB, body.optionC, body.optionD].map((item) => String(item ?? ''))
  const data = {
    stem: String(body.stem ?? ''),
    optionA: options[0] ?? '',
    optionB: options[1] ?? '',
    optionC: options[2] ?? '',
    optionD: options[3] ?? '',
    answerIndex: toNumber(body.answerIndex, 0),
    explanation: String(body.explanation ?? ''),
    difficulty: Math.min(5, Math.max(1, toNumber(body.difficulty, 3))),
    active: typeof body.active === 'boolean' ? body.active : true,
  }

  if (!partial && (!data.stem || options.some((option) => !option) || !data.explanation)) {
    throw Object.assign(new Error('题干、选项和解析不能为空。'), { statusCode: 400 })
  }

  return {
    data,
    tagIds: body.tagIds === undefined && body.knowledgeTagIds === undefined ? undefined : normalizeTagIds(body.tagIds ?? body.knowledgeTagIds),
  }
}

function normalizeTagIds(value: unknown) {
  return Array.isArray(value) ? [...new Set(value.map((item) => String(item)).filter(Boolean))] : []
}
