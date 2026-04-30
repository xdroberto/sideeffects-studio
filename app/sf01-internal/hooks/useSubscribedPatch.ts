'use client'

import { useEffect, useRef, useState } from 'react'
import { effects, getEffectById } from '../lib/effects'
import { SESSION_CHANNEL, type PatchMessage } from '../lib/channel'
import type { Effect, PatchValues } from '../lib/types'
import type { BlendMode } from '../lib/blend'
import { ZERO_BANDS, type AudioBands } from './useAudioSource'
import { DEFAULT_OVERLAY, type OverlayState } from '../lib/overlay'

type DeckRuntime = {
  effect: Effect
  values: PatchValues
  resetKey: number
}

type SubscribedSolo = {
  mode: 'solo'
  effect: Effect
  values: PatchValues
  resetKey: number
  overlay: OverlayState
}

type SubscribedMix = {
  mode: 'mix'
  deckA: DeckRuntime
  deckB: DeckRuntime
  crossfade: number
  blendMode: BlendMode
  gainA: number
  gainB: number
  overlay: OverlayState
}

export type SubscribedState = SubscribedSolo | SubscribedMix

function resolveEffect(id: string): Effect {
  return getEffectById(id) ?? effects[0]
}

export function useSubscribedPatch(): {
  state: SubscribedState | null
  audioRef: React.MutableRefObject<AudioBands>
} {
  const [state, setState] = useState<SubscribedState | null>(null)
  const audioRef = useRef<AudioBands>({ ...ZERO_BANDS })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined')
      return
    const ch = new BroadcastChannel(SESSION_CHANNEL)

    const onMessage = (e: MessageEvent<PatchMessage>) => {
      const msg = e.data
      if (msg.type === 'state') {
        if (msg.mode === 'solo') {
          setState({
            mode: 'solo',
            effect: resolveEffect(msg.effectId),
            values: msg.values,
            resetKey: msg.resetKey,
            overlay: msg.overlay ?? DEFAULT_OVERLAY,
          })
        } else {
          setState({
            mode: 'mix',
            deckA: {
              effect: resolveEffect(msg.deckA.effectId),
              values: msg.deckA.values,
              resetKey: msg.deckA.resetKey,
            },
            deckB: {
              effect: resolveEffect(msg.deckB.effectId),
              values: msg.deckB.values,
              resetKey: msg.deckB.resetKey,
            },
            crossfade: msg.crossfade,
            blendMode: msg.blendMode,
            gainA: msg.gainA,
            gainB: msg.gainB,
            overlay: msg.overlay ?? DEFAULT_OVERLAY,
          })
        }
      } else if (msg.type === 'audio') {
        audioRef.current = msg.audio
      }
    }
    ch.addEventListener('message', onMessage)

    ch.postMessage({ type: 'output-opened' } satisfies PatchMessage)
    ch.postMessage({ type: 'request-state' } satisfies PatchMessage)

    const onBeforeUnload = () => {
      ch.postMessage({ type: 'output-closed' } satisfies PatchMessage)
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      ch.postMessage({ type: 'output-closed' } satisfies PatchMessage)
      window.removeEventListener('beforeunload', onBeforeUnload)
      ch.removeEventListener('message', onMessage)
      ch.close()
    }
  }, [])

  return { state, audioRef }
}
