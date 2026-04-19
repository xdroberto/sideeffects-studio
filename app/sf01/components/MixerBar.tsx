'use client'

import { RotateCcw } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { effects } from '../lib/effects'
import { BLEND_MODES, type BlendMode } from '../lib/blend'

type Props = {
  deckAId: string
  deckBId: string
  onDeckAChange: (id: string) => void
  onDeckBChange: (id: string) => void
  crossfade: number
  onCrossfadeChange: (v: number) => void
  blendMode: BlendMode
  onBlendModeChange: (b: BlendMode) => void
  gainA: number
  onGainAChange: (v: number) => void
  gainB: number
  onGainBChange: (v: number) => void
  deckAHasFeedback: boolean
  deckBHasFeedback: boolean
  onResetA: () => void
  onResetB: () => void
  activeDeck: 'A' | 'B'
  onActiveDeckChange: (d: 'A' | 'B') => void
}

export function MixerBar({
  deckAId,
  deckBId,
  onDeckAChange,
  onDeckBChange,
  crossfade,
  onCrossfadeChange,
  blendMode,
  onBlendModeChange,
  gainA,
  onGainAChange,
  gainB,
  onGainBChange,
  deckAHasFeedback,
  deckBHasFeedback,
  onResetA,
  onResetB,
  activeDeck,
  onActiveDeckChange,
}: Props) {
  return (
    <div className="shrink-0 grid grid-cols-[minmax(240px,1fr)_minmax(320px,2fr)_minmax(240px,1fr)] gap-0 border-b border-white/10 bg-white/[0.02] font-mono">
      <DeckSection
        label="Deck A"
        effectId={deckAId}
        onEffectChange={onDeckAChange}
        gain={gainA}
        onGainChange={onGainAChange}
        hasFeedback={deckAHasFeedback}
        onReset={onResetA}
        isActive={activeDeck === 'A'}
        onActivate={() => onActiveDeckChange('A')}
        side="left"
      />

      <div className="flex flex-col justify-center gap-2 px-5 py-3 border-x border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-[9px] uppercase tracking-[0.25em] text-white/40 w-3">A</span>
          <div className="flex-1 relative">
            <Slider
              value={[crossfade]}
              min={0}
              max={1}
              step={0.005}
              onValueChange={([n]) => onCrossfadeChange(n)}
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-4 bg-white/20 pointer-events-none" />
          </div>
          <span className="text-[9px] uppercase tracking-[0.25em] text-white/40 w-3 text-right">B</span>
        </div>

        <div className="flex items-center gap-3 justify-between">
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
            Crossfade
          </span>
          <span className="tabular-nums text-[10px] text-white/60">
            {crossfade.toFixed(2)}
          </span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 ml-auto">
            Blend
          </span>
          <Select
            value={blendMode}
            onValueChange={(v) => onBlendModeChange(v as BlendMode)}
          >
            <SelectTrigger className="w-32 h-7 bg-black border-white/20 text-white font-mono text-[10px] uppercase tracking-[0.15em]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black border-white/20 text-white font-mono">
              {BLEND_MODES.map((m) => (
                <SelectItem
                  key={m.id}
                  value={m.id}
                  className="text-white focus:bg-white/10 focus:text-white text-[11px]"
                >
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DeckSection
        label="Deck B"
        effectId={deckBId}
        onEffectChange={onDeckBChange}
        gain={gainB}
        onGainChange={onGainBChange}
        hasFeedback={deckBHasFeedback}
        onReset={onResetB}
        isActive={activeDeck === 'B'}
        onActivate={() => onActiveDeckChange('B')}
        side="right"
      />
    </div>
  )
}

function DeckSection({
  label,
  effectId,
  onEffectChange,
  gain,
  onGainChange,
  hasFeedback,
  onReset,
  isActive,
  onActivate,
  side,
}: {
  label: string
  effectId: string
  onEffectChange: (id: string) => void
  gain: number
  onGainChange: (v: number) => void
  hasFeedback: boolean
  onReset: () => void
  isActive: boolean
  onActivate: () => void
  side: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={`flex flex-col gap-2 px-4 py-3 text-left transition-colors ${
        isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] uppercase tracking-[0.22em] ${
            isActive ? 'text-lime-400' : 'text-white/40'
          }`}
        >
          {isActive && '▸ '}
          {label}
        </span>
        {hasFeedback && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onReset()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                onReset()
              }
            }}
            className="flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-red-400 border border-red-400/40 hover:text-red-300 hover:border-red-400/80 transition-colors cursor-pointer"
          >
            <RotateCcw size={10} />
            Reset
          </span>
        )}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <Select value={effectId} onValueChange={onEffectChange}>
          <SelectTrigger className="w-full h-8 bg-black border-white/20 text-white font-mono text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-black border-white/20 text-white font-mono">
            {effects.map((e) => (
              <SelectItem
                key={e.id}
                value={e.id}
                className="text-white focus:bg-white/10 focus:text-white"
              >
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className="flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 w-10">
          Gain
        </span>
        <div className="flex-1">
          <Slider
            value={[gain]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([n]) => onGainChange(n)}
          />
        </div>
        <span className="tabular-nums text-[10px] text-white/50 w-8 text-right">
          {gain.toFixed(2)}
        </span>
      </div>
    </button>
  )
}
