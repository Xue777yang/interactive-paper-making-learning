import type { KnowledgePoint } from '../data/questions'
import { knowledgePointMeta } from '../data/questions'

export type ProcessStep = {
  id: string
  title: string
  description: string
  knowledgePoints: KnowledgePoint[]
  visual: 'materials' | 'cooking' | 'pulping' | 'mixing' | 'sheet' | 'press' | 'drying' | 'final'
  actionHint: string
}

type ProcessStepCardProps = {
  step: ProcessStep
  stepIndex: number
  totalSteps: number
  progress: number
  interactionCount: number
  onInteract: (amount?: number) => void
  onSetProgress: (value: number) => void
  onPrevious: () => void
  onNext: () => void
}

const materialItems = ['树皮', '麻头', '破布', '旧渔网']

export function ProcessStepCard({
  step,
  stepIndex,
  totalSteps,
  progress,
  interactionCount,
  onInteract,
  onSetProgress,
  onPrevious,
  onNext,
}: ProcessStepCardProps) {
  const completed = progress >= 100

  return (
    <article className="process-card paper-panel">
      <div className="process-copy">
        <p className="eyebrow">
          第 {stepIndex + 1} 步 / 共 {totalSteps} 步
        </p>
        <h2>{step.title}</h2>
        <p>{step.description}</p>
        <div className="knowledge-tags">
          {step.knowledgePoints.map((point) => (
            <span key={point}>{knowledgePointMeta[point].label}</span>
          ))}
        </div>
      </div>

      <div className={`process-visual ${step.visual} ${completed ? 'completed' : ''}`}>
        {renderVisual(step.visual, progress)}
      </div>

      <div className="process-controls">
        <p>{step.actionHint}</p>
        {renderControls(step.visual, progress, onInteract, onSetProgress)}
        <div className="mini-meter">
          <span style={{ width: `${progress}%` }} />
        </div>
        <small>
          互动次数：{interactionCount} · {completed ? '本步已完成' : '完成互动后可进入下一步'}
        </small>
      </div>

      <div className="process-nav">
        <button className="ghost-button" type="button" onClick={onPrevious} disabled={stepIndex === 0}>
          上一步
        </button>
        <button className="primary-button" type="button" onClick={onNext} disabled={!completed}>
          {stepIndex === totalSteps - 1 ? '完成演示' : '下一步'}
        </button>
      </div>
    </article>
  )
}

function renderControls(
  visual: ProcessStep['visual'],
  progress: number,
  onInteract: (amount?: number) => void,
  onSetProgress: (value: number) => void,
) {
  if (visual === 'materials') {
    return (
      <div className="material-buttons">
        {materialItems.map((item) => (
          <button type="button" key={item} onClick={() => onInteract(25)}>
            放入{item}
          </button>
        ))}
      </div>
    )
  }

  if (visual === 'cooking') {
    return (
      <label className="range-control">
        <span>蒸煮时间</span>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(event) => onSetProgress(Number(event.target.value))}
        />
      </label>
    )
  }

  if (visual === 'drying') {
    return (
      <div className="dual-actions">
        <button type="button" onClick={() => onInteract(35)}>
          点击太阳加热
        </button>
        <button type="button" onClick={() => onInteract(35)}>
          点击风口通风
        </button>
      </div>
    )
  }

  return (
    <button type="button" className="interaction-button" onClick={() => onInteract(visual === 'final' ? 100 : 28)}>
      {getActionLabel(visual)}
    </button>
  )
}

function getActionLabel(visual: ProcessStep['visual']) {
  switch (visual) {
    case 'pulping':
      return '挥动木槌'
    case 'mixing':
      return '搅动水槽'
    case 'sheet':
      return '抄纸成形'
    case 'press':
      return '压下木板'
    case 'final':
      return '展开知识卡片'
    default:
      return '继续互动'
  }
}

function renderVisual(visual: ProcessStep['visual'], progress: number) {
  return (
    <>
      <div className="visual-frame">
        <span className="visual-percent">{Math.round(progress)}%</span>
        {visual === 'materials' && (
          <div className="basket-scene">
            <div className="basket" />
            <div className="fiber raw-a" />
            <div className="fiber raw-b" />
            <div className="fiber raw-c" />
          </div>
        )}
        {visual === 'cooking' && (
          <div className="pot-scene">
            <div className="steam one" />
            <div className="steam two" />
            <div className="pot" />
            <div className="flame" />
          </div>
        )}
        {visual === 'pulping' && (
          <div className="pulp-scene">
            <div className="mallet" />
            <div className="pulp" />
          </div>
        )}
        {visual === 'mixing' && (
          <div className="mix-scene">
            <div className="water-ring" />
            <div className="fiber-dot a" />
            <div className="fiber-dot b" />
            <div className="fiber-dot c" />
            <div className="fiber-dot d" />
          </div>
        )}
        {visual === 'sheet' && (
          <div className="sheet-scene">
            <div className="legacy-bamboo-screen" />
            <div className="wet-sheet" style={{ opacity: 0.25 + progress / 140 }} />
          </div>
        )}
        {visual === 'press' && (
          <div className="press-scene">
            <div className="press-board" style={{ transform: `translateY(${Math.min(progress / 4, 24)}px)` }} />
            <div className="paper-stack" />
          </div>
        )}
        {visual === 'drying' && (
          <div className="dry-scene">
            <div className="sun" />
            <div className="wind-line one" />
            <div className="wind-line two" />
            <div className="wall-paper" style={{ filter: `saturate(${0.8 + progress / 160})` }} />
          </div>
        )}
        {visual === 'final' && (
          <div className="final-scene">
            <div className="finished-paper">
              <strong>纸成</strong>
              <p>书写 · 教育 · 印刷 · 传播</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
