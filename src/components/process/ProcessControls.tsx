import { processSceneChoices } from '../../lib/processDemoEngine'
import type { ProcessScene, ProcessSceneState } from './types'

type ProcessControlsProps = {
  scene: ProcessScene
  state: ProcessSceneState
  onAction: (action: string, payload?: unknown) => void
}

const caiLunDistractors = ['石块', '青铜', '陶片']
const preparationActions = [
  { action: 'choose_material', label: '选择纤维原料' },
  { action: 'cut_material', label: '切割原料' },
  { action: 'soak_material', label: '加水浸泡' },
]

export function ProcessControls({ scene, state, onAction }: ProcessControlsProps) {
  return (
    <div className="process-control-panel">
      <p className="process-task">{scene.task}</p>
      {renderControls(scene, state, onAction)}
    </div>
  )
}

function renderControls(scene: ProcessScene, state: ProcessSceneState, onAction: (action: string, payload?: unknown) => void) {
  switch (scene.id) {
    case 'history':
      return (
        <div className="process-action-grid">
          {processSceneChoices.correctHistoryOrder.map((item) => (
            <button
              type="button"
              key={item}
              className={state.orderedItems?.includes(item) ? 'process-chip selected' : 'process-chip'}
              onClick={() => onAction('place_carrier', item)}
              disabled={state.orderedItems?.includes(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )
    case 'cai_lun':
      return (
        <div className="process-action-grid">
          {[...processSceneChoices.correctCaiLunMaterials, ...caiLunDistractors].map((item) => (
            <button
              type="button"
              key={item}
              className={state.selectedItems?.includes(item) ? 'process-chip selected' : 'process-chip'}
              onClick={() => onAction('select_material', item)}
              disabled={state.selectedItems?.includes(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )
    case 'preparation':
      return (
        <div className="process-control-stack">
          {preparationActions.map((item) => (
            <button type="button" className="interaction-button" key={item.action} onClick={() => onAction(item.action)}>
              {item.label}
            </button>
          ))}
        </div>
      )
    case 'steaming':
      return (
        <div className="process-control-stack">
          <button type="button" className="interaction-button" onClick={() => onAction('add_fire')}>
            加柴升温
          </button>
          <button type="button" className="interaction-button" onClick={() => onAction('keep_steaming')}>
            保持蒸煮
          </button>
          <label className="range-control">
            <span>调节火候</span>
            <input
              type="range"
              min="0"
              max="100"
              value={state.temperature ?? 0}
              onChange={(event) => onAction('set_temperature', Number(event.target.value))}
            />
          </label>
        </div>
      )
    case 'pulping':
      return (
        <button type="button" className="interaction-button process-big-action" onClick={() => onAction('hammer')}>
          挥动木槌
        </button>
      )
    case 'sheet_forming':
      return (
        <div className="process-control-stack">
          <button type="button" className="interaction-button" onClick={() => onAction('insert_screen')}>
            放入竹帘
          </button>
          <div className="dual-actions">
            <button type="button" onClick={() => onAction('lift_screen', 'steady')}>
              平稳抬起
            </button>
            <button type="button" onClick={() => onAction('lift_screen', 'fast')}>
              快速抬起
            </button>
          </div>
          <button type="button" className="interaction-button" onClick={() => onAction('drain_water')}>
            沥水成形
          </button>
        </div>
      )
    case 'drying':
      return (
        <div className="process-control-stack">
          <div className="dual-actions">
            <button type="button" onClick={() => onAction('sunlight')}>
              阳光照晒
            </button>
            <button type="button" onClick={() => onAction('wind')}>
              微风吹干
            </button>
          </div>
          <button type="button" className="interaction-button" onClick={() => onAction('heat_air')}>
            热风烘干
          </button>
        </div>
      )
    case 'finishing':
      return (
        <div className="process-control-stack">
          <button type="button" className="interaction-button" onClick={() => onAction('cut_paper')}>
            裁切纸张
          </button>
          <button type="button" className="interaction-button" onClick={() => onAction('stack_paper')}>
            叠放成品
          </button>
          <div className="process-action-grid">
            {processSceneChoices.finishingOrder.map((item) => (
              <button
                type="button"
                key={item}
                className={state.orderedItems?.includes(item) ? 'process-chip selected' : 'process-chip'}
                onClick={() => onAction('order_step', item)}
                disabled={state.orderedItems?.includes(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )
    default:
      return null
  }
}
