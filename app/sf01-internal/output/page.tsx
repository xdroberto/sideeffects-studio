'use client'

import { useEffect, useState } from 'react'
import { ClientOnly } from '@/components/client-only'
import { SynthCanvas } from '../components/SynthCanvas'
import { MixCanvas } from '../components/MixCanvas'
import { TextOverlay } from '../components/TextOverlay'
import { useSubscribedPatch } from '../hooks/useSubscribedPatch'

export default function OutputPage() {
  const { state, audioRef } = useSubscribedPatch()
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        } else {
          document.documentElement.requestFullscreen().catch(() => {})
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const showCursor = () => {
      document.body.style.cursor = 'default'
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        document.body.style.cursor = 'none'
      }, 1500)
    }
    showCursor()
    window.addEventListener('mousemove', showCursor)
    return () => {
      window.removeEventListener('mousemove', showCursor)
      clearTimeout(timeout)
      document.body.style.cursor = 'default'
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {state ? (
        <>
          <ClientOnly>
            {state.mode === 'solo' ? (
              <SynthCanvas
                effect={state.effect}
                values={state.values}
                resetKey={state.resetKey}
                audioRef={audioRef}
              />
            ) : (
              <MixCanvas
                deckA={state.deckA}
                deckB={state.deckB}
                crossfade={state.crossfade}
                blendMode={state.blendMode}
                gainA={state.gainA}
                gainB={state.gainB}
                audioRef={audioRef}
              />
            )}
          </ClientOnly>
          <TextOverlay overlay={state.overlay} />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
          waiting for control window…
        </div>
      )}

      {!isFullscreen && state && (
        <div className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30 pointer-events-none select-none flex items-center gap-3">
          <span>press F for fullscreen</span>
          <span className="text-white/20">·</span>
          <span className="text-white/50">
            {state.mode === 'mix' ? 'MIX' : state.effect.name.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}
