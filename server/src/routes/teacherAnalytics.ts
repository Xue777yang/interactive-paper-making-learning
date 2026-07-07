import { Router } from 'express'
import { authenticate, requireTeacher } from '../middleware/auth.js'
import {
  buildAgentAnalytics,
  buildKnowledgeAnalytics,
  buildQuestionAnalytics,
  buildStudentDetail,
  buildStudentRows,
  buildTeacherDashboard,
  buildVideoAnalytics,
} from '../services/learningAnalytics.js'
import { asyncHandler } from '../utils.js'

export const teacherAnalyticsRouter = Router()

teacherAnalyticsRouter.use(authenticate, requireTeacher)

teacherAnalyticsRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    res.json({ dashboard: await buildTeacherDashboard() })
  }),
)

teacherAnalyticsRouter.get(
  '/students',
  asyncHandler(async (_req, res) => {
    res.json({ students: await buildStudentRows() })
  }),
)

teacherAnalyticsRouter.get(
  '/students/:studentId',
  asyncHandler(async (req, res) => {
    const student = await buildStudentDetail(req.params.studentId)
    if (!student) {
      res.status(404).json({ message: '学生不存在。' })
      return
    }
    res.json({ student })
  }),
)

teacherAnalyticsRouter.get(
  '/question-analytics',
  asyncHandler(async (_req, res) => {
    res.json({ questions: await buildQuestionAnalytics() })
  }),
)

teacherAnalyticsRouter.get(
  '/knowledge-analytics',
  asyncHandler(async (_req, res) => {
    res.json({ knowledge: await buildKnowledgeAnalytics() })
  }),
)

teacherAnalyticsRouter.get(
  '/video-analytics',
  asyncHandler(async (_req, res) => {
    res.json({ analytics: await buildVideoAnalytics() })
  }),
)

teacherAnalyticsRouter.get(
  '/agent-analytics',
  asyncHandler(async (_req, res) => {
    res.json({ analytics: await buildAgentAnalytics() })
  }),
)

teacherAnalyticsRouter.get(
  '/agent-emotions',
  asyncHandler(async (_req, res) => {
    const analytics = await buildAgentAnalytics()
    res.json({ emotions: analytics.emotionTrend, distribution: analytics.emotionDistribution })
  }),
)
