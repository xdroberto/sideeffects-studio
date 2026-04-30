'use client'

import nextDynamic from 'next/dynamic'
import { useState } from 'react'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'
import { ClientOnly } from '@/components/client-only'
import { PalettePicker, PRESET_PALETTES, type PaletteHexes } from '@/components/sf01/palette-picker'
import { Michroma as Microgramma, Space_Mono } from 'next/font/google'

const microgramma = Microgramma({ subsets: ['latin'], weight: ['400'] })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400'] })

const VoronoiPreview = nextDynamic(
  () => import('@/components/sf01/voronoi-preview').then(m => m.VoronoiPreview),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-neutral-950" /> },
)

const FEATURES = [
  {
    title: 'Dual-deck mix engine',
    body: 'Two visual decks with crossfader, blend modes, and per-channel feedback loops. Mix shaders the way DJs mix tracks.',
  },
  {
    title: 'Live shader library',
    body: 'Voronoi, domain warping, reaction-diffusion, raymarched SDFs, moiré. Drop new GLSL effects in minutes.',
  },
  {
    title: 'Audio-reactive everything',
    body: 'Map any audio band — low, mid, high, level — to any parameter on any deck. Mic input or system audio.',
  },
  {
    title: 'Built for live performance',
    body: 'Designed for VJ sets, music videos, club projections, gallery installations, livestreams. Zero-latency render.',
  },
  {
    title: 'Open-canvas mapping',
    body: 'Output to any resolution, any aspect ratio, any number of windows. Designed to stretch across multi-projector setups.',
  },
  {
    title: 'Patch & share',
    body: 'Save, load, and share patches as JSON. Recall a sound-piece state in one click. Build your own preset library.',
  },
]

export default function SF01Page() {
  const [density, setDensity] = useState(8)
  const [motion, setMotion] = useState(0.6)
  const [hueDrift, setHueDrift] = useState(0.35)
  const [edge, setEdge] = useState(0.8)
  const [palette, setPalette] = useState<PaletteHexes>(PRESET_PALETTES[0]!.colors)

  const controls = {
    density,
    motion,
    hueDrift,
    edge,
    colorA: hexToRgb01(palette.a),
    colorB: hexToRgb01(palette.b),
    edgeColor: hexToRgb01(palette.edge),
  }

  return (
    <main className="relative min-h-screen bg-black text-white">
      <Nav />

      <article className="max-w-6xl mx-auto px-6 pt-12 pb-24 md:pt-20 md:pb-32">
        {/* Hero */}
        <header className="mb-12 md:mb-16 max-w-3xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className={`text-[11px] uppercase tracking-[0.22em] text-red-500 ${spaceMono.className}`}>
              SF-01 · Coming Q3 2026
            </p>
          </div>
          <h1
            className={`text-5xl sm:text-6xl md:text-7xl font-light tracking-wider mb-6 ${microgramma.className}`}
          >
            sf-01
          </h1>
          <p className={`${spaceMono.className} text-lg sm:text-xl text-gray-300 leading-relaxed`}>
            A live visual synthesizer for performers, designers, and image-makers
            who want their visuals to <span className="text-white">move with the moment</span>.
          </p>
          <p className={`${spaceMono.className} mt-4 text-sm sm:text-base text-gray-500 leading-relaxed max-w-2xl`}>
            Mix two GLSL shader decks like a DJ. Map audio to any parameter.
            Made for music videos, club nights, gallery walls, livestreams,
            festival stages — for anything you want to move with sound. Below: a
            tiny taste — one shader, a few knobs, three colors.
          </p>
        </header>

        {/* Demo */}
        <section className="mb-16 md:mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:items-stretch">
            {/* Canvas */}
            <div className="lg:col-span-2">
              <div className="relative w-full aspect-[16/10] rounded-[20px] overflow-hidden border border-neutral-800 bg-neutral-950">
                <ClientOnly>
                  <VoronoiPreview controls={controls} />
                </ClientOnly>
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
                  <span className="block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className={`text-[10px] uppercase tracking-[0.18em] text-white/70 ${spaceMono.className}`}>
                    Voronoi · Live preview
                  </span>
                </div>
                <div className={`absolute bottom-3 right-3 text-[10px] uppercase tracking-[0.18em] text-white/40 ${spaceMono.className} pointer-events-none`}>
                  GLSL · 60fps
                </div>
              </div>
            </div>

            {/* Controls */}
            <aside className="lg:col-span-1">
              <div className={`${spaceMono.className} space-y-5 lg:sticky lg:top-24`}>
                <p className="text-[10px] uppercase tracking-[0.18em] text-red-500">
                  Demo controls
                </p>
                <Slider label="Density" value={density} min={1.5} max={20} step={0.1} onChange={setDensity} />
                <Slider label="Motion" value={motion} min={0} max={2.5} step={0.01} onChange={setMotion} />
                <Slider label="Hue drift" value={hueDrift} min={0} max={1} step={0.01} onChange={setHueDrift} />
                <Slider label="Edge" value={edge} min={0} max={2} step={0.01} onChange={setEdge} />

                <div className="pt-2 border-t border-neutral-900">
                  <PalettePicker
                    value={palette}
                    onChange={setPalette}
                    fontClassName={spaceMono.className}
                  />
                </div>

                <p className="pt-2 text-[10px] uppercase tracking-[0.18em] text-gray-500 leading-relaxed">
                  This is one shader of many — and one preset of infinite. The full
                  SF-01 ships with the dual-deck mixer, audio bands, blend modes
                  and live patching.
                </p>
              </div>
            </aside>
          </div>
        </section>

        {/* Features */}
        <section className="mb-16 md:mb-20">
          <p className={`text-[11px] uppercase tracking-[0.22em] text-red-500 ${spaceMono.className} mb-6`}>
            What ships in v1
          </p>
          <h2 className={`text-3xl sm:text-4xl font-light tracking-wider mb-10 max-w-2xl ${microgramma.className}`}>
            a synth for visuals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 max-w-4xl">
            {FEATURES.map(({ title, body }) => (
              <div key={title} className="space-y-2">
                <h3 className={`text-base text-white ${spaceMono.className} tracking-wide`}>
                  {title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Status */}
        <section className="border-t border-neutral-900 pt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <div className="space-y-2">
              <p className={`text-[10px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
                Status
              </p>
              <p className="text-base text-white">In active development · Q3 2026</p>
              <p className="text-sm text-gray-500">
                Internal builds are running on macOS, Windows and the browser.
                Closed beta opens earlier — drop a line if you want a key.
              </p>
            </div>
            <div className="space-y-2">
              <p className={`text-[10px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
                Who is it for
              </p>
              <p className="text-base text-white">Anyone whose visuals want to listen.</p>
              <p className="text-sm text-gray-500">
                VJs and motion designers; producers stitching together music
                videos; coders patching shaders for fun; anyone who feels the
                screen could be louder. The tool is the same — the use is yours.
              </p>
            </div>
          </div>
        </section>
      </article>

      <ClientOnly>
        <Footer />
      </ClientOnly>
    </main>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <label className="text-[10px] uppercase tracking-[0.18em] text-gray-400">
          {label}
        </label>
        <span className="text-[11px] text-white tabular-nums">{value.toFixed(2)}</span>
      </div>
      <div className="relative h-1 rounded-full bg-neutral-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-red-500"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={label}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ touchAction: 'pan-y' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 ring-2 ring-black pointer-events-none"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/** Convierte un hex CSS '#rrggbb' a una tupla [r, g, b] normalizada 0..1. */
function hexToRgb01(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-f]{6})$/i)
  if (!m) return [1, 1, 1]
  const n = parseInt(m[1], 16)
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255]
}
