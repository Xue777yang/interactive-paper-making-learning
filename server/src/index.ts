import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { getServerConfig, validateRuntimeEnv } from './config/env.js'
import { prisma } from './db.js'
import {
  agentChatRateLimit,
  authLoginRateLimit,
  authRegisterRateLimit,
  videoEventBatchRateLimit,
} from './middleware/rateLimits.js'
import { authRouter } from './routes/auth.js'
import { agentRouter } from './routes/agent.js'
import { knowledgeTagsRouter } from './routes/knowledgeTags.js'
import { processEventsRouter } from './routes/processEvents.js'
import { questionsRouter } from './routes/questions.js'
import { quizRouter } from './routes/quiz.js'
import { teacherAnalyticsRouter } from './routes/teacherAnalytics.js'
import { videoAnalyticsRouter, videoEventsRouter } from './routes/videoEvents.js'
import { videoMarkersRouter, videosRouter } from './routes/videos.js'
import { buildTeacherDashboard } from './services/learningAnalytics.js'

const app = express()
const config = getServerConfig()

validateRuntimeEnv(config)

app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }
      const normalizedOrigin = origin.replace(/\/$/, '')
      if (config.allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true)
        return
      }
      callback(new Error(`CORS origin not allowed: ${origin}`))
    },
    credentials: false,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (_req, res) => {
  const time = new Date().toISOString()
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', time, database: 'ok' })
  } catch (error) {
    console.error('Health database check failed:', error instanceof Error ? error.message : error)
    res.status(503).json({ status: 'error', time, database: 'error', message: '数据库连接失败。' })
  }
})

app.use('/api/auth/login', authLoginRateLimit)
app.use('/api/auth/register', authRegisterRateLimit)
app.use('/api/agent/chat', agentChatRateLimit)
app.use('/api/video-events/batch', videoEventBatchRateLimit)

app.use('/api/auth', authRouter)
app.use('/api/questions', questionsRouter)
app.use('/api/knowledge-tags', knowledgeTagsRouter)
app.use('/api/quiz', quizRouter)
app.use('/api/teacher', teacherAnalyticsRouter)
app.use('/api/agent', agentRouter)
app.use('/api/videos', videosRouter)
app.use('/api/video-markers', videoMarkersRouter)
app.use('/api/video-events', videoEventsRouter)
app.use('/api/video-analytics', videoAnalyticsRouter)
app.use('/api/process-events', processEventsRouter)

app.use((error: Error & { statusCode?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  void _next
  const statusCode = error.statusCode ?? 500
  if (statusCode >= 500) {
    console.error(error)
  }
  res.status(statusCode).json({ message: error.message || '服务端处理失败。' })
})

app.listen(config.port, config.host, () => {
  console.log(`Paper-making learning API listening on ${config.host}:${config.port}`)
  if (config.isProduction) {
    setTimeout(() => {
      void buildTeacherDashboard().catch((error) => {
        console.error('Teacher dashboard warmup failed:', error instanceof Error ? error.message : error)
      })
    }, 2500)
  }
})
