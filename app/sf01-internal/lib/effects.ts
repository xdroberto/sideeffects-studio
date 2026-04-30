import type { Effect } from './types'
import { moire } from './shaders/moire'
import { reactionDiffusion } from './shaders/reactionDiffusion'
import { domainWarping } from './shaders/domainWarping'
import { raymarchSDF } from './shaders/raymarchSDF'
import { voronoi } from './shaders/voronoi'

export const effects: Effect[] = [
  moire,
  reactionDiffusion,
  domainWarping,
  raymarchSDF,
  voronoi,
]

export function getEffectById(id: string): Effect | undefined {
  return effects.find((e) => e.id === id)
}
