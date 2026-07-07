import type { LearningReport, QuizState } from './adaptiveQuizEngine'
import { apiFetch } from './apiClient'
import { getStoredUser } from './authClient'

export type ProcessInteractionRecord = {
  type: 'step_completed'
  stepId: string
  progress?: number
  completed?: boolean
  phase?: string
  knowledgePoints: string[]
  timeSpent: number
  interactionCount: number
  completedAt: string
}

const STORAGE_KEYS = {
  quizState: 'papermaking_quiz_session',
  currentQuestionId: 'papermaking_current_question',
  lastReport: 'papermaking_last_report',
  processRecords: 'papermaking_process_records',
  processDemoState: 'papermaking_process_demo_state',
} as const

export const PROCESS_DEMO_STORAGE_KEY = STORAGE_KEYS.processDemoState

export function loadQuizState() {
  return loadJson<QuizState>(userScopedKey(STORAGE_KEYS.quizState))
}

export function saveQuizState(state: QuizState) {
  saveJson(userScopedKey(STORAGE_KEYS.quizState), state)
}

export function clearQuizSession() {
  window.localStorage.removeItem(userScopedKey(STORAGE_KEYS.quizState))
  window.localStorage.removeItem(userScopedKey(STORAGE_KEYS.currentQuestionId))
}

export function loadCurrentQuestionId() {
  return window.localStorage.getItem(userScopedKey(STORAGE_KEYS.currentQuestionId))
}

export function saveCurrentQuestionId(questionId: string) {
  window.localStorage.setItem(userScopedKey(STORAGE_KEYS.currentQuestionId), questionId)
}

export function loadLastReport() {
  return loadJson<LearningReport>(userScopedKey(STORAGE_KEYS.lastReport))
}

export function saveLastReport(report: LearningReport) {
  saveJson(userScopedKey(STORAGE_KEYS.lastReport), report)
}

export function loadProcessRecords() {
  return loadJson<ProcessInteractionRecord[]>(userScopedKey(STORAGE_KEYS.processRecords)) ?? []
}

export function appendProcessRecord(record: ProcessInteractionRecord) {
  saveJson(userScopedKey(STORAGE_KEYS.processRecords), [...loadProcessRecords(), record])
}

export async function syncProcessRecord(record: ProcessInteractionRecord) {
  await apiFetch('/process-events', {
    method: 'POST',
    body: JSON.stringify(record),
  }).catch(() => undefined)
}

export function clearProcessDemoStorage() {
  window.localStorage.removeItem(userScopedKey(STORAGE_KEYS.processDemoState))
}

function userScopedKey(baseKey: string) {
  const userId = getStoredUser()?.id
  return `${baseKey}_${userId ?? 'anonymous'}`
}

function loadJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function saveJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value))
}
