import { processAssets } from '../../assets/process/processAssetMap'
import type { ProcessSceneId } from '../process/types'

export type PageBackgroundVariant = 'home' | 'process' | 'quiz' | 'report' | 'video' | 'teacher' | 'student'

type PageBackgroundProps = {
  variant: PageBackgroundVariant
  sceneId?: ProcessSceneId
}

const processSceneBackgrounds: Record<ProcessSceneId, string> = {
  history: processAssets.backgrounds.historyTimeline,
  cai_lun: processAssets.backgrounds.ancientWorkshop,
  preparation: processAssets.backgrounds.preparationTable,
  steaming: processAssets.backgrounds.steamingStove,
  pulping: processAssets.backgrounds.pulpingTable,
  sheet_forming: processAssets.backgrounds.sheetFormingVat,
  drying: processAssets.backgrounds.dryingYard,
  finishing: processAssets.backgrounds.cuttingTable,
  future: processAssets.backgrounds.smartPaperFactory,
  legacy: processAssets.backgrounds.legacyFuture,
}

const variantBackgrounds: Partial<Record<PageBackgroundVariant, string>> = {
  home: processAssets.backgrounds.ancientWorkshop,
  video: processAssets.backgrounds.legacyFuture,
  report: processAssets.backgrounds.cuttingTable,
  teacher: processAssets.backgrounds.preparationTable,
}

export function PageBackground({ variant, sceneId }: PageBackgroundProps) {
  const image = variant === 'process' && sceneId ? processSceneBackgrounds[sceneId] : variantBackgrounds[variant]
  return (
    <div
      className={`page-background ${variant}`}
      style={image ? { backgroundImage: `url("${image}")` } : undefined}
      aria-hidden="true"
    />
  )
}
