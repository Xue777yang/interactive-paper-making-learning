import { prisma } from '../db.js'
import { average, safeJsonParse } from '../utils.js'
import {
  buildTimelineHeatmap,
  calculateCompletionRate,
  calculateEffectiveWatchTime,
  calculateMarkerWatchStats,
  calculateReplayHotspots,
  calculateSkippedHotspots,
  calculateTotalWatchTime,
  mergeWatchedIntervals,
} from './videoAnalytics.js'

const PROCESS_STEP_COUNT = 10

export async function buildTeacherDashboard() {
  const [students, questionAnalytics, knowledgeAnalytics, videoAnalytics, agentAnalytics] = await Promise.all([
    buildStudentRows(),
    buildQuestionAnalytics(),
    buildKnowledgeAnalytics(),
    buildVideoAnalytics(),
    buildAgentAnalytics(),
  ])

  const completedQuizStudents = students.filter((student) => student.quizCompleted).length
  const overview = {
    studentCount: students.length,
    completedQuizStudents,
    averageCorrectRate: average(students.map((student) => student.correctRate)),
    averageVideoCompletionRate: average(students.map((student) => student.videoCompletionRate)),
    averageProcessCompletionRate: average(students.map((student) => student.processCompletionRate)),
    averageAgentQuestions: average(students.map((student) => student.agentQuestionCount)),
  }

  return {
    overview,
    knowledgeMastery: knowledgeAnalytics,
    questionQuality: questionAnalytics.slice(0, 12),
    video: videoAnalytics,
    agent: agentAnalytics,
    students,
    recommendations: buildClassRecommendations(knowledgeAnalytics, videoAnalytics.markerStats, questionAnalytics),
  }
}

export async function buildStudentRows() {
  const students = await prisma.user.findMany({
    where: { role: 'student' },
    include: {
      answerRecords: {
        include: {
          question: {
            include: { tags: { include: { knowledgeTag: true } } },
          },
        },
      },
      agentMessages: true,
      videoEvents: true,
      processEvents: true,
    },
    orderBy: { displayName: 'asc' },
  })
  const videos = await prisma.videoResource.findMany({ where: { active: true } })

  return students.map((student) => {
    const answerRecords = student.answerRecords
    const correctRate = answerRecords.length
      ? answerRecords.filter((record) => record.correct).length / answerRecords.length
      : 0
    const videoCompletionRate = videos.length
      ? average(
          videos.map((video) => {
            const events = student.videoEvents.filter((event) => event.videoId === video.id)
            return calculateCompletionRate(video.duration, mergeWatchedIntervals(events))
          }),
        )
      : 0
    const completedSteps = new Set(student.processEvents.filter((event) => event.completed).map((event) => event.stepId))
    const processCompletionRate = completedSteps.size / PROCESS_STEP_COUNT
    const weakKnowledgePoints = getWeakKnowledgePoints(answerRecords)
    const lastLearningTime = getLastLearningTime([
      ...answerRecords.map((record) => record.createdAt),
      ...student.videoEvents.map((event) => event.createdAt),
      ...student.agentMessages.map((message) => message.createdAt),
      ...student.processEvents.map((event) => event.createdAt),
    ])

    return {
      id: student.id,
      username: student.username,
      displayName: student.displayName,
      correctRate,
      videoCompletionRate,
      processCompletionRate,
      weakKnowledgePoints,
      agentQuestionCount: student.agentMessages.filter((message) => message.role === 'user').length,
      lastLearningTime,
      quizCompleted: answerRecords.length >= 20,
    }
  })
}

export async function buildStudentDetail(studentId: string) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      answerRecords: {
        include: {
          question: {
            include: { tags: { include: { knowledgeTag: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      videoEvents: {
        include: { video: true },
        orderBy: { createdAt: 'asc' },
      },
      processEvents: {
        orderBy: { createdAt: 'asc' },
      },
      agentConversations: {
        include: {
          messages: {
            include: { emotionAnalysis: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  if (!student) return null

  const videos = await prisma.videoResource.findMany({
    where: { active: true },
    include: { markers: { include: { knowledgeTag: true }, orderBy: { startTime: 'asc' } } },
  })

  const videoSummaries = videos.map((video) => {
    const events = student.videoEvents.filter((event) => event.videoId === video.id)
    const intervals = mergeWatchedIntervals(events)
    return {
      videoId: video.id,
      title: video.title,
      totalWatchTimeMs: calculateTotalWatchTime(events),
      effectiveWatchTimeMs: calculateEffectiveWatchTime(events),
      completionRate: calculateCompletionRate(video.duration, intervals),
      replaySegments: calculateReplayHotspots(events).slice(0, 5),
      markerStats: calculateMarkerWatchStats(video.markers, intervals, events),
    }
  })

  const answerRecords = student.answerRecords.map((record) => ({
    id: record.id,
    questionId: record.questionId,
    stem: record.question.stem,
    correct: record.correct,
    selectedIndex: record.selectedIndex,
    answerIndex: record.question.answerIndex,
    timeSpentMs: record.timeSpentMs,
    usedAgentHelp: record.usedAgentHelp,
    difficulty: record.difficulty,
    knowledgeTags: record.question.tags.map((tag) => tag.knowledgeTag),
    createdAt: record.createdAt,
  }))
  const knowledgeMastery = summarizeKnowledgeFromAnswers(student.answerRecords)
  const emotions = student.agentConversations.flatMap((conversation) =>
    conversation.messages.flatMap((message) => (message.emotionAnalysis ? [message.emotionAnalysis] : [])),
  )

  return {
    id: student.id,
    username: student.username,
    displayName: student.displayName,
    answerRecords,
    knowledgeMastery,
    videoSummaries,
    processCompletionRate: new Set(student.processEvents.filter((event) => event.completed).map((event) => event.stepId)).size / PROCESS_STEP_COUNT,
    conversations: student.agentConversations.map((conversation) => ({
      id: conversation.id,
      contextType: conversation.contextType,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
        emotion: message.emotionAnalysis,
      })),
    })),
    emotionTrend: emotions.map((emotion) => ({
      emotionLabel: emotion.emotionLabel,
      valence: emotion.valence,
      arousal: emotion.arousal,
      riskLevel: emotion.riskLevel,
      createdAt: emotion.createdAt,
    })),
    teachingAdvice: buildStudentAdvice(student.displayName, knowledgeMastery, videoSummaries, emotions),
  }
}

export async function buildStudentReport(studentId: string) {
  const detail = await buildStudentDetail(studentId)
  if (!detail) return null
  const latestEmotion = detail.emotionTrend.at(-1)
  const weakest = [...detail.knowledgeMastery].sort((left, right) => left.mastery - right.mastery).slice(0, 3)
  const video = detail.videoSummaries[0]

  return {
    student: {
      id: detail.id,
      username: detail.username,
      displayName: detail.displayName,
    },
    correctRate: detail.answerRecords.length
      ? detail.answerRecords.filter((record) => record.correct).length / detail.answerRecords.length
      : 0,
    videoCompletionRate: video?.completionRate ?? 0,
    repeatedSegments: video?.replaySegments ?? [],
    weakKnowledgePoints: weakest,
    agentQuestionCount: detail.conversations.reduce(
      (sum, conversation) => sum + conversation.messages.filter((message) => message.role === 'user').length,
      0,
    ),
    latestLearningState: latestEmotion ?? null,
    processCompletionRate: detail.processCompletionRate,
    reviewPlan: weakest.map((item) => ({
      label: item.name,
      advice:
        item.mastery < 0.45
          ? `优先回看【${item.name}】对应视频片段，再完成一道基础题。`
          : `用自己的话复述【${item.name}】的关键步骤，并完成一题迁移练习。`,
    })),
  }
}

export async function buildQuestionAnalytics() {
  const questions = await prisma.question.findMany({
    include: {
      tags: { include: { knowledgeTag: true } },
      answerRecords: true,
    },
    orderBy: [{ active: 'desc' }, { difficulty: 'asc' }],
  })

  return questions.map((question) => {
    const attempts = question.answerRecords.length
    const correctCount = question.answerRecords.filter((record) => record.correct).length
    const optionDistribution = [0, 0, 0, 0]
    for (const record of question.answerRecords) {
      if (record.selectedIndex >= 0 && record.selectedIndex < 4) optionDistribution[record.selectedIndex] += 1
    }
    const correctRate = attempts ? correctCount / attempts : 0
    const averageTimeMs = average(question.answerRecords.map((record) => record.timeSpentMs))
    return {
      id: question.id,
      stem: question.stem,
      difficulty: question.difficulty,
      active: question.active,
      attempts,
      correctRate,
      averageTimeMs,
      optionDistribution,
      flag:
        attempts >= 3 && correctRate < 0.35
          ? '可能过难'
          : attempts >= 3 && correctRate > 0.9
            ? '可能过简单'
            : '表现稳定',
      knowledgeTags: question.tags.map((tag) => tag.knowledgeTag),
    }
  })
}

export async function buildKnowledgeAnalytics() {
  const tags = await prisma.knowledgeTag.findMany({
    include: {
      questionTags: {
        include: {
          question: {
            include: { answerRecords: true },
          },
        },
      },
      videoMarkers: true,
    },
    orderBy: { orderIndex: 'asc' },
  })

  return tags.map((tag) => {
    const records = tag.questionTags.flatMap((questionTag) => questionTag.question.answerRecords)
    const attempts = records.length
    const correctRate = attempts ? records.filter((record) => record.correct).length / attempts : 0.5
    return {
      id: tag.id,
      code: tag.code,
      name: tag.name,
      color: tag.color,
      active: tag.active,
      mastery: correctRate,
      attempts,
      relatedQuestionCount: tag.questionTags.length,
      relatedVideoMarkerCount: tag.videoMarkers.length,
      weak: attempts > 0 && correctRate < 0.55,
    }
  })
}

export async function buildVideoAnalytics(videoId?: string, studentId?: string) {
  const video =
    (videoId
      ? await prisma.videoResource.findUnique({
          where: { id: videoId },
          include: { markers: { include: { knowledgeTag: true }, orderBy: { startTime: 'asc' } } },
        })
      : await prisma.videoResource.findFirst({
          where: { active: true },
          include: { markers: { include: { knowledgeTag: true }, orderBy: { startTime: 'asc' } } },
          orderBy: { createdAt: 'asc' },
        })) ?? null

  if (!video) {
    return {
      video: null,
      completionRate: 0,
      averageWatchTimeMs: 0,
      effectiveWatchTimeMs: 0,
      heatmap: [],
      replayHotspots: [],
      skippedHotspots: [],
      markerStats: [],
      studentSummaries: [],
      performanceLinks: [],
    }
  }

  const events = await prisma.videoEvent.findMany({
    where: { videoId: video.id, ...(studentId ? { userId: studentId } : {}) },
    orderBy: { createdAt: 'asc' },
  })
  const intervals = mergeWatchedIntervals(events)
  const completionRate = calculateCompletionRate(video.duration, intervals)
  const markerStats = calculateMarkerWatchStats(video.markers, intervals, events)
  const studentSummaries = await buildVideoStudentSummaries(video.id, video.duration)

  return {
    video: {
      id: video.id,
      title: video.title,
      description: video.description,
      src: video.src,
      poster: video.poster,
      duration: video.duration,
      markers: video.markers,
    },
    completionRate,
    averageWatchTimeMs: average(studentSummaries.map((summary) => summary.totalWatchTimeMs)),
    effectiveWatchTimeMs: calculateEffectiveWatchTime(events),
    heatmap: buildTimelineHeatmap(events, video.duration),
    replayHotspots: calculateReplayHotspots(events).slice(0, 8),
    skippedHotspots: calculateSkippedHotspots(events, video.markers).slice(0, 8),
    markerStats,
    studentSummaries,
    performanceLinks: await buildVideoAnswerLinks(video.markers),
  }
}

export async function buildAgentAnalytics() {
  const [messages, emotions, conversations, students] = await Promise.all([
    prisma.agentMessage.findMany({
      where: { role: 'user' },
      include: { user: true, emotionAnalysis: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.emotionAnalysis.findMany({ include: { user: true }, orderBy: { createdAt: 'asc' } }),
    prisma.agentConversation.findMany({
      include: { user: true, messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
    prisma.user.findMany({ where: { role: 'student' } }),
  ])

  const distribution = emotions.reduce<Record<string, number>>((record, emotion) => {
    record[emotion.emotionLabel] = (record[emotion.emotionLabel] ?? 0) + 1
    return record
  }, {})
  const keywords = extractKeywords(messages.map((message) => message.content))
  const studentAttention = students
    .map((student) => {
      const studentEmotions = emotions.filter((emotion) => emotion.userId === student.id)
      const attentionCount = studentEmotions.filter(
        (emotion) => emotion.riskLevel === 'medium' || emotion.emotionLabel === 'frustrated' || emotion.emotionLabel === 'anxious',
      ).length
      return {
        id: student.id,
        displayName: student.displayName,
        attentionCount,
        latestState: studentEmotions.at(-1)?.emotionLabel ?? 'neutral',
      }
    })
    .filter((student) => student.attentionCount > 0)
    .sort((left, right) => right.attentionCount - left.attentionCount)

  return {
    totalConversations: conversations.length,
    totalUserMessages: messages.length,
    averageQuestionsPerStudent: students.length ? messages.length / students.length : 0,
    keywords,
    emotionDistribution: distribution,
    emotionTrend: emotions.map((emotion) => ({
      emotionLabel: emotion.emotionLabel,
      valence: emotion.valence,
      arousal: emotion.arousal,
      riskLevel: emotion.riskLevel,
      summary: emotion.summary,
      studentName: emotion.user.displayName,
      createdAt: emotion.createdAt,
    })),
    studentAttention,
    conversations: conversations.map((conversation) => ({
      id: conversation.id,
      studentName: conversation.user.displayName,
      contextType: conversation.contextType,
      updatedAt: conversation.updatedAt,
      messageCount: conversation.messages.length,
      lastMessage: conversation.messages.at(-1)?.content ?? '',
    })),
  }
}

async function buildVideoStudentSummaries(videoId: string, duration: number) {
  const students = await prisma.user.findMany({
    where: { role: 'student' },
    include: { videoEvents: { where: { videoId }, orderBy: { createdAt: 'asc' } } },
    orderBy: { displayName: 'asc' },
  })

  return students.map((student) => {
    const intervals = mergeWatchedIntervals(student.videoEvents)
    return {
      studentId: student.id,
      displayName: student.displayName,
      totalWatchTimeMs: calculateTotalWatchTime(student.videoEvents),
      effectiveWatchTimeMs: calculateEffectiveWatchTime(student.videoEvents),
      completionRate: calculateCompletionRate(duration, intervals),
      lastPosition: student.videoEvents.at(-1)?.videoTime ?? 0,
    }
  })
}

async function buildVideoAnswerLinks(markers: Array<{ knowledgeTagId: string; label: string }>) {
  const rows = []
  for (const marker of markers) {
    const answers = await prisma.answerRecord.findMany({
      where: {
        question: {
          tags: {
            some: { knowledgeTagId: marker.knowledgeTagId },
          },
        },
      },
    })
    rows.push({
      markerLabel: marker.label,
      answerCount: answers.length,
      correctRate: answers.length ? answers.filter((answer) => answer.correct).length / answers.length : 0,
      note:
        answers.length && answers.filter((answer) => answer.correct).length / answers.length < 0.6
          ? `反复观看【${marker.label}】的同时相关题正确率偏低，建议课堂补充操作演示。`
          : `【${marker.label}】相关答题表现相对稳定。`,
    })
  }
  return rows
}

function summarizeKnowledgeFromAnswers(
  answerRecords: Array<{
    correct: boolean
    question: { tags: Array<{ knowledgeTag: { id: string; code: string; name: string; color: string } }> }
  }>,
) {
  const grouped = new Map<string, { id: string; code: string; name: string; color: string; attempts: number; correct: number }>()
  for (const record of answerRecords) {
    for (const questionTag of record.question.tags) {
      const tag = questionTag.knowledgeTag
      const current = grouped.get(tag.id) ?? {
        id: tag.id,
        code: tag.code,
        name: tag.name,
        color: tag.color,
        attempts: 0,
        correct: 0,
      }
      current.attempts += 1
      current.correct += record.correct ? 1 : 0
      grouped.set(tag.id, current)
    }
  }

  return [...grouped.values()].map((item) => ({
    ...item,
    mastery: item.attempts ? item.correct / item.attempts : 0,
  }))
}

function getWeakKnowledgePoints(
  answerRecords: Array<{
    correct: boolean
    question: { tags: Array<{ knowledgeTag: { id: string; code: string; name: string; color: string } }> }
  }>,
) {
  return summarizeKnowledgeFromAnswers(answerRecords)
    .filter((item) => item.attempts >= 1)
    .sort((left, right) => left.mastery - right.mastery)
    .slice(0, 3)
}

function getLastLearningTime(values: Date[]) {
  const timestamp = Math.max(0, ...values.map((value) => value.getTime()))
  return timestamp ? new Date(timestamp).toISOString() : null
}

function buildClassRecommendations(
  knowledgeAnalytics: Array<{ name: string; mastery: number; attempts: number }>,
  markerStats: Array<{ label: string; replayCount: number }>,
  questionAnalytics: Array<{ stem: string; correctRate: number; averageTimeMs: number; knowledgeTags: Array<{ name: string }> }>,
) {
  const weak = [...knowledgeAnalytics].filter((item) => item.attempts > 0).sort((left, right) => left.mastery - right.mastery)[0]
  const replay = [...markerStats].sort((left, right) => right.replayCount - left.replayCount)[0]
  const slow = [...questionAnalytics].sort((left, right) => right.averageTimeMs - left.averageTimeMs)[0]
  const recommendations: string[] = []

  if (weak) {
    recommendations.push(`班级在【${weak.name}】知识点上的掌握度偏低，建议补充流程排序或实物演示。`)
  }
  if (replay && replay.replayCount > 0) {
    recommendations.push(`视频中【${replay.label}】被反复回看较多，可在课堂中增加该片段的操作讲解。`)
  }
  if (slow) {
    const tag = slow.knowledgeTags[0]?.name ?? '相关'
    recommendations.push(`【${tag}】相关题目平均耗时较长，说明学生可能需要更多概念连接和例题。`)
  }

  return recommendations
}

function buildStudentAdvice(
  displayName: string,
  knowledgeMastery: Array<{ name: string; mastery: number; attempts: number }>,
  videoSummaries: Array<{ markerStats: Array<{ label: string; replayCount: number; coverageRate: number }> }>,
  emotions: Array<{ emotionLabel: string; riskLevel: string }>,
) {
  const weakest = [...knowledgeMastery].filter((item) => item.attempts > 0).sort((left, right) => left.mastery - right.mastery)[0]
  const replayMarker = videoSummaries.flatMap((summary) => summary.markerStats).sort((left, right) => right.replayCount - left.replayCount)[0]
  const attention = emotions.filter((emotion) => emotion.riskLevel !== 'none').length
  const advice: string[] = []

  if (weakest) {
    advice.push(`${displayName} 在【${weakest.name}】相关题目上正确率偏低，建议安排一组低难度巩固题。`)
  }
  if (replayMarker && replayMarker.replayCount > 0) {
    advice.push(`${displayName} 反复观看【${replayMarker.label}】片段，建议课堂中补充该步骤的可视化演示。`)
  }
  if (attention > 0) {
    advice.push(`${displayName} 的小助手提问出现需要关注的学习状态信号，建议用鼓励式追问确认卡点。`)
  }

  return advice.length ? advice : [`${displayName} 当前学习数据较平稳，可引导其尝试讲解造纸流程。`]
}

function extractKeywords(texts: string[]) {
  const vocabulary = [
    '蔡伦',
    '原料',
    '树皮',
    '麻头',
    '蒸煮',
    '打浆',
    '纸浆',
    '抄纸',
    '竹帘',
    '晒纸',
    '环保',
    '智能造纸',
    '传播',
    '印刷',
    '为什么',
    '不会',
    '看不懂',
  ]
  const counts = vocabulary
    .map((keyword) => ({
      keyword,
      count: texts.reduce((sum, text) => sum + (text.includes(keyword) ? 1 : 0), 0),
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)

  return counts.slice(0, 12)
}

export function parseMetadata<T>(value: string | null | undefined, fallback: T) {
  return safeJsonParse(value, fallback)
}
