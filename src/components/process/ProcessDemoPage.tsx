import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageBackground } from '../layout/PageBackground'
import { processKnowledgeTagMeta, processScenes } from '../../data/processScenes'
import {
  createActionLog,
  createInitialProcessSceneStates,
  updateProcessSceneStateAfterAction,
  type ProcessSceneStateMap,
} from '../../lib/processDemoEngine'
import {
  clearProcessDemoStorage,
  makeProcessRecordId,
  recordProcessInteraction,
} from '../../lib/processStorage'
import { clamp } from '../../lib/utils'
import { ProcessControls } from './ProcessControls'
import { ProcessProgress } from './ProcessProgress'
import { ProcessStage } from './ProcessStage'
import type { ProcessActionLog, ProcessSceneId } from './types'

function createEmptyActionLogMap() {
  return processScenes.reduce(
    (record, scene) => {
      record[scene.id] = []
      return record
    },
    {} as Record<ProcessSceneId, ProcessActionLog[]>,
  )
}

export function ProcessDemoPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sceneStates, setSceneStates] = useState<ProcessSceneStateMap>(() => createInitialProcessSceneStates())
  const recordedIdsRef = useRef(new Set<ProcessSceneId>())
  const actionLogsRef = useRef(createEmptyActionLogMap())

  const currentScene = processScenes[currentIndex]
  const currentState = sceneStates[currentScene.id]
  const currentProgress = Math.round(currentState.progress)

  const resetDemo = useCallback(() => {
    clearProcessDemoStorage()
    setCurrentIndex(0)
    setSceneStates(createInitialProcessSceneStates())
    recordedIdsRef.current = new Set()
    actionLogsRef.current = createEmptyActionLogMap()
  }, [])

  useEffect(() => {
    resetDemo()
  }, [location.search, resetDemo])

  const stageHint = useMemo(() => {
    if (currentState.completed) return currentScene.completionText
    if (currentState.phase === '等待开始') return currentScene.intro
    return currentState.phase
  }, [currentScene, currentState])

  function handleSceneAction(action: string, payload?: unknown) {
    const scene = currentScene
    setSceneStates((previous) => {
      const before = previous[scene.id]
      const next = updateProcessSceneStateAfterAction(before, action, payload)
      if (next === before) return previous

      const actionLog = createActionLog(action, payload, next.progress)
      actionLogsRef.current[scene.id] = [...(actionLogsRef.current[scene.id] ?? []), actionLog]

      if (next.completed && !recordedIdsRef.current.has(scene.id)) {
        recordedIdsRef.current.add(scene.id)
        const completedAt = next.completedAt ?? Date.now()
        try {
          recordProcessInteraction({
            id: makeProcessRecordId(scene.id),
            sceneId: scene.id,
            sceneTitle: scene.title,
            knowledgeTagIds: scene.knowledgeTags,
            startedAt: before.startedAt ?? Date.now(),
            completedAt,
            timeSpentMs: completedAt - (before.startedAt ?? completedAt),
            interactionCount: next.interactionCount,
            completed: next.completed,
            finalProgress: next.progress,
            actions: actionLogsRef.current[scene.id],
          })
        } catch {
          // Learning analytics should never interrupt the classroom interaction.
        }
      }

      return { ...previous, [scene.id]: next }
    })
  }

  function moveTo(index: number) {
    const nextIndex = clamp(index, 0, processScenes.length - 1)
    if (nextIndex > currentIndex && !currentState.completed) return
    if (nextIndex > 0 && !sceneStates[processScenes[nextIndex - 1].id].completed) return
    setCurrentIndex(nextIndex)
  }

  function finishDemo() {
    navigate('/student/quiz')
  }

  return (
    <section className="process-page process-story-page">
      <PageBackground variant="process" sceneId={currentScene.id} />
      <div className="section-heading">
        <p className="eyebrow">互动演示</p>
        <h1>造纸术过程演示</h1>
        <p>8 个微课剧情场景，从文明载体演变一路完成传统造纸工艺。</p>
      </div>

      <ProcessProgress
        scenes={processScenes}
        states={sceneStates}
        currentIndex={currentIndex}
        onSelectScene={moveTo}
      />

      <div className="process-learning-layout process-story-layout">
        <article className="process-info-panel paper-panel process-story-panel">
          <p className="eyebrow">
            当前场景：{currentIndex + 1} / {processScenes.length}
          </p>
          <h2>{currentScene.title}</h2>
          <p className="process-intro">{currentScene.intro}</p>

          <div className="process-objective">
            <strong>学习目标</strong>
            <span>{currentScene.learningGoal}</span>
          </div>

          <ProcessControls scene={currentScene} state={currentState} onAction={handleSceneAction} />

          <div className="process-state-meter">
            <div>
              <span>当前阶段</span>
              <strong>{stageHint}</strong>
            </div>
            <div className="thin-meter process-meter" aria-label={`工艺进度 ${currentProgress}%`}>
              <i style={{ width: `${currentProgress}%` }} />
            </div>
            <small>工艺进度：{currentProgress}%</small>
          </div>

          <div className="knowledge-tags process-knowledge-tags" aria-label="知识点标签">
            {currentScene.knowledgeTags.map((point) => (
              <span key={point} style={{ borderColor: processKnowledgeTagMeta[point].color }}>
                {processKnowledgeTagMeta[point].label}
              </span>
            ))}
          </div>

          <div className="process-nav">
            <button className="ghost-button" type="button" onClick={() => moveTo(currentIndex - 1)} disabled={currentIndex === 0}>
              上一步
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={currentIndex === processScenes.length - 1 ? finishDemo : () => moveTo(currentIndex + 1)}
              disabled={!currentState.completed}
            >
              {currentIndex === processScenes.length - 1 ? '进入课后测验' : '下一步'}
            </button>
          </div>
        </article>

        <ProcessStage scene={currentScene} state={currentState} onAction={handleSceneAction} />
      </div>
    </section>
  )
}
