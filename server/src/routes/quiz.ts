import { Router } from 'express'
import { prisma } from '../db.js'
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js'
import { buildStudentReport } from '../services/learningAnalytics.js'
import { asyncHandler, average, toNumber } from '../utils.js'

export const quizRouter = Router()

quizRouter.use(authenticate)

quizRouter.post(
  '/session',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest
    if (user.role !== 'student') {
      res.status(403).json({ message: '教师账号不能创建学生答题会话。' })
      return
    }

    const session = await prisma.quizSession.create({
      data: {
        userId: user.id,
        totalQuestions: Math.min(50, Math.max(1, toNumber(req.body?.totalQuestions, 20))),
      },
    })
    res.status(201).json({ session })
  }),
)

quizRouter.post(
  '/answer',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest
    const quizSessionId = String(req.body?.quizSessionId ?? '')
    const questionId = String(req.body?.questionId ?? '')
    const selectedIndex = toNumber(req.body?.selectedIndex, -1)

    const [session, question] = await Promise.all([
      prisma.quizSession.findUnique({ where: { id: quizSessionId }, include: { answerRecords: true } }),
      prisma.question.findUnique({ where: { id: questionId } }),
    ])

    if (!session || session.userId !== user.id || !question) {
      res.status(404).json({ message: '答题会话或题目不存在。' })
      return
    }

    const correct = selectedIndex === question.answerIndex
    const record = await prisma.answerRecord.create({
      data: {
        quizSessionId: session.id,
        userId: user.id,
        questionId: question.id,
        selectedIndex,
        correct,
        timeSpentMs: Math.max(0, toNumber(req.body?.timeSpentMs, 0)),
        usedAgentHelp: Boolean(req.body?.usedAgentHelp),
        difficulty: question.difficulty,
      },
    })

    const records = [...session.answerRecords, record]
    const correctCount = records.filter((item) => item.correct).length
    const completed = records.length >= session.totalQuestions
    const updatedSession = await prisma.quizSession.update({
      where: { id: session.id },
      data: {
        correctCount,
        helpUsed: Math.max(session.helpUsed, toNumber(req.body?.helpUsed, session.helpUsed)),
        averageTimeMs: average(records.map((item) => item.timeSpentMs)),
        finalAbility: toNumber(req.body?.finalAbility, session.finalAbility),
        completedAt: completed ? new Date() : session.completedAt,
      },
    })

    res.status(201).json({ record, session: updatedSession })
  }),
)

quizRouter.get(
  '/report/latest',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest
    const report = await buildStudentReport(user.id)
    res.json({ report })
  }),
)

quizRouter.get(
  '/report/:sessionId',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest
    const session = await prisma.quizSession.findUnique({
      where: { id: req.params.sessionId },
      include: {
        answerRecords: {
          include: {
            question: {
              include: { tags: { include: { knowledgeTag: true } } },
            },
          },
        },
      },
    })

    if (!session || (user.role !== 'teacher' && session.userId !== user.id)) {
      res.status(404).json({ message: '答题报告不存在。' })
      return
    }

    res.json({ session })
  }),
)
