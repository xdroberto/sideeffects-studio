'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, FileAudio, Power } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import type { UseAudioSourceReturn } from '../hooks/useAudioSource'

type Props = { audio: UseAudioSourceReturn }

export function AudioPanel({ audio }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sourceLabel =
    audio.source === 'mic'
      ? 'MIC · LIVE'
      : audio.source === 'file'
        ? `FILE · ${audio.fileName ?? ''}`
        : 'NO SIGNAL'

  const statusDot =
    audio.source === 'mic'
      ? 'bg-lime-400'
      : audio.source === 'file'
        ? 'bg-amber-300'
        : 'bg-white/20'

  return (
    <section className="flex flex-col font-mono">
      <PanelHeader title="Audio Input" badge={
        <span className="flex items-center gap-1.5 max-w-[200px] truncate">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusDot}`} />
          <span className="truncate" title={sourceLabel}>{sourceLabel}</span>
        </span>
      } />

      <div className="px-4 py-3 flex flex-col gap-3 border-b border-white/5">
        <div className="grid grid-cols-3 gap-px bg-white/10">
          <SourceButton
            active={audio.source === 'mic'}
            onClick={audio.requestMic}
            icon={<Mic size={11} />}
            label="Mic"
          />
          <SourceButton
            active={audio.source === 'file'}
            onClick={() => fileInputRef.current?.click()}
            icon={<FileAudio size={11} />}
            label="File"
          />
          <SourceButton
            active={audio.source === 'none'}
            onClick={audio.stop}
            icon={<Power size={11} />}
            label="Off"
            variant="off"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) audio.loadFile(f)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
        />

        {audio.error && (
          <div className="text-[10px] text-red-400 leading-snug border-l-2 border-red-400 pl-2 py-1 bg-red-400/5">
            {audio.error}
          </div>
        )}
      </div>

      <HorizontalVU getBands={audio.getBands} active={audio.isActive} />

      <div className="px-4 py-3 flex flex-col gap-2 border-b border-white/5">
        <TightSlider
          label="Sensitivity"
          value={audio.sensitivity}
          min={0.2}
          max={3}
          step={0.05}
          onChange={audio.setSensitivity}
        />
        <TightSlider
          label="Smoothing"
          value={audio.smoothing}
          min={0}
          max={0.95}
          step={0.01}
          onChange={audio.setSmoothing}
        />
      </div>

      <div className="px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-white/20">
        FFT 256 · 4 BANDS · 48kHz
      </div>
    </section>
  )
}

function PanelHeader({
  title,
  badge,
  right,
}: {
  title: string
  badge?: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.015]">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/50 shrink-0">
          {title}
        </span>
        {badge && (
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/70 min-w-0">
            {badge}
          </span>
        )}
      </div>
      {right}
    </div>
  )
}

function SourceButton({
  active,
  onClick,
  icon,
  label,
  variant,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  variant?: 'off'
}) {
  const activeClass = variant === 'off'
    ? 'bg-white/15 text-white'
    : 'bg-lime-400 text-black shadow-[inset_0_0_0_1px_rgba(163,230,53,0.6)]'
  const idleClass = 'bg-black text-white/60 hover:bg-white/5 hover:text-white'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors ${
        active ? activeClass : idleClass
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function HorizontalVU({
  getBands,
  active,
}: {
  getBands: () => { low: number; mid: number; high: number; level: number }
  active: boolean
}) {
  const [state, setState] = useState<{
    vals: [number, number, number, number]
    peaks: [number, number, number, number]
  }>({ vals: [0, 0, 0, 0], peaks: [0, 0, 0, 0] })

  useEffect(() => {
    if (!active) {
      setState({ vals: [0, 0, 0, 0], peaks: [0, 0, 0, 0] })
      return
    }
    let raf = 0
    let last = 0
    const peakRef: [number, number, number, number] = [0, 0, 0, 0]
    const decayRef: [number, number, number, number] = [0, 0, 0, 0]
    const tick = (t: number) => {
      if (t - last > 33) {
        const b = getBands()
        const vals: [number, number, number, number] = [b.low, b.mid, b.high, b.level]
        for (let i = 0; i < 4; i++) {
          if (vals[i] > peakRef[i]) {
            peakRef[i] = vals[i]
            decayRef[i] = 0
          } else {
            decayRef[i] += 0.016
            peakRef[i] = Math.max(vals[i], peakRef[i] - decayRef[i] * decayRef[i])
          }
        }
        setState({ vals, peaks: [...peakRef] })
        last = t
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, getBands])

  const labels: [string, string, string, string] = ['LOW', 'MID', 'HI ', 'LVL']

  return (
    <div className="flex flex-col gap-0 py-2 px-4 border-b border-white/5">
      {labels.map((label, i) => (
        <VURow
          key={label}
          label={label}
          value={state.vals[i]}
          peak={state.peaks[i]}
        />
      ))}
    </div>
  )
}

function VURow({ label, value, peak }: { label: string; value: number; peak: number }) {
  return (
    <div className="grid grid-cols-[36px_1fr_40px_36px] items-center gap-2 py-[3px] text-[9px]">
      <span className="uppercase tracking-[0.2em] text-white/40 tabular-nums">{label}</span>
      <div className="relative h-2 bg-white/5 overflow-hidden">
        <div
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-lime-400 via-amber-300 to-red-400"
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]"
          style={{ left: `${Math.min(99.5, peak * 100)}%` }}
        />
        <div className="absolute inset-y-0 left-[20%] w-px bg-amber-400/30 pointer-events-none" />
      </div>
      <span className="tabular-nums text-white/50 text-right">
        {value.toFixed(2)}
      </span>
      <span className="tabular-nums text-white/25 text-right text-[9px]">
        {peak.toFixed(2)}
      </span>
    </div>
  )
}

function TightSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/60">{label}</span>
        <span className="tabular-nums text-white/40">{value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([n]) => onChange(n)}
      />
    </div>
  )
}
