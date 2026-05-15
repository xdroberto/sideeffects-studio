'use client'

import nextDynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'
import { ClientOnly } from '@/components/client-only'
import { PalettePicker, PRESET_PALETTES, type PaletteHexes } from '@/components/sf01/palette-picker'
import {
  SHADER_CONFIGS,
  defaultsFor,
  getShaderConfig,
  type ShaderId,
} from '@/lib/sf01/preview-config'
import { Michroma as Microgramma, Space_Mono } from 'next/font/google'

const microgramma = Microgramma({ subsets: ['latin'], weight: ['400'] })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400'] })

// Canvas dynamic-loaded para evitar SSR del WebGL context.
const DemoCanvas = nextDynamic(
  () => import('@/components/sf01/demo-canvas').then(m => m.DemoCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 bg-canvas-muted flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="block w-1.5 h-1.5 rounded-full bg-signal animate-pulse"
          />
          <span className="text-caption-mono uppercase text-zinc-500 animate-pulse">
            loading shader
          </span>
        </div>
      </div>
    ),
  },
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

export function SF01Client() {
  // Default a Reaction-Diffusion — Roberto pidió que sea el primero
  // que el visitor ve para incentivar el tap-to-seed (más expresivo
  // que el Voronoi de fragment shader).
  const [shaderId, setShaderId] = useState<ShaderId>('reaction-diffusion')
  const [values, setValues] = useState<Record<string, number>>(() => defaultsFor('reaction-diffusion'))
  const [palette, setPalette] = useState<PaletteHexes>(PRESET_PALETTES[0]!.colors)
  const [resetKey, setResetKey] = useState(0)

  // Cuando el user cambia de shader, reset values a los defaults del
  // nuevo shader. La palette persiste (es semánticamente igual entre
  // shaders — 3 colores: a, b, edge).
  const prevShaderRef = useRef<ShaderId>(shaderId)
  useEffect(() => {
    if (prevShaderRef.current !== shaderId) {
      setValues(defaultsFor(shaderId))
      // Tambien forzamos un reset del resetKey para que RD parta limpio
      // cuando se selecciona desde Voronoi.
      if (shaderId === 'reaction-diffusion') setResetKey(k => k + 1)
      prevShaderRef.current = shaderId
    }
  }, [shaderId])

  const activeConfig = getShaderConfig(shaderId)

  const handleSliderChange = (key: string, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  const handleClear = () => setResetKey(k => k + 1)

  return (
    <main id="main-content" className="relative min-h-screen bg-canvas text-white">
      <Nav />

      <article className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24 md:pt-20 md:pb-32">
        {/* Hero */}
        <header className="mb-12 md:mb-16 max-w-3xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="block w-2 h-2 rounded-full bg-signal animate-pulse" />
            <p className={`text-caption-mono uppercase text-signal ${spaceMono.className}`}>
              SF-01 · Coming Q3 2026
            </p>
          </div>
          <h1
            className={`text-display-xl mb-6 ${microgramma.className}`}
          >
            sf-01
          </h1>
          <p className={`${spaceMono.className} text-lg sm:text-xl text-gray-300 leading-relaxed`}>
            A live visual synthesizer for performers, designers, and image-makers
            who want their visuals to <span className="text-white">move with the moment</span>.
          </p>
          <p className={`${spaceMono.className} mt-4 text-sm sm:text-base text-ink-subtle leading-relaxed max-w-2xl`}>
            Mix two GLSL shader decks like a DJ. Map audio to any parameter.
            Made for music videos, club nights, gallery walls, livestreams,
            festival stages — for anything you want to move with sound. Below:
            a tiny taste — pick a shader, push the knobs, change the palette.
          </p>
        </header>

        {/* Demo unificado: un canvas + tabs de shader + controles
            adaptativos. Roberto pidió fusionar las previews para que
            los controles aprovechen ambos algoritmos. */}
        <section className="mb-16 md:mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:items-stretch">
            {/* Canvas */}
            <div className="lg:col-span-2">
              <div className="relative w-full aspect-[16/10] max-h-[60vh] md:max-h-none rounded-[20px] overflow-hidden border border-line-strong bg-canvas-muted">
                <ClientOnly>
                  <DemoCanvas
                    shaderId={shaderId}
                    values={values}
                    palette={palette}
                    acceptsPointerSeeds={activeConfig.acceptsPointerSeeds}
                    resetKey={resetKey}
                  />
                </ClientOnly>
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
                  <span className="block w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
                  <span className={`text-caption-mono-sm uppercase text-white/70 ${spaceMono.className}`}>
                    {activeConfig.label} · live
                  </span>
                </div>
                {/* Footer del canvas — más prominente cuando el shader
                    acepta touch (RD) para invitar al user a interactuar.
                    Color signal + pulse vs el footer apagado del Voronoi. */}
                {activeConfig.acceptsPointerSeeds ? (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10 pointer-events-none">
                    <span className="block w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
                    <span className={`text-caption-mono-sm uppercase text-signal ${spaceMono.className}`}>
                      {activeConfig.canvasFooter}
                    </span>
                  </div>
                ) : (
                  <div className={`absolute bottom-3 right-3 text-caption-mono-sm uppercase text-white/40 ${spaceMono.className} pointer-events-none max-w-[60%] text-right`}>
                    {activeConfig.canvasFooter}
                  </div>
                )}
              </div>
            </div>

            {/* Controls — adaptivos por shader */}
            <aside className="lg:col-span-1">
              <div className={`${spaceMono.className} space-y-5 lg:sticky lg:top-24`}>
                {/* Tabs selector */}
                <div>
                  <p className="text-caption-mono-sm uppercase text-signal mb-2">
                    Shader
                  </p>
                  <ShaderTabs value={shaderId} onChange={setShaderId} />
                  <p className="mt-2 text-caption-mono-xs uppercase text-ink-faint leading-relaxed">
                    {activeConfig.hint}
                  </p>
                </div>

                {/* Sliders — dinámicos */}
                <div className="pt-3 border-t border-line space-y-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-caption-mono-sm uppercase text-signal">
                      Controls
                    </p>
                    {activeConfig.acceptsPointerSeeds && (
                      <button
                        type="button"
                        onClick={handleClear}
                        className="text-caption-mono-xs uppercase text-ink-muted hover:text-signal transition-colors duration-200 ease-out flex items-center gap-1.5"
                        aria-label="Clear simulation and re-seed"
                      >
                        <span aria-hidden>&#8635;</span>
                        <span>clear</span>
                      </button>
                    )}
                  </div>
                  {activeConfig.sliders.map(s => (
                    <Slider
                      key={`${shaderId}-${s.key}`}
                      label={s.label}
                      hint={s.hint}
                      value={values[s.key] ?? s.default}
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      onChange={(v) => handleSliderChange(s.key, v)}
                    />
                  ))}
                </div>

                <div className="pt-2 border-t border-line">
                  <PalettePicker
                    value={palette}
                    onChange={setPalette}
                    fontClassName={spaceMono.className}
                  />
                </div>

                <p className="pt-2 text-caption-mono-sm uppercase text-ink-subtle leading-relaxed">
                  Two shaders, one canvas — the full SF-01 ships dual decks,
                  audio bands, blend modes, and live patching.
                </p>
              </div>
            </aside>
          </div>
        </section>

        {/* Features */}
        <section className="mb-16 md:mb-20">
          <p className={`text-caption-mono uppercase text-signal ${spaceMono.className} mb-6`}>
            What ships in v1
          </p>
          <h2 className={`text-display-lg mb-10 max-w-2xl ${microgramma.className}`}>
            a synth for visuals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 max-w-4xl">
            {FEATURES.map(({ title, body }) => (
              <div key={title} className="space-y-2">
                <h3 className={`text-base text-white ${spaceMono.className} tracking-wide`}>
                  {title}
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Beta CTA — visible, action-driven */}
        <section className="mb-16 md:mb-20">
          <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-gradient-to-br from-canvas-muted via-canvas to-canvas-muted px-6 sm:px-10 py-10 sm:py-12">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-signal/[0.04] blur-3xl pointer-events-none" />
            <div className="relative max-w-2xl">
              <p className={`text-caption-mono uppercase text-signal ${spaceMono.className} mb-4`}>
                Closed beta · Spring 2026
              </p>
              <h2 className={`text-display-md mb-4 ${microgramma.className}`}>
                want a key
              </h2>
              <p className={`${spaceMono.className} text-sm sm:text-base text-ink-muted leading-relaxed mb-6 max-w-xl`}>
                Beta opens to a small group before the public release. If you VJ,
                make music videos, run installations, or just want to push the
                tool hard — drop a line and I&apos;ll add you to the list.
              </p>
              <a
                href="mailto:robertobecerrilhurtado@gmail.com?subject=SF-01 beta access&body=Hi Roberto — I&apos;d like beta access to SF-01. A bit about me and what I&apos;d use it for:"
                className={`${spaceMono.className} inline-flex items-center gap-3 px-5 py-3 rounded-md bg-signal text-black uppercase tracking-[0.18em] text-[11px] hover:bg-signal-hover transition-colors`}
              >
                <span>Request beta access</span>
                <span aria-hidden className="text-base leading-none">&rarr;</span>
              </a>
            </div>
          </div>
        </section>

        {/* Status */}
        <section className="border-t border-line pt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <div className="space-y-2">
              <p className={`text-caption-mono-sm uppercase text-signal ${spaceMono.className}`}>
                Status
              </p>
              <p className="text-base text-white">In active development · Q3 2026 public release</p>
              <p className="text-sm text-ink-subtle">
                Internal builds are running on macOS, Windows and the browser.
                Closed beta opens in spring — see above for access.
              </p>
            </div>
            <div className="space-y-2">
              <p className={`text-caption-mono-sm uppercase text-signal ${spaceMono.className}`}>
                Who is it for
              </p>
              <p className="text-base text-white">Anyone whose visuals want to listen.</p>
              <p className="text-sm text-ink-subtle">
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

interface ShaderTabsProps {
  value: ShaderId
  onChange: (id: ShaderId) => void
}

/**
 * Tabs pill-style para seleccionar el shader activo. Estados:
 * - Active: bg-signal, text negro (alto contraste)
 * - Inactive: bg-canvas-muted, text-ink-muted (hover signal)
 * Accesible: aria-pressed para screen readers.
 */
function ShaderTabs({ value, onChange }: ShaderTabsProps) {
  return (
    <div
      role="group"
      aria-label="Shader selector"
      className="grid grid-cols-2 gap-1 p-1 bg-canvas-muted border border-line rounded-lg"
    >
      {SHADER_CONFIGS.map(s => {
        const active = s.id === value
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            aria-pressed={active}
            className={`px-3 py-2 rounded-md text-caption-mono-sm uppercase transition-colors duration-150 ease-out font-mono tracking-wider ${
              active
                ? 'bg-signal text-black'
                : 'bg-transparent text-ink-muted hover:text-signal hover:bg-canvas/40'
            }`}
          >
            {s.tabLabel ?? s.label}
          </button>
        )
      })}
    </div>
  )
}

interface SliderProps {
  label: string
  /** Hint corto atmosférico debajo del label. Opcional. */
  hint?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

/**
 * Slider con feedback visual al cambiar el valor:
 * - Pulse/glow transitorio en la barra (decay ~360ms)
 * - Highlight del valor numérico durante el cambio
 * - Track ligeramente más alto para mejor visibilidad
 * - Hint en lowercase debajo del label — Roberto pidió que el user
 *   sepa qué controla cada parámetro sin que la UI se sienta técnica.
 */
function Slider({ label, hint, value, min, max, step, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  const [pulse, setPulse] = useState(false)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setPulse(true)
    if (pulseTimer.current) clearTimeout(pulseTimer.current)
    pulseTimer.current = setTimeout(() => setPulse(false), 360)
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current)
    }
  }, [value])

  // Decimal places adaptativos: si el step es >=1, 0 decimales; si
  // step >=0.1, 1 decimal; si step >=0.01, 2 decimales; etc. Mantiene
  // tabular-nums alignment sin que feed/kill (3-4 decimales) saque al
  // resto de la columna.
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <label className="text-caption-mono-sm uppercase text-ink-muted">
          {label}
        </label>
        <span
          className={`text-caption-mono tabular-nums transition-colors duration-300 ${
            pulse ? 'text-signal-hover' : 'text-white'
          }`}
        >
          {value.toFixed(decimals)}
        </span>
      </div>
      {hint && (
        <p className="text-caption-mono-xs text-ink-faint normal-case leading-tight">
          {hint}
        </p>
      )}
      <div className="relative h-1.5 rounded-full bg-neutral-800 overflow-visible">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-signal transition-[width] duration-75 ease-out"
          style={{ width: `${pct}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-signal/40 blur-[6px] pointer-events-none transition-opacity ${
            pulse ? 'opacity-100 duration-75' : 'opacity-0 duration-300'
          }`}
          style={{ width: `${pct}%` }}
          aria-hidden
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={label}
          aria-valuetext={`${label} ${value.toFixed(decimals)}`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ touchAction: 'pan-y' }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-signal ring-2 ring-black pointer-events-none transition-all duration-200 ${
            pulse ? 'w-4 h-4 shadow-[0_0_12px_rgba(239,68,68,0.7)]' : 'w-3 h-3'
          }`}
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  )
}
