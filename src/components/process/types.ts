import type { processAssets } from '../../assets/process/processAssetMap'

export type ProcessSceneId =
  | 'history'
  | 'cai_lun'
  | 'preparation'
  | 'steaming'
  | 'pulping'
  | 'sheet_forming'
  | 'drying'
  | 'finishing'
  | 'future'
  | 'legacy'

export type ProcessKnowledgeTag =
  | 'origin_history'
  | 'cailun_innovation'
  | 'raw_materials'
  | 'preparation'
  | 'steaming'
  | 'pulping'
  | 'sheet_forming'
  | 'drying'
  | 'finishing'
  | 'environmental_papermaking'
  | 'smart_papermaking'
  | 'culture_impact'

export type ProcessSceneState = {
  sceneId: ProcessSceneId
  progress: number
  phase: string
  completed: boolean
  interactionCount: number
  startedAt?: number
  completedAt?: number
  selectedItems?: string[]
  orderedItems?: string[]
  unlockedCards?: string[]
  waterLevel?: number
  temperature?: number
  softness?: number
  purity?: number
  fiberDensity?: number
  pulpUniformity?: number
  screenLift?: number
  moisture?: number
  dryness?: number
  recycleProgress?: number
  smartControlScore?: number
  visualFlags?: Record<string, boolean>
  lastAction?: string
}

export type ProcessScene = {
  id: ProcessSceneId
  title: string
  stageTitle: string
  intro: string
  learningGoal: string
  description: string
  task: string
  knowledgeTags: ProcessKnowledgeTag[]
  completionText: string
}

export type ProcessVisualProps = {
  scene: ProcessScene
  state: ProcessSceneState
  assets: typeof processAssets
  onAction?: (action: string, payload?: unknown) => void
}

export type ProcessActionLog = {
  action: string
  payload?: unknown
  timestamp: number
  progressAfterAction: number
}

export type ProcessInteractionRecord = {
  id: string
  sceneId: ProcessSceneId
  sceneTitle: string
  knowledgeTagIds: ProcessKnowledgeTag[]
  startedAt: number
  completedAt: number
  timeSpentMs: number
  interactionCount: number
  completed: boolean
  finalProgress: number
  actions: ProcessActionLog[]
}
