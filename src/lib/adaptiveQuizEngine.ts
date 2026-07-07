import type { KnowledgePoint, Question } from '../data/questions'
import { knowledgePointMeta, knowledgePoints } from '../data/questions'
import { average, clamp, createEmptyRecord, overlaps } from './utils'

export type AnswerRecord = {
  questionId: string
  selectedIndex: number
  correct: boolean
  timeSpentMs: number
  usedAgentHelp: boolean
  knowledgePoints: KnowledgePoint[]
  difficulty: number
}

export type QuizState = {
  answeredQuestionIds: string[]
  records: AnswerRecord[]
  currentAbility: number
  masteryByKnowledgePoint: Record<KnowledgePoint, number>
  answeredCountByKnowledgePoint: Record<KnowledgePoint, number>
  helpUsed: number
  helpLimit: number
  totalQuestions: 20
}

export type ReviewRecommendation = {
  knowledgePoint: KnowledgePoint
  label: string
  mastery: number
  status: '需要重点复习' | '建议巩固' | '掌握较好'
  advice: string
}

export type LearningReport = {
  correctRate: number
  averageTime: number
  weakestKnowledgePoints: KnowledgePoint[]
  strongestKnowledgePoints: KnowledgePoint[]
  helpUsed: number
  recommendedReviewPlan: ReviewRecommendation[]
  records: AnswerRecord[]
  masteryByKnowledgePoint: Record<KnowledgePoint, number>
  currentAbility: number
}

const DIAGNOSTIC_POINTS: KnowledgePoint[] = [
  'origin_history',
  'raw_materials',
  'pulping',
  'sheet_forming',
  'spread_and_impact',
]

const ADJACENT_POINTS: Record<KnowledgePoint, KnowledgePoint[]> = {
  origin_history: ['cailun_innovation', 'spread_and_impact'],
  cailun_innovation: ['origin_history', 'raw_materials'],
  raw_materials: ['soaking_cooking', 'pulping', 'modern_environment'],
  soaking_cooking: ['raw_materials', 'pulping'],
  pulping: ['soaking_cooking', 'sheet_forming'],
  sheet_forming: ['pulping', 'pressing_drying'],
  pressing_drying: ['sheet_forming', 'printing_and_culture'],
  spread_and_impact: ['printing_and_culture', 'origin_history', 'modern_environment'],
  printing_and_culture: ['spread_and_impact', 'pressing_drying'],
  modern_environment: ['raw_materials', 'spread_and_impact'],
}

export function createInitialQuizState(): QuizState {
  return {
    answeredQuestionIds: [],
    records: [],
    currentAbility: 3,
    masteryByKnowledgePoint: createEmptyRecord(knowledgePoints, () => 0.5),
    answeredCountByKnowledgePoint: createEmptyRecord(knowledgePoints, () => 0),
    helpUsed: 0,
    helpLimit: 5,
    totalQuestions: 20,
  }
}

export function incrementHelpUsed(state: QuizState): QuizState {
  if (state.helpUsed >= state.helpLimit) return state
  return { ...state, helpUsed: state.helpUsed + 1 }
}

export function updateQuizStateAfterAnswer(
  state: QuizState,
  question: Question,
  answerRecord: AnswerRecord,
): QuizState {
  const correct = answerRecord.correct
  const timePenalty = answerRecord.timeSpentMs > 60_000 ? 0.55 : answerRecord.timeSpentMs > 40_000 ? 0.75 : 1
  const helpPenalty = answerRecord.usedAgentHelp ? 0.5 : 1
  const difficulty = question.difficulty
  const masteryByKnowledgePoint = { ...state.masteryByKnowledgePoint }
  const answeredCountByKnowledgePoint = { ...state.answeredCountByKnowledgePoint }

  for (const point of question.knowledgePoints) {
    answeredCountByKnowledgePoint[point] += 1
    const current = masteryByKnowledgePoint[point]
    const delta = correct
      ? (0.07 + difficulty * 0.025) * timePenalty * helpPenalty
      : -(0.08 + (6 - difficulty) * 0.025)

    masteryByKnowledgePoint[point] = clamp(current + delta, 0, 1)
  }

  const abilityDelta = correct
    ? (0.12 + Math.max(0, difficulty - state.currentAbility) * 0.06) * timePenalty * helpPenalty
    : -(0.14 + Math.max(0, state.currentAbility - difficulty) * 0.07)

  return {
    ...state,
    answeredQuestionIds: [...state.answeredQuestionIds, question.id],
    records: [...state.records, answerRecord],
    currentAbility: clamp(state.currentAbility + abilityDelta, 1, 5),
    masteryByKnowledgePoint,
    answeredCountByKnowledgePoint,
  }
}

export function selectNextQuestion(questionBank: Question[], state: QuizState): Question {
  const candidates = questionBank.filter((question) => !state.answeredQuestionIds.includes(question.id))
  if (candidates.length === 0) {
    throw new Error('题库中已经没有可选题目')
  }

  const answeredCount = state.answeredQuestionIds.length
  const lastRecord = state.records.at(-1)
  const recentPrimaryPoints = state.records.slice(-2).map((record) => record.knowledgePoints[0])

  if (answeredCount < 5) {
    const targetPoint = DIAGNOSTIC_POINTS.find((point) => state.answeredCountByKnowledgePoint[point] === 0)
    const diagnosticCandidates = candidates.filter((question) => {
      const matchesTarget = targetPoint ? question.knowledgePoints.includes(targetPoint) : true
      const steadyDifficulty = question.difficulty >= 2 && question.difficulty <= 3
      return matchesTarget && steadyDifficulty
    })

    if (diagnosticCandidates.length > 0) {
      return pickHighestScoredQuestion(diagnosticCandidates, state, lastRecord, recentPrimaryPoints, true)
    }
  }

  return pickHighestScoredQuestion(candidates, state, lastRecord, recentPrimaryPoints, answeredCount >= 15)
}

function pickHighestScoredQuestion(
  candidates: Question[],
  state: QuizState,
  lastRecord: AnswerRecord | undefined,
  recentPrimaryPoints: KnowledgePoint[],
  finalCoverageMode: boolean,
) {
  const scored = candidates.map((question) => {
    const weaknessScore = average(question.knowledgePoints.map((point) => 1 - state.masteryByKnowledgePoint[point]))
    const coverageScore = average(
      question.knowledgePoints.map((point) => 1 / (1 + state.answeredCountByKnowledgePoint[point])),
    )
    const difficultyFitScore = 1 - Math.min(1, Math.abs(question.difficulty - state.currentAbility) / 4)
    const remediationScore = getRemediationScore(question, lastRecord)
    const repeatedPointPenalty = recentPrimaryPoints.every((point) => point === question.knowledgePoints[0]) ? -0.2 : 0
    const finalCoverageBonus = finalCoverageMode
      ? average(question.knowledgePoints.map((point) => (state.answeredCountByKnowledgePoint[point] === 0 ? 1 : 0))) *
        0.18
      : 0
    const randomJitter = Math.random()

    const score =
      0.35 * weaknessScore +
      0.25 * coverageScore +
      0.2 * difficultyFitScore +
      0.15 * remediationScore +
      0.05 * randomJitter +
      repeatedPointPenalty +
      finalCoverageBonus

    return { question, score }
  })

  scored.sort((left, right) => right.score - left.score)
  return scored[0].question
}

function getRemediationScore(question: Question, lastRecord?: AnswerRecord) {
  if (!lastRecord || lastRecord.correct) return 0
  if (overlaps(question.knowledgePoints, lastRecord.knowledgePoints)) return 1
  const adjacent = lastRecord.knowledgePoints.flatMap((point) => ADJACENT_POINTS[point])
  return overlaps(question.knowledgePoints, adjacent) ? 0.65 : 0
}

export function isQuizFinished(state: QuizState) {
  return state.answeredQuestionIds.length >= state.totalQuestions
}

export function generateLearningReport(state: QuizState): LearningReport {
  const correctCount = state.records.filter((record) => record.correct).length
  const averageTime = average(state.records.map((record) => record.timeSpentMs))
  const sortedByMastery = [...knowledgePoints].sort(
    (left, right) => state.masteryByKnowledgePoint[left] - state.masteryByKnowledgePoint[right],
  )

  return {
    correctRate: state.records.length ? correctCount / state.records.length : 0,
    averageTime,
    weakestKnowledgePoints: sortedByMastery.slice(0, 3),
    strongestKnowledgePoints: sortedByMastery.slice(-3).reverse(),
    helpUsed: state.helpUsed,
    recommendedReviewPlan: buildReviewPlan(state.masteryByKnowledgePoint),
    records: state.records,
    masteryByKnowledgePoint: state.masteryByKnowledgePoint,
    currentAbility: state.currentAbility,
  }
}

function buildReviewPlan(masteryByKnowledgePoint: Record<KnowledgePoint, number>) {
  return [...knowledgePoints]
    .map((point) => {
      const mastery = masteryByKnowledgePoint[point]
      const meta = knowledgePointMeta[point]
      const status: ReviewRecommendation['status'] =
        mastery < 0.45 ? '需要重点复习' : mastery <= 0.7 ? '建议巩固' : '掌握较好'

      return {
        knowledgePoint: point,
        label: meta.label,
        mastery,
        status,
        advice:
          status === '需要重点复习'
            ? `回看互动演示第 ${meta.reviewStep ?? 1} 步，并优先做同知识点补救题。`
            : status === '建议巩固'
              ? '再做 2-3 道理解或流程判断题，确认概念能迁移使用。'
              : '可以尝试向同学讲解这一环节，巩固表达能力。',
      }
    })
    .sort((left, right) => {
      const statusWeight = { 需要重点复习: 0, 建议巩固: 1, 掌握较好: 2 }
      return statusWeight[left.status] - statusWeight[right.status] || left.mastery - right.mastery
    })
}
