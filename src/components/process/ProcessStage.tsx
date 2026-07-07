import { processAssets } from '../../assets/process/processAssetMap'
import {
  CaiLunInnovationVisual,
  DryingVisual,
  FinishingVisual,
  HistoryVisual,
  PreparationVisual,
  PulpingVisual,
  SheetFormingVisual,
  SteamingVisual,
} from './visuals/ProcessVisualScenes'
import type { ProcessScene, ProcessSceneState } from './types'

type ProcessStageProps = {
  scene: ProcessScene
  state: ProcessSceneState
  onAction: (action: string, payload?: unknown) => void
}

export function ProcessStage({ scene, state, onAction }: ProcessStageProps) {
  return (
    <section className="process-stage paper-panel process-story-stage" aria-label={`${scene.title}动画舞台`}>
      <div className="process-stage-header">
        <div>
          <p className="eyebrow">剧情动画舞台</p>
          <h2>{scene.stageTitle}</h2>
        </div>
        {state.completed && <span className="process-completion-badge">已完成</span>}
      </div>
      {renderVisual(scene, state, onAction)}
    </section>
  )
}

function renderVisual(scene: ProcessScene, state: ProcessSceneState, onAction: (action: string, payload?: unknown) => void) {
  const props = { scene, state, assets: processAssets, onAction }

  switch (scene.id) {
    case 'history':
      return <HistoryVisual {...props} />
    case 'cai_lun':
      return <CaiLunInnovationVisual {...props} />
    case 'preparation':
      return <PreparationVisual {...props} />
    case 'steaming':
      return <SteamingVisual {...props} />
    case 'pulping':
      return <PulpingVisual {...props} />
    case 'sheet_forming':
      return <SheetFormingVisual {...props} />
    case 'drying':
      return <DryingVisual {...props} />
    case 'finishing':
      return <FinishingVisual {...props} />
    default:
      return null
  }
}
