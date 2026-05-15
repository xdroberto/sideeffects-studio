'use client'

import { Slider } from '@/components/ui/slider'
import { Power } from 'lucide-react'
import type { OverlayAlign, OverlayFont, OverlayState } from '../lib/overlay'

type Props = {
  overlay: OverlayState
  setOverlay: (next: Partial<OverlayState>) => void
}

export function OverlayPanel({ overlay, setOverlay }: Props) {
  return (
    <section className="flex flex-col font-mono">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.015]">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/50">
          Text Overlay
        </span>
        <button
          type="button"
          onClick={() => setOverlay({ enabled: !overlay.enabled })}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] border transition-colors ${
            overlay.enabled
              ? 'bg-lime-400 text-black border-lime-300 shadow-[0_0_10px_rgba(163,230,53,0.35)]'
              : 'bg-black text-white/55 border-white/20 hover:border-white/60 hover:text-white'
          }`}
        >
          <Power size={11} />
          {overlay.enabled ? 'ON' : 'ENABLE'}
        </button>
      </div>

      <div className="px-4 py-3 flex flex-col gap-3 border-b border-white/5">
        <textarea
          value={overlay.text}
          onChange={(e) => setOverlay({ text: e.target.value })}
          placeholder="Type overlay text…"
          rows={2}
          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 text-white text-sm font-mono focus:border-white/40 focus:outline-none resize-none placeholder:text-white/25"
        />

        <div className="grid grid-cols-2 gap-2">
          <SegmentedButtons
            label="Align"
            value={overlay.align}
            options={['left', 'center', 'right'] as OverlayAlign[]}
            onChange={(a) => setOverlay({ align: a })}
          />
          <SegmentedButtons
            label="Font"
            value={overlay.font}
            options={['sans', 'mono', 'serif', 'display'] as OverlayFont[]}
            onChange={(f) => setOverlay({ font: f })}
          />
        </div>
      </div>

      <div className="px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2 border-b border-white/5">
        <TightSlider
          label="Size"
          value={overlay.size}
          min={0.02}
          max={0.5}
          step={0.005}
          onChange={(n) => setOverlay({ size: n })}
        />
        <TightSlider
          label="Letter Sp"
          value={overlay.letterSpacing}
          min={-0.05}
          max={0.5}
          step={0.01}
          onChange={(n) => setOverlay({ letterSpacing: n })}
        />
        <TightSlider
          label="Pos X"
          value={overlay.x}
          min={0}
          max={1}
          step={0.01}
          onChange={(n) => setOverlay({ x: n })}
        />
        <TightSlider
          label="Pos Y"
          value={overlay.y}
          min={0}
          max={1}
          step={0.01}
          onChange={(n) => setOverlay({ y: n })}
        />
        <TightSlider
          label="Opacity"
          value={overlay.opacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(n) => setOverlay({ opacity: n })}
        />
        <label className="flex items-end gap-2 text-[10px] text-white/60 cursor-pointer pb-[5px]">
          <input
            type="checkbox"
            checked={overlay.mixBlend}
            onChange={(e) => setOverlay({ mixBlend: e.target.checked })}
            className="accent-white"
          />
          Difference
        </label>
      </div>

      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <span className="text-[10px] text-white/60 uppercase tracking-[0.12em] w-12">
          Color
        </span>
        <input
          type="color"
          value={rgbToHex(overlay.color)}
          onChange={(e) => setOverlay({ color: hexToRgb(e.target.value) })}
          onInput={(e) =>
            setOverlay({ color: hexToRgb((e.target as HTMLInputElement).value) })
          }
          className="flex-1 h-6 bg-transparent border border-white/10 cursor-pointer"
        />
        <span className="tabular-nums text-white/40 text-[10px] w-16 text-right">
          {rgbToHex(overlay.color)}
        </span>
      </div>
    </section>
  )
}

function SegmentedButtons<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: T[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </span>
      <div
        className="grid gap-px bg-white/10"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`py-1.5 text-[9px] uppercase tracking-[0.1em] transition-colors ${
              value === opt
                ? 'bg-white text-black'
                : 'bg-black text-white/55 hover:bg-white/5 hover:text-white'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
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
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-white/60 truncate">{label}</span>
        <span className="tabular-nums text-white/40 text-[9px]">{value.toFixed(2)}</span>
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

function rgbToHex([r, g, b]: [number, number, number]) {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n * 255)))
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-f]{6})$/i)
  if (!m) return [1, 1, 1]
  const n = parseInt(m[1], 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
