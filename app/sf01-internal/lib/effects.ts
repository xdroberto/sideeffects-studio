import type { Effect } from '@/lib/shaders/sf01/types'
import { moire } from '@/lib/shaders/sf01/moire'
import { reactionDiffusion } from '@/lib/shaders/sf01/reactionDiffusion'
import { domainWarping } from '@/lib/shaders/sf01/domainWarping'
import { raymarchSDF } from '@/lib/shaders/sf01/raymarchSDF'
import { voronoi } from '@/lib/shaders/sf01/voronoi'

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
