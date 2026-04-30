'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Custom palette picker para el demo de SF-01.
 *
 * Preset-driven: una grid de paletas curadas (3 colores cada una:
 * Color A, Color B, Edge). Click una paleta → los 3 colores se aplican.
 *
 * Pop-over de fine-tuning: si el usuario quiere ajustar un color
 * concreto, click en el swatch correspondiente abre una mini-grid
 * de 24 hues curados. Sin `<input type="color">` nativo, sin HSV.
 *
 * Optimizado para touch: targets ≥ 28px, sin hover-only states,
 * cierra popover al click fuera o tocar otro swatch.
 */

export type PaletteHexes = { a: string; b: string; edge: string }

export interface Palette {
  id: string
  name: string
  colors: PaletteHexes
}

export const PRESET_PALETTES: Palette[] = [
  { id: 'volcano', name: 'Volcano', colors: { a: '#0c0a1f', b: '#e66526', edge: '#fff2cc' } },
  { id: 'ocean', name: 'Ocean', colors: { a: '#031733', b: '#1f9fb8', edge: '#d9f2ff' } },
  { id: 'sunset', name: 'Sunset', colors: { a: '#2a0d3a', b: '#ff5f7e', edge: '#ffd76b' } },
  { id: 'forest', name: 'Forest', colors: { a: '#0f1f14', b: '#5db86d', edge: '#f4e9c4' } },
  { id: 'cyber', name: 'Cyber', colors: { a: '#070019', b: '#ff2bd6', edge: '#42f5e3' } },
  { id: 'mono', name: 'Mono', colors: { a: '#000000', b: '#5a5a5a', edge: '#ffffff' } },
  { id: 'oxide', name: 'Oxide', colors: { a: '#0a0808', b: '#a82a1a', edge: '#dfb37a' } },
  { id: 'lab', name: 'Lab', colors: { a: '#0e0e10', b: '#7a4dff', edge: '#c4ff5a' } },
]

// Paleta de hues para fine-tune individual — 6 columnas × 4 filas:
// negro/gris/blanco + base hues a 3 niveles (oscuro / medio / claro).
const HEX_GRID: string[] = [
  '#000000', '#1a1a1a', '#3a3a3a', '#7a7a7a', '#cfcfcf', '#ffffff',
  '#3a0a14', '#7a1a28', '#dc2626', '#ff6b6b', '#ff9faa', '#ffd9dd',
  '#3a1a04', '#a04a10', '#e66526', '#ffae66', '#ffd2a6', '#fff2cc',
  '#04241a', '#0e6b50', '#1fb886', '#5be3b6', '#9af0d2', '#d9faec',
  '#031733', '#0e3e7a', '#1f7fc8', '#5fb1ff', '#a6cefa', '#dfeeff',
  '#1a0a3a', '#3a1a7a', '#6e3ae0', '#9b78ff', '#c8b2ff', '#e9deff',
  '#2a0a3a', '#5a1a7a', '#a82bd6', '#d761ff', '#e9a0ff', '#f7dcff',
  '#3a0028', '#a01060', '#ff2b8e', '#ff6bb0', '#ffadcd', '#ffd9e8',
]

interface PalettePickerProps {
  value: PaletteHexes
  onChange: (next: PaletteHexes) => void
  fontClassName?: string
}

export function PalettePicker({ value, onChange, fontClassName = '' }: PalettePickerProps) {
  // Detectar paleta activa por igualdad exacta de hexes.
  const activeId =
    PRESET_PALETTES.find(
      p =>
        p.colors.a.toLowerCase() === value.a.toLowerCase() &&
        p.colors.b.toLowerCase() === value.b.toLowerCase() &&
        p.colors.edge.toLowerCase() === value.edge.toLowerCase(),
    )?.id ?? null

  return (
    <div className={`space-y-4 ${fontClassName}`}>
      {/* Preset palettes */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
          Presets
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_PALETTES.map(p => {
            const isActive = activeId === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange(p.colors)}
                aria-pressed={isActive}
                aria-label={`Palette ${p.name}`}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-md border transition-colors ${
                  isActive
                    ? 'border-red-500/70 bg-red-500/[0.08]'
                    : 'border-neutral-800 hover:border-neutral-600'
                }`}
              >
                {/* Stripe of 3 colors */}
                <span
                  className="block h-5 w-12 rounded-sm overflow-hidden flex shrink-0 border border-black/40"
                  style={{ display: 'flex' }}
                >
                  <span style={{ flex: 1, backgroundColor: p.colors.a }} />
                  <span style={{ flex: 1, backgroundColor: p.colors.b }} />
                  <span style={{ flex: 1, backgroundColor: p.colors.edge }} />
                </span>
                <span
                  className={`text-[10px] uppercase tracking-[0.16em] truncate ${
                    isActive ? 'text-red-400' : 'text-gray-300 group-hover:text-white'
                  }`}
                >
                  {p.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Fine-tune per channel */}
      <div className="space-y-2 pt-2 border-t border-neutral-900">
        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
          Tweak
        </p>
        <div className="space-y-2">
          <ChannelRow
            label="A"
            value={value.a}
            onChange={hex => onChange({ ...value, a: hex })}
          />
          <ChannelRow
            label="B"
            value={value.b}
            onChange={hex => onChange({ ...value, b: hex })}
          />
          <ChannelRow
            label="Edge"
            value={value.edge}
            onChange={hex => onChange({ ...value, edge: hex })}
          />
        </div>
      </div>
    </div>
  )
}

interface ChannelRowProps {
  label: string
  value: string
  onChange: (hex: string) => void
}

function ChannelRow({ label, value, onChange }: ChannelRowProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Cerrar popover al click/touch fuera
  useEffect(() => {
    if (!open) return
    const onDoc = (e: Event) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <span className="w-10 text-[10px] uppercase tracking-[0.16em] text-gray-500 shrink-0">
          {label}
        </span>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={`Pick color for ${label}`}
          aria-expanded={open}
          className={`flex-1 flex items-center gap-2 h-8 px-2 rounded-md border transition-colors ${
            open
              ? 'border-red-500/70 bg-red-500/[0.06]'
              : 'border-neutral-800 hover:border-neutral-600'
          }`}
        >
          <span
            className="block w-5 h-5 rounded-sm border border-black/40 shrink-0"
            style={{ backgroundColor: value }}
          />
          <span className="text-[11px] tabular-nums text-gray-300 uppercase truncate">
            {value}
          </span>
        </button>
      </div>

      {open && (
        <div
          className="absolute z-30 right-0 mt-2 p-2 rounded-md border border-neutral-700 bg-neutral-950 shadow-2xl"
          style={{ minWidth: '210px' }}
        >
          <div className="grid grid-cols-6 gap-1">
            {HEX_GRID.map(hex => {
              const isActive = hex.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => {
                    onChange(hex)
                    setOpen(false)
                  }}
                  aria-label={hex}
                  className="block w-7 h-7 rounded-sm border border-black/30 hover:scale-110 hover:border-white/40 transition-transform"
                  style={{
                    backgroundColor: hex,
                    outline: isActive ? '2px solid #ef4444' : 'none',
                    outlineOffset: 1,
                  }}
                />
              )
            })}
          </div>
          {/* Hex input */}
          <div className="mt-2 pt-2 border-t border-neutral-800">
            <HexInput value={value} onChange={onChange} />
          </div>
        </div>
      )}
    </div>
  )
}

interface HexInputProps {
  value: string
  onChange: (hex: string) => void
}

function HexInput({ value, onChange }: HexInputProps) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  const commit = (raw: string) => {
    let v = raw.trim().toLowerCase()
    if (!v.startsWith('#')) v = '#' + v
    if (/^#[0-9a-f]{6}$/.test(v)) onChange(v)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] uppercase tracking-[0.18em] text-gray-500">
        Hex
      </span>
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            commit(draft)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="flex-1 h-7 px-2 rounded bg-black border border-neutral-800 text-[11px] tabular-nums uppercase text-gray-200 focus:outline-none focus:border-red-500/70"
      />
    </div>
  )
}
