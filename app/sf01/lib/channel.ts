import type { PatchValues } from './types'
import type { AudioBands } from '../hooks/useAudioSource'
import type { OverlayState } from './overlay'
import type { BlendMode } from './blend'

export const SESSION_CHANNEL = 'sf01-session'

export type DeckSnapshot = {
  effectId: string
  values: PatchValues
  resetKey: number
}

export type SoloSession = {
  mode: 'solo'
  effectId: string
  values: PatchValues
  resetKey: number
}

export type MixSession = {
  mode: 'mix'
  deckA: DeckSnapshot
  deckB: DeckSnapshot
  crossfade: number
  blendMode: BlendMode
  gainA: number
  gainB: number
}

export type Session = SoloSession | MixSession

export type PatchMessage =
  | ({ type: 'state'; overlay: OverlayState; epoch: number } & Session)
  | {
      type: 'audio'
      audio: AudioBands
      epoch: number
    }
  | { type: 'request-state' }
  | { type: 'output-opened' }
  | { type: 'output-closed' }
