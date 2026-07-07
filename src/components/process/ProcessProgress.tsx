import type { ProcessScene, ProcessSceneState } from './types'

type ProcessProgressProps = {
  scenes: ProcessScene[]
  states: Record<string, ProcessSceneState>
  currentIndex: number
  onSelectScene: (index: number) => void
}

export function ProcessProgress({ scenes, states, currentIndex, onSelectScene }: ProcessProgressProps) {
  const completedCount = scenes.filter((scene) => states[scene.id]?.completed).length
  const totalProgress = Math.round((completedCount / scenes.length) * 100)

  return (
    <>
      <div className="overview-progress process-story-progress" aria-label={`演示总进度 ${totalProgress}%`}>
        <div>
          <strong>{totalProgress}%</strong>
          <span>剧情总进度</span>
        </div>
        <div className="progress-rail">
          <span style={{ width: `${totalProgress}%` }} />
        </div>
      </div>

      <div className="step-dots process-step-dots" aria-label="互动场景导航">
        {scenes.map((scene, index) => {
          const locked = index > currentIndex && !states[scenes[index - 1]?.id]?.completed
          return (
            <button
              key={scene.id}
              type="button"
              className={`${index === currentIndex ? 'active' : ''} ${states[scene.id]?.completed ? 'done' : ''}`}
              onClick={() => onSelectScene(index)}
              title={scene.title}
              disabled={locked}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
    </>
  )
}
