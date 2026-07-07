import { processScenes } from '../../data/processScenes'
import { createInitialProcessSceneState } from '../../lib/processDemoEngine'
import type { ProcessScene, ProcessSceneId, ProcessSceneState } from './types'

export const rawMaterialItems = ['树皮', '麻头', '破布', '旧渔网']

export const finalKnowledgeCards = [
  { id: 'ancient', title: '古法匠心', detail: '从选料、蒸煮、打浆到抄纸，工艺环环相扣。' },
  { id: 'culture', title: '文明传播', detail: '纸让文字、教育和典籍传播得更远。' },
  { id: 'green', title: '环保革新', detail: '再生纸和污水净化让造纸更可持续。' },
  { id: 'smart', title: '智能制造', detail: '传感器和控制面板让纸张质量更稳定。' },
]

export type ProcessStepId = ProcessSceneId
export type ProcessStepState = ProcessSceneState
export type ProcessStepDefinition = ProcessScene

export const processSteps = processScenes

export function createInitialStepState(stepId: ProcessStepId, completed = false): ProcessStepState {
  const state = createInitialProcessSceneState(stepId)
  if (!completed) return state
  return {
    ...state,
    progress: 100,
    completed: true,
    completedAt: Date.now(),
    phase: '已完成',
  }
}
