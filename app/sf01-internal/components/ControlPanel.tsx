'use client'

import { Slider } from '@/components/ui/slider'
import type { Effect, PatchValues, UniformSpec } from '../lib/types'

type Props = {
  effect: Effect
  values: PatchValues
  setUniform: (name: string, value: number | [number, number, number]) => void
}

export function ControlPanel({ effect, values, setUniform }: Props) {
  return (
    <section className="flex flex-col font-mono">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.015]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/50">
            Effect
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-white truncate">
            {effect.name}
          </span>
        </div>
        <span className="text-[9px] tabular-nums text-white/30">
          {effect.uniforms.length} params
        </span>
      </div>

      {effect.description && (
        <div className="px-4 py-2 text-[10px] text-white/40 leading-snug border-b border-white/5">
          {effect.description}
        </div>
      )}

      <div className="px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-3">
        {effect.uniforms.map((spec) => (
          <UniformControl
            key={spec.name}
            spec={spec}
            value={values[spec.name]}
            onChange={(v) => setUniform(spec.name, v)}
          />
        ))}
      </div>
    </section>
  )
}

function UniformControl({
  spec,
  value,
  onChange,
}: {
  spec: UniformSpec
  value: number | [number, number, number] | undefined
  onChange: (v: number | [number, number, number]) => void
}) {
  if (spec.type === 'vec3') {
    const v = (value as [number, number, number] | undefined) ?? spec.default
    const hex = rgbToHex(v)
    return (
      <div className="col-span-2 flex items-center gap-3">
        <span className="text-[10px] text-white/60 uppercase tracking-[0.12em] min-w-[88px]">
          {spec.label ?? spec.name}
        </span>
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(hexToRgb(e.target.value))}
          onInput={(e) => onChange(hexToRgb((e.target as HTMLInputElement).value))}
          className="flex-1 h-6 bg-transparent border border-white/10 cursor-pointer"
        />
        <span className="tabular-nums text-white/40 text-[9px] w-16 text-right">
          {hex}
        </span>
      </div>
    )
  }

  const v = (value as number | undefined) ?? spec.default
  const step = spec.step ?? (spec.type === 'int' ? 1 : 0.01)
  const display =
    spec.type === 'int' ? v.toFixed(0) : Math.abs(v) < 0.01 ? v.toFixed(3) : v.toFixed(2)
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-white/60 truncate">{spec.label ?? spec.name}</span>
        <span className="tabular-nums text-white/40 text-[9px]">{display}</span>
      </div>
      <Slider
        value={[v]}
        min={spec.min}
        max={spec.max}
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
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
