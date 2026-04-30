'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Nav } from '@/components/nav'
import { ClientOnly } from '@/components/client-only'
import { effects, getEffectById } from './lib/effects'
import { DEFAULT_OVERLAY, type OverlayState } from './lib/overlay'
import { usePatchState } from './hooks/usePatchState'
import { usePublishPatch } from './hooks/usePublishPatch'
import { useAudioSource, type UseAudioSourceReturn } from './hooks/useAudioSource'
import type { Effect, PatchValues } from './lib/types'
import type { BlendMode } from './lib/blend'
import { SynthCanvas } from './components/SynthCanvas'
import { MixCanvas } from './components/MixCanvas'
import { ControlPanel } from './components/ControlPanel'
import { EffectPicker } from './components/EffectPicker'
import { OutputControl } from './components/OutputControl'
import { AudioPanel } from './components/AudioPanel'
import { OverlayPanel } from './components/OverlayPanel'
import { TextOverlay } from './components/TextOverlay'
import { ModeToggle } from './components/ModeToggle'
import { MixerBar } from './components/MixerBar'

type Mode = 'solo' | 'mix'

export default function SF01() {
  const [mode, setMode] = useState<Mode>('solo')
  const [outputOpen, setOutputOpen] = useState(false)
  const [overlay, setOverlayState] = useState<OverlayState>(DEFAULT_OVERLAY)

  // Solo mode state
  const [soloEffectId, setSoloEffectId] = useState<string>(effects[0].id)
  const [soloResetKey, setSoloResetKey] = useState(0)
  const soloEffect = getEffectById(soloEffectId) ?? effects[0]
  const { values: soloValues, setUniform: setSoloUniform } = usePatchState(soloEffect)

  // Mix mode state
  const [deckAId, setDeckAId] = useState<string>(effects[0].id)
  const [deckBId, setDeckBId] = useState<string>(effects[1]?.id ?? effects[0].id)
  const deckAEffect = getEffectById(deckAId) ?? effects[0]
  const deckBEffect = getEffectById(deckBId) ?? effects[0]
  const { values: deckAValues, setUniform: setDeckAUniform } = usePatchState(deckAEffect)
  const { values: deckBValues, setUniform: setDeckBUniform } = usePatchState(deckBEffect)
  const [deckAResetKey, setDeckAResetKey] = useState(0)
  const [deckBResetKey, setDeckBResetKey] = useState(0)
  const [crossfade, setCrossfade] = useState(0.5)
  const [blendMode, setBlendMode] = useState<BlendMode>('crossfade')
  const [gainA, setGainA] = useState(1)
  const [gainB, setGainB] = useState(1)
  const [activeDeck, setActiveDeck] = useState<'A' | 'B'>('A')

  const audio = useAudioSource()

  const setOverlay = useCallback((patch: Partial<OverlayState>) => {
    setOverlayState((prev) => ({ ...prev, ...patch }))
  }, [])

  // Active controls (what the ControlPanel edits)
  const active = useMemo(() => {
    if (mode === 'solo') {
      return {
        effect: soloEffect,
        values: soloValues,
        setUniform: setSoloUniform,
      }
    }
    if (activeDeck === 'A') {
      return {
        effect: deckAEffect,
        values: deckAValues,
        setUniform: setDeckAUniform,
      }
    }
    return {
      effect: deckBEffect,
      values: deckBValues,
      setUniform: setDeckBUniform,
    }
  }, [
    mode,
    activeDeck,
    soloEffect,
    soloValues,
    setSoloUniform,
    deckAEffect,
    deckAValues,
    setDeckAUniform,
    deckBEffect,
    deckBValues,
    setDeckBUniform,
  ])

  // Full session object to publish to the output window
  const session = useMemo<import('./lib/channel').Session>(() => {
    if (mode === 'solo') {
      return {
        mode: 'solo',
        effectId: soloEffectId,
        values: soloValues,
        resetKey: soloResetKey,
      }
    }
    return {
      mode: 'mix',
      deckA: { effectId: deckAId, values: deckAValues, resetKey: deckAResetKey },
      deckB: { effectId: deckBId, values: deckBValues, resetKey: deckBResetKey },
      crossfade,
      blendMode,
      gainA,
      gainB,
    }
  }, [
    mode,
    soloEffectId,
    soloValues,
    soloResetKey,
    deckAId,
    deckAValues,
    deckAResetKey,
    deckBId,
    deckBValues,
    deckBResetKey,
    crossfade,
    blendMode,
    gainA,
    gainB,
  ])

  usePublishPatch({
    session,
    overlay,
    audioActive: audio.isActive,
    getAudioBands: audio.getBands,
  })

  const doReset = useCallback(() => {
    if (mode === 'solo') {
      setSoloResetKey((k) => k + 1)
    } else if (activeDeck === 'A') {
      setDeckAResetKey((k) => k + 1)
    } else {
      setDeckBResetKey((k) => k + 1)
    }
  }, [mode, activeDeck])

  const resetDeckA = useCallback(() => setDeckAResetKey((k) => k + 1), [])
  const resetDeckB = useCallback(() => setDeckBResetKey((k) => k + 1), [])

  useEffect(() => {
    if (!active.effect.feedback) return
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        doReset()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active.effect.feedback, doReset])

  const deckA = useMemo(
    () => ({ effect: deckAEffect, values: deckAValues, resetKey: deckAResetKey }),
    [deckAEffect, deckAValues, deckAResetKey]
  )
  const deckB = useMemo(
    () => ({ effect: deckBEffect, values: deckBValues, resetKey: deckBResetKey }),
    [deckBEffect, deckBValues, deckBResetKey]
  )

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <Nav />

      <div className="flex-1 flex flex-col min-h-0 relative">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0 bg-black">
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-white/50">
            SF-01
          </span>
          <div className="h-4 w-px bg-white/15" />
          <ModeToggle mode={mode} onChange={setMode} />
          <div className="h-4 w-px bg-white/15" />
          {mode === 'solo' ? (
            <EffectPicker currentId={soloEffectId} onChange={setSoloEffectId} />
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Editing: Deck {activeDeck} · {active.effect.name}
            </span>
          )}
          {active.effect.feedback && (
            <button
              type="button"
              onClick={doReset}
              title={`Reset ${mode === 'mix' ? `Deck ${activeDeck}` : ''} (R)`}
              className="flex items-center gap-2 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] bg-red-600 hover:bg-red-500 text-white border border-red-400/50 shadow-[0_0_10px_rgba(239,68,68,0.35)] transition-all active:scale-95"
            >
              <RotateCcw size={12} />
              Reset
              <span className="text-[9px] opacity-50 ml-0.5">[R]</span>
            </button>
          )}
          <div className="ml-auto">
            <OutputControl isOpen={outputOpen} setIsOpen={setOutputOpen} />
          </div>
        </header>

        {mode === 'mix' && (
          <MixerBar
            deckAId={deckAId}
            deckBId={deckBId}
            onDeckAChange={setDeckAId}
            onDeckBChange={setDeckBId}
            crossfade={crossfade}
            onCrossfadeChange={setCrossfade}
            blendMode={blendMode}
            onBlendModeChange={setBlendMode}
            gainA={gainA}
            onGainAChange={setGainA}
            gainB={gainB}
            onGainBChange={setGainB}
            deckAHasFeedback={!!deckAEffect.feedback}
            deckBHasFeedback={!!deckBEffect.feedback}
            onResetA={resetDeckA}
            onResetB={resetDeckB}
            activeDeck={activeDeck}
            onActiveDeckChange={setActiveDeck}
          />
        )}

        <SystemBar
          audio={audio}
          activeEffectName={active.effect.name}
          overlay={overlay}
          outputOpen={outputOpen}
          mode={mode}
          mixInfo={
            mode === 'mix'
              ? {
                  deckA: deckAEffect.name,
                  deckB: deckBEffect.name,
                  crossfade,
                  blendMode,
                }
              : null
          }
        />

        {outputOpen ? (
          <ExpandedLayout
            audio={audio}
            overlay={overlay}
            setOverlay={setOverlay}
            effect={active.effect}
            values={active.values}
            setUniform={active.setUniform}
            mode={mode}
            activeDeck={activeDeck}
          />
        ) : (
          <StandardLayout
            audio={audio}
            overlay={overlay}
            setOverlay={setOverlay}
            mode={mode}
            soloEffect={soloEffect}
            soloValues={soloValues}
            soloResetKey={soloResetKey}
            deckA={deckA}
            deckB={deckB}
            crossfade={crossfade}
            blendMode={blendMode}
            gainA={gainA}
            gainB={gainB}
            activeDeck={activeDeck}
            controlEffect={active.effect}
            controlValues={active.values}
            controlSetUniform={active.setUniform}
          />
        )}
      </div>
    </div>
  )
}

type StandardProps = {
  audio: UseAudioSourceReturn
  overlay: OverlayState
  setOverlay: (patch: Partial<OverlayState>) => void
  mode: Mode
  soloEffect: Effect
  soloValues: PatchValues
  soloResetKey: number
  deckA: { effect: Effect; values: PatchValues; resetKey: number }
  deckB: { effect: Effect; values: PatchValues; resetKey: number }
  crossfade: number
  blendMode: BlendMode
  gainA: number
  gainB: number
  activeDeck: 'A' | 'B'
  controlEffect: Effect
  controlValues: PatchValues
  controlSetUniform: (name: string, value: number | [number, number, number]) => void
}

function StandardLayout({
  audio,
  overlay,
  setOverlay,
  mode,
  soloEffect,
  soloValues,
  soloResetKey,
  deckA,
  deckB,
  crossfade,
  blendMode,
  gainA,
  gainB,
  activeDeck,
  controlEffect,
  controlValues,
  controlSetUniform,
}: StandardProps) {
  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 relative overflow-hidden">
        <ClientOnly>
          {mode === 'solo' ? (
            <SynthCanvas
              effect={soloEffect}
              values={soloValues}
              resetKey={soloResetKey}
              audioRef={audio.bandsRef}
            />
          ) : (
            <MixCanvas
              deckA={deckA}
              deckB={deckB}
              crossfade={crossfade}
              blendMode={blendMode}
              gainA={gainA}
              gainB={gainB}
              audioRef={audio.bandsRef}
            />
          )}
        </ClientOnly>
        <TextOverlay overlay={overlay} />
      </div>

      <aside className="flex flex-col w-[340px] shrink-0 border-l border-white/10 overflow-y-auto bg-black">
        <AudioPanel audio={audio} />
        <OverlayPanel overlay={overlay} setOverlay={setOverlay} />
        {mode === 'mix' && (
          <div className="px-4 py-2 bg-white/[0.015] border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.2em]">
            <span className="text-white/40">Editing </span>
            <span className="text-lime-400">Deck {activeDeck}</span>
          </div>
        )}
        <ControlPanel
          effect={controlEffect}
          values={controlValues}
          setUniform={controlSetUniform}
        />
      </aside>
    </div>
  )
}

type ExpandedProps = {
  audio: UseAudioSourceReturn
  overlay: OverlayState
  setOverlay: (patch: Partial<OverlayState>) => void
  effect: Effect
  values: PatchValues
  setUniform: (name: string, value: number | [number, number, number]) => void
  mode: Mode
  activeDeck: 'A' | 'B'
}

function ExpandedLayout({
  audio,
  overlay,
  setOverlay,
  effect,
  values,
  setUniform,
  mode,
  activeDeck,
}: ExpandedProps) {
  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(320px,1fr)_minmax(320px,1fr)_minmax(380px,1.3fr)] min-h-0 bg-black">
      <div className="overflow-y-auto border-r border-white/10">
        <AudioPanel audio={audio} />
      </div>
      <div className="overflow-y-auto border-r border-white/10">
        <OverlayPanel overlay={overlay} setOverlay={setOverlay} />
      </div>
      <div className="overflow-y-auto">
        {mode === 'mix' && (
          <div className="px-4 py-2 bg-white/[0.015] border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.2em]">
            <span className="text-white/40">Editing </span>
            <span className="text-lime-400">Deck {activeDeck}</span>
          </div>
        )}
        <ControlPanel effect={effect} values={values} setUniform={setUniform} />
      </div>
    </div>
  )
}

function SystemBar({
  audio,
  activeEffectName,
  overlay,
  outputOpen,
  mode,
  mixInfo,
}: {
  audio: UseAudioSourceReturn
  activeEffectName: string
  overlay: OverlayState
  outputOpen: boolean
  mode: Mode
  mixInfo: { deckA: string; deckB: string; crossfade: number; blendMode: BlendMode } | null
}) {
  return (
    <div className="shrink-0 flex items-center gap-4 px-4 py-1.5 bg-white/[0.02] border-b border-white/5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40 overflow-x-auto">
      <StatusCell label="Mode" value={mode === 'mix' ? 'MIX' : 'SOLO'} highlight={mode === 'mix'} />
      <StatusCell
        label="Out"
        value={outputOpen ? 'EXT WINDOW' : 'LOCAL'}
        highlight={outputOpen}
      />
      <StatusCell
        label="Audio"
        value={
          audio.source === 'mic'
            ? 'MIC'
            : audio.source === 'file'
              ? 'FILE'
              : 'OFF'
        }
        highlight={audio.isActive}
      />
      {mixInfo ? (
        <>
          <StatusCell label="A" value={mixInfo.deckA} />
          <StatusCell
            label="xFade"
            value={mixInfo.crossfade.toFixed(2)}
            highlight
          />
          <StatusCell label="B" value={mixInfo.deckB} />
          <StatusCell label="Blend" value={mixInfo.blendMode.toUpperCase()} />
        </>
      ) : (
        <StatusCell label="Effect" value={activeEffectName} />
      )}
      <StatusCell
        label="Overlay"
        value={overlay.enabled ? 'ON' : 'OFF'}
        highlight={overlay.enabled}
      />
      <span className="ml-auto text-[9px] text-white/25">SF-01 · v0.3</span>
    </div>
  )
}

function StatusCell({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span className="text-white/30">{label}</span>
      <span
        className={`tabular-nums ${
          highlight ? 'text-lime-400' : 'text-white/70'
        }`}
      >
        {value}
      </span>
    </span>
  )
}
