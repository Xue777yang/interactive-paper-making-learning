import { processScenes } from '../data/processScenes'
import type { ProcessActionLog, ProcessSceneId, ProcessSceneState } from '../components/process/types'
import { clamp } from './utils'

export type ProcessSceneStateMap = Record<ProcessSceneId, ProcessSceneState>

const correctHistoryOrder = ['甲骨', '竹简', '帛书', '纸']
const correctCaiLunMaterials = ['树皮', '麻头', '破布', '旧渔网']
const finishingOrder = ['备料', '蒸煮', '打浆', '抄纸', '晒纸']
const legacyCards = ['古法匠心', '文明传播', '环保革新', '智能制造']

export function createInitialProcessSceneStates(now = Date.now()): ProcessSceneStateMap {
  return processScenes.reduce((record, scene) => {
    record[scene.id] = createInitialProcessSceneState(scene.id, now)
    return record
  }, {} as ProcessSceneStateMap)
}

export function createInitialProcessSceneState(sceneId: ProcessSceneId, now = Date.now()): ProcessSceneState {
  return {
    sceneId,
    progress: 0,
    phase: '等待开始',
    completed: false,
    interactionCount: 0,
    startedAt: now,
    selectedItems: [],
    orderedItems: [],
    unlockedCards: [],
    waterLevel: 0,
    temperature: 0,
    softness: 0,
    purity: 0,
    fiberDensity: 0,
    pulpUniformity: 0,
    screenLift: 0,
    moisture: 100,
    dryness: 0,
    recycleProgress: 0,
    smartControlScore: 0,
    visualFlags: {},
    lastAction: '',
  }
}

export function resetProcessDemoState() {
  return createInitialProcessSceneStates()
}

export function updateProcessSceneStateAfterAction(
  state: ProcessSceneState,
  action: string,
  payload?: unknown,
): ProcessSceneState {
  const next = reduceSceneState(state, action, payload)
  if (next === state) return state

  const completed = isSceneCompleted(next)
  return {
    ...next,
    completed,
    completedAt: completed && !state.completed ? Date.now() : next.completedAt,
    lastAction: action,
    interactionCount: state.interactionCount + 1,
  }
}

export function isSceneCompleted(state: ProcessSceneState) {
  switch (state.sceneId) {
    case 'history':
      return correctHistoryOrder.every((item, index) => state.orderedItems?.[index] === item)
    case 'cai_lun':
      return correctCaiLunMaterials.every((item) => state.selectedItems?.includes(item))
    case 'preparation':
      return Boolean(state.visualFlags?.materialSelected && state.visualFlags?.cut && (state.softness ?? 0) >= 100)
    case 'steaming':
      return (state.softness ?? 0) >= 85 && (state.purity ?? 0) >= 100
    case 'pulping':
      return state.interactionCount >= 5 && (state.pulpUniformity ?? 0) >= 100
    case 'sheet_forming':
      return (state.screenLift ?? 0) >= 100 && Boolean(state.visualFlags?.wetSheet)
    case 'drying':
      return (state.dryness ?? 0) >= 100
    case 'finishing':
      return Boolean(state.visualFlags?.cut && state.visualFlags?.stacked) && finishingOrder.every((item, index) => state.orderedItems?.[index] === item)
    case 'future':
      return (state.recycleProgress ?? 0) >= 100 && (state.smartControlScore ?? 0) >= 100
    case 'legacy':
      return legacyCards.every((item) => state.unlockedCards?.includes(item))
    default:
      return false
  }
}

export function createActionLog(action: string, payload: unknown, progressAfterAction: number): ProcessActionLog {
  return {
    action,
    payload: sanitizePayload(payload),
    timestamp: Date.now(),
    progressAfterAction,
  }
}

function reduceSceneState(state: ProcessSceneState, action: string, payload?: unknown): ProcessSceneState {
  switch (state.sceneId) {
    case 'history':
      return reduceHistoryState(state, action, payload)
    case 'cai_lun':
      return reduceCaiLunState(state, action, payload)
    case 'preparation':
      return reducePreparationState(state, action)
    case 'steaming':
      return reduceSteamingState(state, action, payload)
    case 'pulping':
      return reducePulpingState(state, action)
    case 'sheet_forming':
      return reduceSheetFormingState(state, action, payload)
    case 'drying':
      return reduceDryingState(state, action)
    case 'finishing':
      return reduceFinishingState(state, action, payload)
    case 'future':
      return reduceFutureState(state, action, payload)
    case 'legacy':
      return reduceLegacyState(state, action, payload)
    default:
      return state
  }
}

function reduceHistoryState(state: ProcessSceneState, action: string, payload?: unknown): ProcessSceneState {
  if (action !== 'place_carrier' || typeof payload !== 'string') return state
  const orderedItems = state.orderedItems ?? []
  const expected = correctHistoryOrder[orderedItems.length]
  if (payload !== expected || orderedItems.includes(payload)) {
    return {
      ...state,
      phase: payload === expected ? state.phase : `先找“${expected}”，再继续排列。`,
      visualFlags: { ...state.visualFlags, wrongChoice: true },
    }
  }
  const nextItems = [...orderedItems, payload]
  return {
    ...state,
    orderedItems: nextItems,
    progress: nextItems.length * 25,
    phase: nextItems.length === 4 ? '文明载体时间线已点亮' : `已点亮“${payload}”，继续寻找下一种载体。`,
    visualFlags: { ...state.visualFlags, wrongChoice: false, [`node${nextItems.length}`]: true },
  }
}

function reduceCaiLunState(state: ProcessSceneState, action: string, payload?: unknown): ProcessSceneState {
  if (action !== 'select_material' || typeof payload !== 'string') return state
  const selectedItems = state.selectedItems ?? []
  if (!correctCaiLunMaterials.includes(payload)) {
    return {
      ...state,
      phase: '这种材料不适合提供柔韧纤维。',
      visualFlags: { ...state.visualFlags, rejectedMaterial: true },
    }
  }
  if (selectedItems.includes(payload)) return state
  const nextItems = [...selectedItems, payload]
  return {
    ...state,
    selectedItems: nextItems,
    progress: nextItems.length * 25,
    fiberDensity: nextItems.length * 25,
    phase: nextItems.length === 4 ? '可推广原料已备齐' : `已选入“${payload}”，原料篮更丰富了。`,
    visualFlags: { ...state.visualFlags, rejectedMaterial: false, lowCost: nextItems.length >= 2, fiberReady: nextItems.length >= 3 },
  }
}

function reducePreparationState(state: ProcessSceneState, action: string): ProcessSceneState {
  if (action === 'choose_material') {
    return {
      ...state,
      progress: Math.max(state.progress, 20),
      phase: '原料已放到木案板上',
      visualFlags: { ...state.visualFlags, materialSelected: true },
    }
  }
  if (action === 'cut_material' && state.visualFlags?.materialSelected) {
    return {
      ...state,
      progress: Math.max(state.progress, 55),
      phase: '原料被切成小块，纤维更容易吸水',
      softness: Math.max(state.softness ?? 0, 35),
      visualFlags: { ...state.visualFlags, cut: true },
    }
  }
  if (action === 'soak_material' && state.visualFlags?.cut) {
    const softness = clamp((state.softness ?? 0) + 35, 0, 100)
    return {
      ...state,
      progress: clamp(55 + softness * 0.45, 0, 100),
      waterLevel: clamp((state.waterLevel ?? 0) + 45, 0, 100),
      softness,
      phase: softness >= 100 ? '原料充分浸泡软化，植物纤维显现' : '水槽水位升高，原料边缘逐渐变软',
      visualFlags: { ...state.visualFlags, soaked: true, fibersVisible: softness >= 70 },
    }
  }
  return state
}

function reduceSteamingState(state: ProcessSceneState, action: string, payload?: unknown): ProcessSceneState {
  if (action === 'set_temperature' && typeof payload === 'number') {
    const temperature = clamp(payload, 0, 100)
    return {
      ...state,
      temperature,
      phase: temperature > 88 ? '火候过猛可能损伤纤维，试着保持中高温。' : temperature < 45 ? '温度偏低，蒸煮推进较慢。' : '火候适中，蒸汽开始上升。',
      progress: Math.max(state.progress, temperature * 0.28),
      visualFlags: { ...state.visualFlags, fireStrong: temperature > 60, overHeat: temperature > 88 },
    }
  }
  if (action === 'add_fire') {
    const temperature = clamp((state.temperature ?? 0) + 22, 0, 100)
    return reduceSteamingState(state, 'set_temperature', temperature)
  }
  if (action === 'keep_steaming') {
    const temperature = state.temperature ?? 0
    const heatFactor = temperature < 45 ? 0.45 : temperature > 88 ? 0.55 : 1
    const softness = clamp((state.softness ?? 35) + 18 * heatFactor, 0, 100)
    const purity = clamp((state.purity ?? 0) + 24 * heatFactor, 0, 100)
    return {
      ...state,
      softness,
      purity,
      progress: clamp(softness * 0.38 + purity * 0.62, 0, 100),
      phase: purity >= 100 ? '杂质分离完成，纤维洁净松散' : temperature > 88 ? '火候过猛，杂质分离变慢' : '气泡翻涌，深色杂质正在分离',
      visualFlags: { ...state.visualFlags, bubbles: true, steam: true, impurities: purity < 100 },
    }
  }
  return state
}

function reducePulpingState(state: ProcessSceneState, action: string): ProcessSceneState {
  if (action !== 'hammer') return state
  const hitCount = state.interactionCount + 1
  const pulpUniformity = clamp(hitCount * 17, 0, 100)
  return {
    ...state,
    progress: pulpUniformity,
    pulpUniformity,
    fiberDensity: clamp((state.fiberDensity ?? 0) + 18, 0, 100),
    phase: pulpUniformity >= 100 ? '纤维充分分散，形成均匀纸浆' : hitCount < 3 ? '原料块开始破碎' : '纤维粒子增多，纸浆逐渐均匀',
    visualFlags: { ...state.visualFlags, strike: true, halfCrushed: hitCount >= 3, pulpFormed: hitCount >= 5 },
  }
}

function reduceSheetFormingState(state: ProcessSceneState, action: string, payload?: unknown): ProcessSceneState {
  if (action === 'insert_screen') {
    return {
      ...state,
      progress: Math.max(state.progress, 24),
      screenLift: 12,
      phase: '竹帘进入纸浆水槽',
      visualFlags: { ...state.visualFlags, screenInVat: true, ripple: true },
    }
  }
  if (action === 'lift_screen') {
    const speed = typeof payload === 'string' ? payload : 'steady'
    const liftDelta = speed === 'fast' ? 18 : 32
    const screenLift = clamp((state.screenLift ?? 0) + liftDelta, 0, 100)
    return {
      ...state,
      screenLift,
      progress: clamp(20 + screenLift * 0.62, 0, 86),
      fiberDensity: clamp((state.fiberDensity ?? 15) + (speed === 'fast' ? 12 : 22), 0, 100),
      moisture: clamp(100 - screenLift * 0.35, 48, 100),
      phase: speed === 'fast' ? '动作要平稳，否则纸层不均匀。' : screenLift >= 80 ? '纤维附着在竹帘表面' : '竹帘平稳抬起，水波扩散',
      visualFlags: { ...state.visualFlags, screenInVat: true, lifting: true, fastLift: speed === 'fast', attachedFibers: screenLift >= 48 },
    }
  }
  if (action === 'drain_water') {
    const screenLift = Math.max(state.screenLift ?? 0, 100)
    return {
      ...state,
      screenLift,
      progress: 100,
      fiberDensity: 100,
      moisture: 48,
      phase: '湿纸层在竹帘上成形',
      visualFlags: { ...state.visualFlags, screenInVat: true, lifting: true, attachedFibers: true, wetSheet: true },
    }
  }
  return state
}

function reduceDryingState(state: ProcessSceneState, action: string): ProcessSceneState {
  if (action !== 'sunlight' && action !== 'wind' && action !== 'heat_air') return state
  const dryness = clamp((state.dryness ?? 0) + (action === 'sunlight' ? 28 : action === 'wind' ? 22 : 35), 0, 100)
  return {
    ...state,
    dryness,
    moisture: clamp(100 - dryness, 0, 100),
    progress: dryness,
    phase: dryness >= 100 ? '纸张干燥定型，纸纹清晰' : dryness >= 58 ? '纸张进入半干状态，水汽减少' : '湿纸受热受风，水分正在蒸发',
    visualFlags: {
      ...state.visualFlags,
      sunlight: action === 'sunlight',
      wind: action === 'wind',
      heatAir: action === 'heat_air',
      halfDry: dryness >= 45,
      dry: dryness >= 100,
    },
  }
}

function reduceFinishingState(state: ProcessSceneState, action: string, payload?: unknown): ProcessSceneState {
  if (action === 'cut_paper') {
    return {
      ...state,
      progress: Math.max(state.progress, 25),
      phase: '干纸被裁切成整齐纸张',
      visualFlags: { ...state.visualFlags, cut: true },
    }
  }
  if (action === 'stack_paper' && state.visualFlags?.cut) {
    return {
      ...state,
      progress: Math.max(state.progress, 45),
      phase: '纸张叠放成品，准备回顾流程',
      visualFlags: { ...state.visualFlags, stacked: true },
    }
  }
  if (action === 'order_step' && typeof payload === 'string') {
    const orderedItems = state.orderedItems ?? []
    const expected = finishingOrder[orderedItems.length]
    if (payload !== expected || orderedItems.includes(payload)) {
      return { ...state, phase: `先点亮“${expected}”，流程才能连起来。` }
    }
    const nextItems = [...orderedItems, payload]
    const progress = clamp(45 + nextItems.length * 11, 0, 100)
    return {
      ...state,
      orderedItems: nextItems,
      progress,
      phase: nextItems.length === finishingOrder.length ? '完整流程排序正确，核心原理已串联' : `已点亮“${payload}”。`,
      visualFlags: { ...state.visualFlags, [`flow${nextItems.length}`]: true },
    }
  }
  return state
}

function reduceFutureState(state: ProcessSceneState, action: string, payload?: unknown): ProcessSceneState {
  if (action === 'recycle') {
    const recycleProgress = clamp((state.recycleProgress ?? 0) + 34, 0, 100)
    return {
      ...state,
      recycleProgress,
      progress: clamp(recycleProgress * 0.5 + (state.smartControlScore ?? 0) * 0.5, 0, 100),
      phase: recycleProgress >= 100 ? '废纸完成回收再生，污水颜色变浅' : '废纸进入回收箱，碎纸片开始再制浆',
      visualFlags: { ...state.visualFlags, recycled: recycleProgress >= 68, waterClean: recycleProgress >= 100 },
    }
  }
  if (action === 'set_control' && typeof payload === 'number') {
    const smartControlScore = clamp(payload, 0, 100)
    return {
      ...state,
      smartControlScore,
      progress: clamp((state.recycleProgress ?? 0) * 0.5 + smartControlScore * 0.5, 0, 100),
      phase: smartControlScore >= 100 ? '控制参数进入合理范围，生产线输出合格纸张' : '继续调节温度、湿度、纤维配比和厚度。',
      visualFlags: { ...state.visualFlags, panelOn: smartControlScore > 30, roboticArm: smartControlScore > 70 },
    }
  }
  return state
}

function reduceLegacyState(state: ProcessSceneState, action: string, payload?: unknown): ProcessSceneState {
  if (action !== 'unlock_card' || typeof payload !== 'string') return state
  if (!legacyCards.includes(payload) || state.unlockedCards?.includes(payload)) return state
  const unlockedCards = [...(state.unlockedCards ?? []), payload]
  return {
    ...state,
    unlockedCards,
    progress: unlockedCards.length * 25,
    phase: unlockedCards.length === 4 ? '纸连接过去与未来，课程总结完成' : `已点亮“${payload}”。`,
    visualFlags: { ...state.visualFlags, inkSpread: unlockedCards.length >= 3, future: unlockedCards.length >= 4 },
  }
}

function sanitizePayload(payload: unknown) {
  if (payload === undefined || payload === null) return undefined
  if (typeof payload === 'string' || typeof payload === 'number' || typeof payload === 'boolean') return payload
  return JSON.parse(JSON.stringify(payload))
}

export const processSceneChoices = {
  correctHistoryOrder,
  correctCaiLunMaterials,
  finishingOrder,
  legacyCards,
}
