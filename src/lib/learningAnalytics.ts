import type { KnowledgePoint, Question } from '../data/questions'
import { knowledgePointMeta, knowledgePoints } from '../data/questions'
import type { AnswerRecord, QuizState, ReviewRecommendation } from './adaptiveQuizEngine'
import { average, clamp, createEmptyRecord } from './utils'

export type LearnerProfile = {
  ability: number
  helpSeekingLevel: '低' | '中' | '高'
  slowKnowledgePoints: KnowledgePoint[]
  behaviorSummary: string[]
}

export type QuestionQualityInsight = {
  questionId: string
  attempts: number
  correctRate: number
  averageTimeMs: number
  optionDistribution: number[]
  flag: '可能偏难' | '可能偏易' | '表现稳定'
}

export type ClassAnalytics = {
  questionQuality: Record<string, QuestionQualityInsight>
  averageMasteryByKnowledgePoint: Record<KnowledgePoint, number>
  sampleSize: number
}

export function buildLearnerProfile(state: QuizState): LearnerProfile {
  const helpRatio = state.helpLimit === 0 ? 0 : state.helpUsed / state.helpLimit
  const helpSeekingLevel: LearnerProfile['helpSeekingLevel'] = helpRatio >= 0.7 ? '高' : helpRatio >= 0.35 ? '中' : '低'
  const slowKnowledgePoints = getSlowKnowledgePoints(state.records)
  const weakPoints = knowledgePoints.filter((point) => state.masteryByKnowledgePoint[point] < 0.45)
  const behaviorSummary: string[] = []

  if (weakPoints.length > 0) {
    behaviorSummary.push(
      `你答错的题更多集中在【${weakPoints.map((point) => knowledgePointMeta[point].label).join('、')}】，建议优先回看对应演示步骤。`,
    )
  }

  if (state.helpUsed > 0) {
    behaviorSummary.push(`你使用了 ${state.helpUsed} 次蔡伦帮助，说明遇到理解型题目时可以多回到流程图中找依据。`)
  }

  if (slowKnowledgePoints.length > 0) {
    behaviorSummary.push(
      `你在【${slowKnowledgePoints.map((point) => knowledgePointMeta[point].label).join('、')}】上耗时偏长，适合用流程复述法巩固。`,
    )
  }

  if (behaviorSummary.length === 0) {
    behaviorSummary.push('本轮表现比较均衡，可以尝试提高题目难度或向同学讲解造纸流程。')
  }

  return {
    ability: state.currentAbility,
    helpSeekingLevel,
    slowKnowledgePoints,
    behaviorSummary,
  }
}

export function getSlowKnowledgePoints(records: AnswerRecord[]) {
  const grouped = createEmptyRecord(knowledgePoints, () => [] as number[])
  for (const record of records) {
    for (const point of record.knowledgePoints) {
      grouped[point].push(record.timeSpentMs)
    }
  }

  return knowledgePoints.filter((point) => {
    const times = grouped[point]
    return times.length > 0 && average(times) > 42_000
  })
}

export function createReviewRecommendations(
  masteryByKnowledgePoint: Record<KnowledgePoint, number>,
): ReviewRecommendation[] {
  return knowledgePoints
    .map((point) => {
      const mastery = masteryByKnowledgePoint[point]
      const status: ReviewRecommendation['status'] =
        mastery < 0.45 ? '需要重点复习' : mastery <= 0.7 ? '建议巩固' : '掌握较好'
      const meta = knowledgePointMeta[point]

      return {
        knowledgePoint: point,
        label: meta.label,
        mastery,
        status,
        advice:
          mastery < 0.45
            ? `先回看互动演示第 ${meta.reviewStep ?? 1} 步，再做基础题。`
            : mastery <= 0.7
              ? '用自己的话复述概念，并做一道流程判断题。'
              : '保持节奏，可以挑战综合分析题。',
      }
    })
    .sort((left, right) => left.mastery - right.mastery)
}

export function generateMockClassAnalytics(questionBank: Question[], sampleSize = 320): ClassAnalytics {
  const questionStats = questionBank.reduce(
    (record, question) => {
      record[question.id] = {
        attempts: 0,
        correct: 0,
        totalTimeMs: 0,
        options: [0, 0, 0, 0],
      }
      return record
    },
    {} as Record<string, { attempts: number; correct: number; totalTimeMs: number; options: number[] }>,
  )
  for (let index = 0; index < sampleSize; index += 1) {
    const learnerAbility = 1.4 + seededNoise(index, 7) * 3.4
    const question = questionBank[Math.floor(seededNoise(index, 13) * questionBank.length)]
    const difficultyGap = question.difficulty - learnerAbility
    const correctProbability = clamp(0.72 - difficultyGap * 0.11 + seededNoise(index, 19) * 0.14 - 0.07, 0.18, 0.94)
    const correct = seededNoise(index, 23) < correctProbability
    const selectedIndex = correct
      ? question.answerIndex
      : Math.floor(seededNoise(index, 29) * question.options.length) % question.options.length
    const timeMs = 18_000 + question.difficulty * 6_500 + seededNoise(index, 31) * 28_000

    const stat = questionStats[question.id]
    stat.attempts += 1
    stat.correct += correct ? 1 : 0
    stat.totalTimeMs += timeMs
    stat.options[selectedIndex] += 1

  }

  const questionQuality = Object.fromEntries(
    Object.entries(questionStats).map(([questionId, stat]) => {
      const correctRate = stat.attempts ? stat.correct / stat.attempts : 0
      const averageTimeMs = stat.attempts ? stat.totalTimeMs / stat.attempts : 0
      const flag: QuestionQualityInsight['flag'] =
        stat.attempts > 4 && correctRate < 0.35
          ? '可能偏难'
          : stat.attempts > 4 && correctRate > 0.88
            ? '可能偏易'
            : '表现稳定'

      return [
        questionId,
        {
          questionId,
          attempts: stat.attempts,
          correctRate,
          averageTimeMs,
          optionDistribution: stat.options.map((count) => (stat.attempts ? count / stat.attempts : 0)),
          flag,
        },
      ]
    }),
  )

  return {
    questionQuality,
    averageMasteryByKnowledgePoint: createEmptyRecord(knowledgePoints, () => 0),
    sampleSize,
  }
}

export function attachKnowledgeAverages(analytics: ClassAnalytics, questionBank: Question[]): ClassAnalytics {
  const grouped = createEmptyRecord(knowledgePoints, () => [] as number[])
  for (const question of questionBank) {
    const quality = analytics.questionQuality[question.id]
    if (!quality) continue
    for (const point of question.knowledgePoints) {
      grouped[point].push(quality.correctRate)
    }
  }

  return {
    ...analytics,
    averageMasteryByKnowledgePoint: knowledgePoints.reduce(
      (record, point) => {
        record[point] = grouped[point].length ? average(grouped[point]) : 0.5
        return record
      },
      {} as Record<KnowledgePoint, number>,
    ),
  }
}

function seededNoise(seed: number, salt: number) {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}
