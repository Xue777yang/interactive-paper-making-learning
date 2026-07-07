import { apiFetch } from './apiClient'
import { getStoredUser } from './authClient'
import type { ProcessInteractionRecord, ProcessSceneId } from '../components/process/types'

export const PROCESS_DEMO_STORAGE_KEY = 'papermaking_process_demo_state'
export const PROCESS_INTERACTION_RECORDS_KEY = 'papermaking_process_records'

export function clearProcessDemoStorage() {
  window.localStorage.removeItem(userScopedKey(PROCESS_DEMO_STORAGE_KEY))
}

export function resetProcessDemoState() {
  clearProcessDemoStorage()
}

export function loadProcessInteractionRecords() {
  try {
    const raw = window.localStorage.getItem(userScopedKey(PROCESS_INTERACTION_RECORDS_KEY))
    return raw ? (JSON.parse(raw) as ProcessInteractionRecord[]) : []
  } catch {
    return []
  }
}

export function recordProcessInteraction(record: ProcessInteractionRecord) {
  try {
    const records = [...loadProcessInteractionRecords(), record]
    window.localStorage.setItem(userScopedKey(PROCESS_INTERACTION_RECORDS_KEY), JSON.stringify(records))
    void syncProcessInteractionRecord(record)
  } catch {
    void syncProcessInteractionRecord(record)
  }
}

function userScopedKey(baseKey: string) {
  const userId = getStoredUser()?.id
  return `${baseKey}_${userId ?? 'anonymous'}`
}

export function makeProcessRecordId(sceneId: ProcessSceneId) {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  return `${sceneId}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
}

async function syncProcessInteractionRecord(record: ProcessInteractionRecord) {
  await apiFetch('/process-events', {
    method: 'POST',
    body: JSON.stringify({
      type: 'scene_completed',
      stepId: record.sceneId,
      progress: record.finalProgress,
      completed: record.completed,
      knowledgePoints: record.knowledgeTagIds,
      timeSpent: record.timeSpentMs,
      interactionCount: record.interactionCount,
      completedAt: new Date(record.completedAt).toISOString(),
      phase: record.sceneTitle,
      actions: record.actions,
    }),
  }).catch(() => undefined)
}
