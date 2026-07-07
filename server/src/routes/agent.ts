import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { getAgentDailyLimitPerUser } from '../config/env.js'
import { prisma } from '../db.js'
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js'
import { analyzeLearningEmotion } from '../services/emotionAnalysis.js'
import {
  cailunSystemPrompt,
  chatWithDeepSeek,
  formatDeepSeekError,
  getDeepSeekRuntimeConfig,
  type DeepSeekMessage,
} from '../services/deepseekClient.js'
import { asyncHandler, toNumber } from '../utils.js'

export const agentRouter = Router()
type AgentContextType = 'general' | 'quiz' | 'video' | 'process'
type AgentQuestion = Prisma.QuestionGetPayload<{ include: { tags: { include: { knowledgeTag: true } } } }>

agentRouter.use(authenticate)

agentRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest
    const content = String(req.body?.message ?? '').trim()
    if (!content) {
      res.status(400).json({ message: '请输入要询问的内容。' })
      return
    }

    const dailyLimit = getAgentDailyLimitPerUser()
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const todayMessageCount = await prisma.agentMessage.count({
      where: {
        userId: user.id,
        role: 'user',
        createdAt: { gte: dayStart },
      },
    })
    if (todayMessageCount >= dailyLimit) {
      res.status(429).json({ message: `今日小助手提问次数已达上限（${dailyLimit} 次），请明天再试。` })
      return
    }

    const contextType = normalizeContextType(req.body?.contextType)
    const questionId = String(req.body?.currentQuestionId ?? req.body?.questionId ?? '') || null
    const quizSessionId = String(req.body?.quizSessionId ?? '') || null
    const relatedVideoTime =
      req.body?.currentVideoTime === undefined ? null : toNumber(req.body.currentVideoTime, 0)
    const question = questionId
      ? await prisma.question.findUnique({ where: { id: questionId }, include: { tags: { include: { knowledgeTag: true } } } })
      : null

    const conversation = await getOrCreateConversation({
      conversationId: typeof req.body?.conversationId === 'string' ? req.body.conversationId : undefined,
      userId: user.id,
      contextType,
      questionId,
      quizSessionId,
    })

    const userMessage = await prisma.agentMessage.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        role: 'user',
        content,
        relatedQuestionId: questionId,
        relatedVideoTime,
      },
    })

    const emotion = await analyzeLearningEmotion(content)
    await prisma.emotionAnalysis.create({
      data: {
        agentMessageId: userMessage.id,
        userId: user.id,
        ...emotion,
      },
    })

    const messages = buildDeepSeekMessages({
      content,
      contextType,
      question,
      questionSubmitted: Boolean(req.body?.questionSubmitted),
      currentVideoTime: relatedVideoTime,
    })

    const deepSeekConfig = getDeepSeekRuntimeConfig()
    let mode: 'deepseek' | 'local' = 'local'
    let providerStatus: 'deepseek_ok' | 'deepseek_missing_key' | 'deepseek_error' = deepSeekConfig.configured
      ? 'deepseek_error'
      : 'deepseek_missing_key'
    let reply = ''
    try {
      const result = await chatWithDeepSeek(messages)
      mode = result.mode
      providerStatus = result.mode === 'deepseek' ? 'deepseek_ok' : 'deepseek_missing_key'
      reply = result.content || localCailunReply(content, question, Boolean(req.body?.questionSubmitted), contextType)
    } catch (error) {
      console.error(
        `DeepSeek chat failed (${deepSeekConfig.model} @ ${deepSeekConfig.baseUrl}): ${formatDeepSeekError(error)}`,
      )
      reply = localCailunReply(content, question, Boolean(req.body?.questionSubmitted), contextType)
    }

    const assistantMessage = await prisma.agentMessage.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        role: 'assistant',
        content: reply,
        relatedQuestionId: questionId,
        relatedVideoTime,
      },
    })

    res.json({
      conversationId: conversation.id,
      reply,
      mode,
      providerStatus,
      emotion,
      assistantMessageId: assistantMessage.id,
    })
  }),
)

agentRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest
    const conversations = await prisma.agentConversation.findMany({
      where: user.role === 'teacher' ? {} : { userId: user.id },
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 6,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    res.json({ conversations })
  }),
)

agentRouter.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest
    const conversation = await prisma.agentConversation.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        messages: { include: { emotionAnalysis: true }, orderBy: { createdAt: 'asc' } },
      },
    })
    if (!conversation || (user.role !== 'teacher' && conversation.userId !== user.id)) {
      res.status(404).json({ message: '对话不存在。' })
      return
    }
    res.json({ conversation })
  }),
)

async function getOrCreateConversation(input: {
  conversationId?: string
  userId: string
  contextType: AgentContextType
  questionId: string | null
  quizSessionId: string | null
}) {
  if (input.conversationId) {
    const existing = await prisma.agentConversation.findUnique({ where: { id: input.conversationId } })
    if (existing && existing.userId === input.userId) return existing
  }

  return prisma.agentConversation.create({
    data: {
      userId: input.userId,
      contextType: input.contextType,
      questionId: input.questionId,
      quizSessionId: input.quizSessionId,
    },
  })
}

function buildDeepSeekMessages(input: {
  content: string
  contextType: AgentContextType
  question: AgentQuestion | null
  questionSubmitted: boolean
  currentVideoTime: number | null
}): DeepSeekMessage[] {
  const context: string[] = [`当前学习场景：${input.contextType}`]
  if (input.currentVideoTime !== null) context.push(`当前视频时间：${Math.round(input.currentVideoTime)} 秒`)

  if (input.question) {
    context.push(`当前题目：${input.question.stem}`)
    context.push(`选项：A.${input.question.optionA} B.${input.question.optionB} C.${input.question.optionC} D.${input.question.optionD}`)
    context.push(`关联知识点：${input.question.tags.map((tag) => tag.knowledgeTag.name).join('、')}`)
    if (input.questionSubmitted) {
      context.push(`已提交，正确答案序号：${input.question.answerIndex}`)
      context.push(`解析：${input.question.explanation}`)
    } else {
      context.push('题目尚未提交：禁止直接说出正确答案或选项，只能给提示。')
    }
  }

  return [
    { role: 'system', content: cailunSystemPrompt },
    { role: 'user', content: `${context.join('\n')}\n\n学生提问：${input.content}` },
  ]
}

function localCailunReply(
  text: string,
  question: AgentQuestion | null,
  submitted: boolean,
  contextType: AgentContextType,
) {
  if (question && contextType === 'quiz') {
    if (submitted) {
      const answer = [question.optionA, question.optionB, question.optionC, question.optionD][question.answerIndex]
      return `这题的关键是理解相关步骤。正确答案是“${answer}”。${question.explanation}`
    }
    return `先别急着选答案。你可以先找题干里的关键词，再回忆它属于“原料、蒸煮、打浆、抄纸、干燥、传播”中的哪一步；我不会直接告诉你选项，但可以帮你拆概念。`
  }

  if (/抄纸|竹帘|纸帘/.test(text)) {
    return '抄纸时，纸帘从浆水中平稳捞起，纤维留在帘面形成湿纸页。你可以把它想成“用筛网把分散的纤维铺成薄片”。'
  }
  if (/蒸煮|浸泡|软化/.test(text)) {
    return '浸泡和蒸煮的作用是让原料软化、纤维更容易分离。后面的打浆才更容易形成均匀纸浆。'
  }
  if (/打浆|纸浆|纤维/.test(text)) {
    return '打浆会把软化后的原料进一步分散成纤维悬浮液。纤维越均匀，后面抄出的纸页越平整。'
  }
  if (/蔡伦/.test(text)) {
    return '蔡伦的重要贡献在于总结并改进原料和流程，让树皮、麻头、破布、旧渔网等纤维材料更容易变成可推广的纸。'
  }
  if (/环保|再生|智能/.test(text)) {
    return '现代造纸强调节约用纸、回收纤维、减少污染；智能造纸会用传感器和自动控制让生产更稳定、更节能。'
  }

  return '这个问题可以回到造纸术学习里看：先找它对应的材料、工艺步骤或文化影响。我可以继续帮你解释某一个具体环节。'
}

function normalizeContextType(value: unknown): AgentContextType {
  return value === 'quiz' || value === 'video' || value === 'process' || value === 'general' ? value : 'general'
}
