import type { CSSProperties } from 'react'
import type { ProcessVisualProps } from '../types'
import { AssetImage, CssPaper, CssProp, ProgressFill, SceneBackdrop } from './VisualPrimitives'

const carrierItems = [
  { label: '甲骨', asset: 'oracleBone' },
  { label: '竹简', asset: 'bambooSlip' },
  { label: '帛书', asset: 'silkManuscript' },
  { label: '纸', asset: 'xuanPaper' },
] as const

const caiLunMaterials = [
  { label: '树皮', asset: 'bark' },
  { label: '麻头', asset: 'hemp' },
  { label: '破布', asset: 'rag' },
  { label: '旧渔网', asset: 'fishingNet' },
] as const

const finishingOrder = ['备料', '蒸煮', '打浆', '抄纸', '晒纸']
const legacyCards = ['古法匠心', '文明传播', '环保革新', '智能制造']

function hasFlag(state: ProcessVisualProps['state'], key: string) {
  return Boolean(state.visualFlags?.[key])
}

function stageStyle(progress: number) {
  return { '--scene-progress': `${Math.round(progress)}%` } as CSSProperties
}

export function HistoryVisual({ state, assets, scene }: ProcessVisualProps) {
  const ordered = state.orderedItems ?? []
  return (
    <div className="process-visual-stage story-visual history-visual" style={stageStyle(state.progress)}>
      <SceneBackdrop src={assets.backgrounds.historyTimeline} />
      <div className="timeline-line" aria-hidden="true" />
      {carrierItems.map((item, index) => {
        const lit = ordered.includes(item.label)
        return (
          <div key={item.label} className={`history-carrier carrier-${index + 1} ${lit ? 'is-lit' : ''}`}>
            <span className="timeline-marker">{index + 1}</span>
            <AssetImage
              src={assets.props[item.asset]}
              alt={item.label}
              className="history-carrier-img"
              fallback={<CssProp label={item.label} className="carrier-fallback" />}
            />
            <strong>{item.label}</strong>
          </div>
        )
      })}
      <p className="stage-caption">{state.completed ? scene.completionText : '按时间顺序点亮甲骨、竹简、帛书和纸。'}</p>
    </div>
  )
}

export function CaiLunInnovationVisual({ state, assets, scene }: ProcessVisualProps) {
  const selected = state.selectedItems ?? []
  return (
    <div className="process-visual-stage story-visual cai-lun-visual" style={stageStyle(state.progress)}>
      <SceneBackdrop src={assets.backgrounds.ancientWorkshop} />
      <AssetImage
        src={assets.props.caiLun}
        alt="蔡伦"
        className="cailun-portrait"
        fallback={<CssProp label="蔡伦" className="portrait-fallback" />}
      />
      <div className="material-basket" aria-hidden="true">
        {selected.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      {caiLunMaterials.map((item, index) => {
        const picked = selected.includes(item.label)
        return (
          <AssetImage
            key={item.label}
            src={assets.props[item.asset]}
            alt={item.label}
            className={`cailun-material mat-${index + 1} ${picked ? 'is-picked' : ''}`}
            fallback={<CssProp label={item.label} className={`cailun-material mat-${index + 1} ${picked ? 'is-picked' : ''}`} />}
          />
        )
      })}
      <div className="innovation-labels">
        <span className={selected.length >= 2 ? 'active' : ''}>低成本</span>
        <span className={selected.length >= 3 ? 'active' : ''}>易获取</span>
        <span className={selected.length >= 4 ? 'active' : ''}>植物纤维</span>
      </div>
      {hasFlag(state, 'rejectedMaterial') && <p className="process-callout warning">这种材料不适合提供柔韧纤维。</p>}
      <p className="stage-caption">{state.completed ? scene.completionText : '正确原料会飞入作坊原料区。'}</p>
    </div>
  )
}

export function PreparationVisual({ state, assets, scene }: ProcessVisualProps) {
  const materialSelected = hasFlag(state, 'materialSelected')
  const cut = hasFlag(state, 'cut')
  const soaked = hasFlag(state, 'soaked')
  const fibersVisible = hasFlag(state, 'fibersVisible')
  const materialSrc = soaked ? assets.props.fishingNetCloseup : cut ? assets.props.ragCloseup : assets.props.barkCloseup
  return (
    <div className="process-visual-stage story-visual preparation-visual" style={stageStyle(state.progress)}>
      <SceneBackdrop src={assets.backgrounds.preparationTable} />
      <AssetImage src={assets.tools.woodenBoard} decorative className="prep-board" fallback={<span className="prep-board css-board" />} />
      {materialSelected && (
        <AssetImage
          src={materialSrc}
          alt="纤维原料"
          className={`prep-material ${cut ? 'is-cut' : ''} ${soaked ? 'is-soaked' : ''}`}
          fallback={<CssProp label="原料" className={`prep-material ${cut ? 'is-cut' : ''}`} />}
        />
      )}
      {materialSelected && !soaked && (
        <AssetImage
          src={assets.tools.cuttingKnife}
          alt="切割工具"
          className={`prep-knife ${cut ? 'is-cutting' : ''}`}
          fallback={<CssProp label="刀" className="prep-knife" />}
        />
      )}
      <div className={`prep-water ${soaked ? 'is-active' : ''}`} aria-hidden="true">
        <AssetImage src={assets.props.waterVat} decorative className="prep-water-vat" />
      </div>
      <div className="water-level-gauge" aria-label={`水位 ${Math.round(state.waterLevel ?? 0)}%`}>
        <span style={{ height: `${state.waterLevel ?? 0}%` }} />
        <strong>水位</strong>
      </div>
      <div className={`fiber-diagram ${fibersVisible ? 'is-visible' : ''}`}>
        <AssetImage src={assets.icons.fiberDiagram} alt="植物纤维放大示意" className="fiber-diagram-img" fallback={<CssProp label="纤维" />} />
      </div>
      <ProgressFill value={state.softness ?? 0} label="软化度" />
      <p className="stage-caption">{state.completed ? scene.completionText : '切割后再浸泡，原料会变浅、变软，并显露纤维。'}</p>
    </div>
  )
}

export function SteamingVisual({ state, assets, scene }: ProcessVisualProps) {
  const temperature = state.temperature ?? 0
  const purity = state.purity ?? 0
  return (
    <div className="process-visual-stage story-visual steaming-visual" style={stageStyle(state.progress)}>
      <SceneBackdrop src={assets.backgrounds.steamingStove} />
      <AssetImage src={assets.props.steamingStove} decorative className="stove-body" fallback={<span className="stove-body css-stove" />} />
      <AssetImage src={assets.props.boilingPot} alt="蒸煮大锅" className="boiling-pot" fallback={<CssProp label="锅" className="boiling-pot" />} />
      <AssetImage
        src={assets.effects.fire}
        decorative
        className={`fire-layer ${temperature > 45 ? 'active' : ''} ${temperature > 88 ? 'overheat' : ''}`}
        style={{ opacity: Math.max(0.2, temperature / 100) }}
      />
      <AssetImage src={assets.effects.bubbles} decorative className={`bubble-layer ${hasFlag(state, 'bubbles') ? 'active' : ''}`} />
      <AssetImage src={assets.effects.steam} decorative className={`steam-layer ${hasFlag(state, 'steam') ? 'active' : ''}`} />
      <AssetImage
        src={purity > 65 ? assets.props.boiledFibers : assets.props.softenedMaterial}
        alt="蒸煮中的纤维"
        className="boiled-fibers"
        fallback={<CssProp label="纤维" className="boiled-fibers" />}
      />
      <AssetImage
        src={assets.effects.impurityParticles}
        decorative
        className={`impurity-layer ${purity >= 100 ? 'clean' : ''}`}
      />
      <div className="temperature-gauge" aria-label={`温度 ${Math.round(temperature)}%`}>
        <span style={{ height: `${temperature}%` }} />
      </div>
      <p className="stage-caption">{state.completed ? scene.completionText : '火焰、气泡和蒸汽会随温度与蒸煮推进变化。'}</p>
    </div>
  )
}

export function PulpingVisual({ state, assets, scene }: ProcessVisualProps) {
  const uniformity = state.pulpUniformity ?? 0
  const particleCount = Math.max(4, Math.ceil(uniformity / 10))
  const complete = uniformity >= 92
  const materialSrc = uniformity > 34 ? assets.props.materialHalfCrushed : assets.props.materialWhole
  return (
    <div className="process-visual-stage story-visual pulping-visual" style={stageStyle(uniformity)}>
      <SceneBackdrop src={assets.backgrounds.pulpingTable} />
      <AssetImage
        key={`mallet-${state.interactionCount}`}
        src={assets.tools.mallet}
        alt="木槌"
        className={`story-mallet ${state.lastAction === 'hammer' ? 'is-striking' : ''}`}
        fallback={<span className={`story-mallet css-mallet ${state.lastAction === 'hammer' ? 'is-striking' : ''}`} />}
      />
      <AssetImage src={assets.tools.mortar} decorative className="mortar" fallback={<span className="mortar css-mortar" />} />
      {!complete && (
        <AssetImage
          src={materialSrc}
          alt="被打散的原料"
          className="pulp-material"
          fallback={<CssProp label="原料" className="pulp-material" />}
        />
      )}
      {complete && (
        <AssetImage
          src={assets.props.paperPulp}
          alt="均匀纸浆"
          className="pulp-vat-ready"
          fallback={<CssProp label="纸浆" className="pulp-vat-ready" />}
        />
      )}
      {Array.from({ length: complete ? 7 : particleCount }).map((_, index) => (
        <span key={index} className={`pulp-particle particle-${(index % 10) + 1}`} aria-hidden="true" />
      ))}
      {!complete && <AssetImage src={assets.effects.debrisSplash} decorative className={`debris-layer ${state.interactionCount > 0 ? 'active' : ''}`} />}
      <ProgressFill value={uniformity} label="纸浆均匀度" />
      <p className="stage-caption">{state.completed ? scene.completionText : `已挥动 ${state.interactionCount} 次，继续让纤维更细更均匀。`}</p>
    </div>
  )
}

export function SheetFormingVisual({ state, assets, scene }: ProcessVisualProps) {
  const screenLift = state.screenLift ?? 0
  const screenInVat = hasFlag(state, 'screenInVat')
  const attached = hasFlag(state, 'attachedFibers')
  const wetSheet = hasFlag(state, 'wetSheet')
  const attachedOpacity = attached && !wetSheet ? Math.min(0.8, (state.fiberDensity ?? 0) / 125) : 0
  const wetOpacity = wetSheet ? 1 : 0
  const screenTransform = `translate(-50%, ${42 - screenLift * 0.76}px) rotateX(${Math.min(18, screenLift / 5)}deg)`
  return (
    <div className="process-visual-stage story-visual sheet-forming-visual" style={stageStyle(screenLift)}>
      <SceneBackdrop src={assets.backgrounds.sheetFormingVat} />
      <div className="sheet-vat-base" aria-hidden="true">
        <AssetImage src={assets.props.pulpWaterSurface} decorative className="pulp-water-surface" />
        <AssetImage src={assets.effects.floatingFibers} decorative className={`floating-fibers ${screenInVat && !wetSheet ? 'active' : ''}`} />
      </div>
      {screenInVat && (
        <div
          className={`forming-screen-mask ${wetSheet ? 'has-wet-sheet' : ''}`}
          style={{ transform: screenTransform }}
        >
          <AssetImage
            src={screenLift > 45 ? assets.props.bambooScreenTilted : assets.props.bambooScreenFront}
            alt="竹帘"
            className="forming-screen-img"
            fallback={<span className="forming-screen-img forming-screen-fallback" />}
          />
        </div>
      )}
      <AssetImage
        src={assets.props.attachedFiberMat}
        decorative
        className="attached-fiber-mat"
        style={{ opacity: Math.max(attachedOpacity, wetOpacity) }}
      />
      <AssetImage
        src={assets.papers.wetLayer}
        alt="半透明湿纸层"
        className="wet-paper-layer"
        style={{ opacity: wetOpacity }}
        fallback={<CssPaper className="wet-paper-layer" />}
      />
      <div className="sheet-concept-labels" aria-label="抄纸关键概念">
        {['过滤', '附着', '交织', '湿纸成形'].map((label, index) => (
          <span key={label} className={screenLift >= index * 26 || (index === 3 && hasFlag(state, 'wetSheet')) ? 'active' : ''}>
            {label}
          </span>
        ))}
      </div>
      <p className="stage-caption">{state.completed ? scene.completionText : '纸浆中的纤维正从水中移动到竹帘表面。'}</p>
    </div>
  )
}

export function DryingVisual({ state, assets, scene }: ProcessVisualProps) {
  const dryness = state.dryness ?? 0
  const sunlight = hasFlag(state, 'sunlight')
  const wind = hasFlag(state, 'wind')
  const heatAir = hasFlag(state, 'heatAir')
  return (
    <div className="process-visual-stage story-visual drying-visual" style={stageStyle(dryness)}>
      <SceneBackdrop src={assets.backgrounds.dryingYard} />
      <AssetImage src={assets.props.dryingWallPanel} decorative className="drying-wall-panel" />
      <AssetImage src={assets.props.bambooRack} decorative className="drying-rack" fallback={<span className="drying-rack css-rack" />} />
      <AssetImage src={assets.papers.wet} alt="湿纸" className="drying-paper-img paper-wet" style={{ opacity: dryness < 48 ? 1 : 0 }} fallback={<CssPaper className="drying-paper-img" />} />
      <AssetImage src={assets.papers.halfDry} alt="半干纸" className="drying-paper-img paper-half" style={{ opacity: dryness >= 35 && dryness < 95 ? 1 : 0 }} fallback={<CssPaper className="drying-paper-img" />} />
      <AssetImage src={assets.papers.dry} alt="干纸" className="drying-paper-img paper-dry" style={{ opacity: dryness >= 82 ? 1 : 0 }} fallback={<CssPaper className="drying-paper-img" />} />
      <div className={`css-sun ${sunlight ? 'active' : ''}`} aria-hidden="true" />
      <div className={`heat-air-layer ${heatAir ? 'active' : ''}`} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <AssetImage src={assets.effects.windLines} decorative className={`wind-layer ${wind ? 'active' : ''}`} />
      <AssetImage src={assets.effects.dryingSteam} decorative className="drying-steam-layer" style={{ opacity: Math.max(0, 0.45 - dryness / 180) }} />
      <ProgressFill value={dryness} label="干燥度" />
      <p className="stage-caption">{state.completed ? scene.completionText : '湿纸会逐渐变浅，水汽减少，纸纹变清晰。'}</p>
    </div>
  )
}

export function FinishingVisual({ state, assets, scene }: ProcessVisualProps) {
  const cut = hasFlag(state, 'cut')
  const stacked = hasFlag(state, 'stacked')
  const ordered = state.orderedItems ?? []
  const flowIconAssets = [assets.icons.materialCard, assets.icons.processSoak, assets.icons.processFlow, assets.icons.processStack, assets.icons.processDry]
  const activeFlowIndex = Math.max(0, ordered.length - 1)
  const activeFlowAsset = ordered.length ? flowIconAssets[activeFlowIndex] : null
  const activeFlowLabel = ordered.length ? finishingOrder[activeFlowIndex] : ''
  return (
    <div className="process-visual-stage story-visual finishing-visual" style={stageStyle(state.progress)}>
      <SceneBackdrop src={assets.backgrounds.cuttingTable} />
      <AssetImage src={assets.tools.woodenTableLarge} decorative className="finish-table" fallback={<span className="finish-table css-board" />} />
      <AssetImage
        src={stacked ? assets.papers.stack : assets.papers.singleDry}
        alt={stacked ? '叠放成品纸' : '干纸单张'}
        className={`finish-paper ${cut ? 'is-cut' : ''} ${stacked ? 'is-stacked' : ''}`}
        fallback={<CssPaper className="finish-paper" />}
      />
      {!stacked && <AssetImage src={assets.tools.paperCutter} alt="裁纸刀" className={`paper-cutter ${cut ? 'is-cutting' : ''}`} fallback={<CssProp label="裁刀" className="paper-cutter" />} />}
      {activeFlowAsset && (
        <div className="finish-flow-artifact" aria-label={`当前流程：${activeFlowLabel}`}>
          <AssetImage src={activeFlowAsset} alt={activeFlowLabel} className="finish-flow-artifact-img" />
          <strong>{activeFlowLabel}</strong>
        </div>
      )}
      <div className="flow-review">
        {finishingOrder.map((item, index) => (
          <span key={item} className={ordered.includes(item) ? 'active' : ''}>
            <AssetImage src={flowIconAssets[index]} decorative className="flow-review-icon" />
            <b>{index + 1}. {item}</b>
          </span>
        ))}
      </div>
      <p className="stage-caption">{state.completed ? scene.completionText : '裁切、叠放后，把完整流程按顺序点亮。'}</p>
    </div>
  )
}

export function FuturePapermakingVisual({ state, assets, scene }: ProcessVisualProps) {
  const recycle = state.recycleProgress ?? 0
  const smart = state.smartControlScore ?? 0
  const recycleStage = recycle >= 100 ? 'clean' : recycle >= 68 ? 'recycled' : recycle >= 34 ? 'shredded' : 'waste'
  const smartSteps = [
    { label: '检测', active: smart > 28 },
    { label: '调参', active: smart > 55 },
    { label: '执行', active: smart > 78 },
    { label: '出纸', active: smart >= 100 },
  ]
  return (
    <div className="process-visual-stage story-visual future-visual" style={stageStyle(state.progress)}>
      <div className="future-bg-split" aria-hidden="true">
        <span style={{ backgroundImage: `url("${assets.backgrounds.ecoPaperMill}")` }} />
        <span style={{ backgroundImage: `url("${assets.backgrounds.smartPaperFactory}")` }} />
      </div>
      {recycleStage === 'waste' && <AssetImage src={assets.props.wastePaper} alt="废纸" className={`waste-paper ${recycle > 0 ? 'is-moving' : ''}`} fallback={<CssProp label="废纸" className="waste-paper" />} />}
      {recycle < 100 && <AssetImage src={assets.props.recycleBin} alt="回收箱" className="recycle-bin" fallback={<CssProp label="回收" className="recycle-bin" />} />}
      {recycleStage === 'shredded' && <AssetImage src={assets.props.shreddedPaper} decorative className="shredded-paper active" />}
      {recycleStage === 'recycled' || recycleStage === 'clean' ? <AssetImage src={assets.props.recycledPaper} alt="再生纸" className="recycled-paper active" fallback={<CssPaper className="recycled-paper" />} /> : null}
      <AssetImage src={assets.props.waterTreatmentPool} alt="污水处理池" className={`water-treatment ${recycle >= 100 ? 'is-clean' : ''}`} />
      <div className="smart-control-card" aria-label="智能造纸控制流程">
        <AssetImage src={assets.icons.controlPanel} alt="智能控制面板" className={`control-panel-img ${smart > 30 ? 'active' : ''}`} />
        <div className="smart-signal-chain">
          {smartSteps.map((step, index) => (
            <span key={step.label} className={step.active ? 'active' : ''}>
              <i>{index + 1}</i>
              {step.label}
            </span>
          ))}
        </div>
      </div>
      <AssetImage src={assets.props.roboticArm} decorative className={`robotic-arm ${smart > 70 ? 'active' : ''}`} />
      <AssetImage src={assets.props.greenPaperLine} decorative className={`green-line ${smart >= 100 ? 'active' : ''}`} />
      <div className="future-labels">
        <span className={recycle >= 100 ? 'active' : ''}>循环利用</span>
        <span className={recycle >= 100 ? 'active' : ''}>节约资源</span>
        <span className={smart >= 100 ? 'active' : ''}>智能控制</span>
      </div>
      <p className="stage-caption">{state.completed ? scene.completionText : '左侧推进环保回收，右侧调节智能控制参数。'}</p>
    </div>
  )
}

export function LegacyVisual({ state, assets, scene }: ProcessVisualProps) {
  const unlocked = state.unlockedCards ?? []
  return (
    <div className="process-visual-stage story-visual legacy-visual" style={stageStyle(state.progress)}>
      <SceneBackdrop src={assets.backgrounds.legacyFuture} />
      <AssetImage src={assets.papers.finalStack} decorative className="legacy-paper-stack" fallback={<CssPaper className="legacy-paper-stack" />} />
      <AssetImage src={assets.props.books} alt="书籍" className={`legacy-books ${unlocked.includes('文明传播') ? 'active' : ''}`} />
      <AssetImage src={assets.props.bookDark} decorative className={`legacy-book dark ${unlocked.includes('文明传播') ? 'active' : ''}`} />
      <AssetImage src={assets.props.bookKraft} decorative className={`legacy-book kraft ${unlocked.includes('文明传播') ? 'active' : ''}`} />
      <AssetImage src={assets.props.calligraphyScroll} alt="字画" className={`legacy-scroll ${unlocked.includes('古法匠心') ? 'active' : ''}`} />
      <AssetImage src={assets.papers.bambooPainting} decorative className={`legacy-scroll side bamboo ${unlocked.includes('古法匠心') ? 'active' : ''}`} />
      <AssetImage src={assets.papers.plumScroll} decorative className={`legacy-scroll side plum ${unlocked.includes('古法匠心') ? 'active' : ''}`} />
      <div className={`legacy-green-ribbon ${hasFlag(state, 'inkSpread') ? 'active' : ''}`} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="legacy-card-lights">
        {legacyCards.map((card) => (
          <span key={card} className={unlocked.includes(card) ? 'active' : ''}>
            {card}
          </span>
        ))}
      </div>
      <div className={`legacy-slogan ${state.completed ? 'active' : ''}`}>
        <strong>纸韵千年，薪火相传</strong>
        <span>传承古法匠心，创新未来造纸</span>
      </div>
      <p className="stage-caption">{state.completed ? scene.completionText : '点亮四张总结卡，连接古法、文明、环保与智能。'}</p>
    </div>
  )
}
