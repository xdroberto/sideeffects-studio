'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SESSION_CHANNEL,
  type PatchMessage,
  type Session,
} from '../lib/channel'
import type { AudioBands } from './useAudioSource'
import type { OverlayState } from '../lib/overlay'

type Args = {
  session: Session
  overlay: OverlayState
  audioActive?: boolean
  getAudioBands?: () => AudioBands
}

export function usePublishPatch({ session, overlay, audioActive, getAudioBands }: Args) {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const stateRef = useRef<{ session: Session; overlay: OverlayState }>({
    session,
    overlay,
  })
  const [outputAlive, setOutputAlive] = useState(false)

  useEffect(() => {
    stateRef.current = { session, overlay }
  }, [session, overlay])

  const publishState = useCallback(() => {
    const ch = channelRef.current
    if (!ch) return
    const s = stateRef.current
    ch.postMessage({
      type: 'state',
      ...s.session,
      overlay: s.overlay,
      epoch: Date.now(),
    } satisfies PatchMessage)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel(SESSION_CHANNEL)
    channelRef.current = ch

    const onMessage = (e: MessageEvent<PatchMessage>) => {
      const msg = e.data
      if (msg.type === 'request-state') {
        publishState()
      } else if (msg.type === 'output-opened') {
        setOutputAlive(true)
        publishState()
      } else if (msg.type === 'output-closed') {
        setOutputAlive(false)
      }
    }
    ch.addEventListener('message', onMessage)

    return () => {
      ch.removeEventListener('message', onMessage)
      ch.close()
      channelRef.current = null
    }
  }, [publishState])

  useEffect(() => {
    publishState()
  }, [session, overlay, publishState])

  useEffect(() => {
    if (!audioActive || !getAudioBands) return
    const ch = channelRef.current
    if (!ch) return
    let raf = 0
    const tick = () => {
      const bands = getAudioBands()
      ch.postMessage({
        type: 'audio',
        audio: bands,
        epoch: Date.now(),
      } satisfies PatchMessage)
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [audioActive, getAudioBands])

  return { outputAlive }
}
