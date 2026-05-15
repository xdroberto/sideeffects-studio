'use client'

import nextDynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'
import { ClientOnly } from '@/components/client-only'
import { Michroma as Microgramma, Space_Mono } from 'next/font/google'

const DisplayVisualizer = nextDynamic(
  () =>
    import('@/components/chord-lab/display-visualizer').then(m => m.DisplayVisualizer),
  {
    ssr: false,
    // Skeleton: caja del tamaño que va a ocupar el visualizer (96px alto,
    // ancho fluido). Línea ondulada decorativa color green/30 para
    // hint del display LCD, sin animation hasta que arranque el real.
    loading: () => (
      <div
        className="w-full bg-black/40 border border-green-500/10 rounded-sm flex items-center justify-center"
        style={{ height: 96 }}
        role="status"
        aria-live="polite"
      >
        <span className="text-[9px] uppercase tracking-[0.22em] text-green-500/30 animate-pulse font-mono">
          booting · firmware
        </span>
      </div>
    ),
  },
)

const microgramma = Microgramma({ subsets: ['latin'], weight: ['400'] })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400'] })

/**
 * ChordLab — Coming Soon
 *
 * UI inspirada en Teenage Engineering OP-1 / Pocket Operators: panel
 * gris cálido con knobs grandes, displays verdes/rojos con leyenda mono,
 * pads cuadrados con borde grueso, todo sobre fondo negro del sitio.
 *
 * No tiene funcionalidad — la pantalla central muestra "OFF" parpadeando
 * y la descripción de qué será cuando salga. Algunos controles se animan
 * decorativamente (clock pulsando, knobs ligeros) para que se sienta vivo.
 */

const FEATURES = [
  'Pad-driven chord progressions in any key',
  'Inversions, voicings, modal substitutions',
  'Per-pad arpeggios with rate + pattern',
  'MIDI export and Web Audio synth voices',
]

export function ChordLabClient() {
  return (
    <main id="main-content" className="relative min-h-screen bg-canvas text-white">
      <Nav />

      <article className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24 md:pt-20 md:pb-32">
        {/* Hero */}
        <header className="mb-10 md:mb-14 max-w-2xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="block w-2 h-2 rounded-full bg-signal animate-pulse" />
            <p className={`text-caption-mono uppercase text-signal ${spaceMono.className}`}>
              Chord Lab · Coming late 2026
            </p>
          </div>
          <h1
            className={`text-display-xl mb-6 ${microgramma.className}`}
          >
            chord lab
          </h1>
          <p className={`${spaceMono.className} text-base sm:text-lg text-gray-300 leading-relaxed`}>
            A pocket-sized chord toy for non-pianists. Tap a pad,
            <span className="text-white"> get a real chord</span>. Stack them into
            progressions. Hear them spelled out by a small synth voice.
          </p>
        </header>

        {/* The toy itself */}
        <section className="mb-16">
          <ClientOnly>
            <ToyChassis />
          </ClientOnly>
        </section>

        {/* Features list */}
        <section className="mb-16 border-t border-line pt-10">
          <p className={`text-caption-mono uppercase text-signal ${spaceMono.className} mb-6`}>
            Will ship with
          </p>
          <ul className={`${spaceMono.className} space-y-3 max-w-xl`}>
            {FEATURES.map((f, i) => (
              <li key={f} className="flex items-baseline gap-4 text-sm sm:text-base text-gray-300">
                <span className="text-caption-mono-sm tabular-nums text-signal/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Status */}
        <section className="border-t border-line pt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <div className="space-y-2">
              <p className={`text-caption-mono-sm uppercase text-signal ${spaceMono.className}`}>
                Status
              </p>
              <p className="text-base text-white">UI prototype · late 2026</p>
              <p className="text-sm text-ink-subtle">
                Audio engine wired internally. Public UI in progress. Will ship as
                a standalone web app and an embeddable widget.
              </p>
            </div>
            <div className="space-y-2">
              <p className={`text-caption-mono-sm uppercase text-signal ${spaceMono.className}`}>
                Who is it for
              </p>
              <p className="text-base text-white">Anyone who hears chords better than they read them.</p>
              <p className="text-sm text-ink-subtle">
                Producers stuck on the same three chords; teachers explaining
                voice-leading; songwriters chasing a feeling. The toy is the
                same — the use is yours.
              </p>
            </div>
          </div>

          {/* Early access CTA — discreto, consistente con SF-01 */}
          <div className="mt-10 pt-8 border-t border-line">
            <p className={`text-caption-mono-sm uppercase text-signal ${spaceMono.className} mb-2`}>
              Early access
            </p>
            <p className={`${spaceMono.className} text-sm text-ink-muted leading-relaxed`}>
              Want a heads-up when the firmware lands?{' '}
              <a
                href="mailto:robertobecerrilhurtado@gmail.com?subject=Chord%20Lab%20early%20access"
                className="text-white underline underline-offset-4 decoration-signal/60 hover:decoration-signal transition-colors"
              >
                drop a line
              </a>
              .
            </p>
          </div>
        </section>
      </article>

      <ClientOnly>
        <Footer />
      </ClientOnly>
    </main>
  )
}

/**
 * Chassis con look synth modular oscuro (Make Noise / Mutable Instruments
 * / TR-808): panel negro con bisel metálico sutil, screws oscuros en las
 * esquinas, pantalla LCD verde, acentos rojo signal.
 */
function ToyChassis() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative rounded-[28px] bg-gradient-to-b from-zinc-900 via-neutral-950 to-black p-4 sm:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.6),0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.03]">
        {/* "Tornillos" decorativos en las 4 esquinas */}
        <Screw className="top-3 left-3" />
        <Screw className="top-3 right-3" />
        <Screw className="bottom-3 left-3" />
        <Screw className="bottom-3 right-3" />

        {/* Lab serial tag — etiqueta de prototype/QA en estética synth
            modular: fondo negro, borde rojo, texto rojo. Ligera rotación
            para sentirse físico. Aria-hidden porque el texto se duplica
            abajo en el caption ("controls are decorative"). */}
        <span
          aria-hidden
          className={`pointer-events-none absolute -top-2 right-6 sm:right-12 z-10 rotate-[-4deg] select-none border border-signal/70 bg-black/90 px-2 py-0.5 shadow-[0_2px_6px_rgba(0,0,0,0.5)] ${spaceMono.className}`}
        >
          <span className="block text-[9px] uppercase tracking-[0.18em] leading-tight text-signal">
            prototype
          </span>
          <span className="block text-[7px] uppercase tracking-[0.18em] leading-tight text-signal/70">
            not functional
          </span>
        </span>

        {/* Top bar: brand + power led */}
        <div className="flex items-center justify-between mb-5 px-1">
          <span className={`text-caption-mono-sm uppercase text-white/85 ${spaceMono.className}`}>
            side_effects · cl-1
          </span>
          <div className="flex items-center gap-2">
            {/* Power LED — breathing pulse para sugerir idle/on */}
            <span
              className="block w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]"
              style={{ animation: 'cl-breathe 2.4s ease-in-out infinite' }}
            />
            <span className={`text-[9px] uppercase tracking-[0.2em] text-zinc-400 ${spaceMono.className}`}>
              power
            </span>
          </div>
        </div>

        {/* Display + side knobs */}
        <div className="flex items-stretch gap-4 mb-6">
          {/* Left knob cluster */}
          <div className="flex flex-col gap-3 shrink-0 hidden sm:flex">
            <Knob label="key" />
            <Knob label="oct" />
          </div>

          {/* Display */}
          <Display />

          {/* Right knob cluster — `vol` knob lleva automation sutil */}
          <div className="flex flex-col gap-3 shrink-0 hidden sm:flex">
            <Knob label="bpm" />
            <Knob label="vol" automation />
          </div>
        </div>

        {/* Mobile knob row */}
        <div className="flex sm:hidden gap-3 justify-between mb-6">
          <Knob label="key" />
          <Knob label="oct" />
          <Knob label="bpm" />
          <Knob label="vol" automation />
        </div>

        {/* 8-pad grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'I'].map((label, i) => (
            <Pad key={i} label={label} index={i} />
          ))}
        </div>

        {/* Mode + record row — `play` LED en idle pulse verde tenue */}
        <div className="flex items-center justify-between gap-3 mt-3 px-1">
          <div className="flex items-center gap-3">
            <ToggleLed label="play" active color="green" idle />
            <ToggleLed label="rec" active={false} color="red" />
            <ToggleLed label="loop" active={false} color="yellow" />
          </div>
          <div className={`text-[9px] uppercase tracking-[0.2em] text-zinc-500 ${spaceMono.className}`}>
            v 0.1.0 · build 14
          </div>
        </div>
      </div>

      <p className={`mt-4 text-center text-caption-mono-sm uppercase text-ink-subtle ${spaceMono.className}`}>
        mockup · controls are decorative · v1 ships late 2026
      </p>

      {/* Keyframes locales para las micro-animaciones del chassis.
          Plain <style> con CSS string para no depender de styled-jsx
          y no tocar globals.css (fuera de scope D.3). Los nombres
          `cl-*` están namespaced a chord-lab. */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: CHORD_LAB_KEYFRAMES }}
      />
    </div>
  )
}

const CHORD_LAB_KEYFRAMES = `
@keyframes cl-breathe {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@keyframes cl-idle-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.9; }
}
@keyframes cl-knob-automation {
  0%, 100% { transform: rotate(var(--knob-rot)); }
  50% { transform: rotate(calc(var(--knob-rot) + 6deg)); }
}
@media (prefers-reduced-motion: reduce) {
  [style*="cl-breathe"],
  [style*="cl-idle-pulse"],
  [style*="cl-knob-automation"] {
    animation: none !important;
  }
}
`

/* ── Internal toy components ───────────────────────────────────────── */

function Screw({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`absolute w-2.5 h-2.5 rounded-full bg-gradient-to-b from-zinc-600 to-zinc-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_-1px_2px_rgba(0,0,0,0.6),0_1px_1px_rgba(0,0,0,0.5)] ${className}`}
    >
      <span className="block w-full h-px bg-black/70 mt-[5px] rotate-[35deg]" />
    </span>
  )
}

function Knob({ label, automation = false }: { label: string; automation?: boolean }) {
  // Animación decorativa: cada knob mantiene una rotación leve aleatoria.
  const rot = useStableRandom(label) * 240 - 120 // -120..120 deg
  // Si `automation`, el knob oscila ±6° sobre su rotación base, simulando
  // LFO/automation activo. CSS variable para que la keyframe pueda
  // recomponer el transform.
  const innerStyle: React.CSSProperties = automation
    ? ({
        ['--knob-rot' as string]: `${rot}deg`,
        animation: 'cl-knob-automation 5.2s ease-in-out infinite',
      } as React.CSSProperties)
    : { transform: `rotate(${rot}deg)` }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-zinc-700 to-zinc-950 ring-1 ring-white/[0.06] shadow-[inset_0_2px_3px_rgba(255,255,255,0.12),inset_0_-1px_2px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.6)]">
        <div className="absolute inset-0" style={innerStyle}>
          <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-signal rounded-full shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
        </div>
      </div>
      <span className={`text-[9px] uppercase tracking-[0.2em] text-zinc-400 ${spaceMono.className}`}>
        {label}
      </span>
    </div>
  )
}

function Pad({ label, index }: { label: string; index: number }) {
  return (
    <button
      type="button"
      disabled
      className="aspect-square min-h-[64px] min-w-[64px] rounded-xl bg-gradient-to-b from-zinc-900 to-black border border-signal/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-2px_4px_rgba(0,0,0,0.6),0_0_10px_rgba(239,68,68,0.12)] flex flex-col items-center justify-center cursor-not-allowed select-none"
    >
      <span className={`text-lg sm:text-xl text-white/90 ${spaceMono.className}`}>
        {label}
      </span>
      <span className={`text-[8px] uppercase tracking-[0.2em] text-signal/60 ${spaceMono.className}`}>
        {String(index + 1).padStart(2, '0')}
      </span>
    </button>
  )
}

function ToggleLed({
  label,
  active,
  color,
  idle = false,
}: {
  label: string
  active: boolean
  color: 'green' | 'red' | 'yellow'
  /** En idle state, el LED pulsa muy suavemente (modo ready). */
  idle?: boolean
}) {
  const colorClass =
    color === 'green'
      ? 'bg-green-500'
      : color === 'red'
      ? 'bg-signal'
      : 'bg-amber-400'
  const idleStyle: React.CSSProperties = idle
    ? { animation: 'cl-idle-pulse 3.2s ease-in-out infinite' }
    : {}
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`block w-2 h-2 rounded-full ${active ? colorClass : 'bg-zinc-700 ring-1 ring-white/[0.06]'} ${active ? 'shadow-[0_0_6px_currentColor]' : ''}`}
        style={idleStyle}
      />
      <span className={`text-[9px] uppercase tracking-[0.2em] text-zinc-400 ${spaceMono.className}`}>
        {label}
      </span>
    </div>
  )
}

/**
 * Pantalla central tipo display LCD/OLED. Visualizador auto-running
 * (waveform + spectrum bars) en modo "demo" para sugerir que el toy
 * reaccionaría a la música cuando esté completo. Auto-cicla por unos
 * acordes para que se sienta vivo.
 */
function Display() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 280, h: 110 })
  const [chordIdx, setChordIdx] = useState(0)
  const chords = ['I', 'IV', 'V', 'vi'] as const

  // Medir el ancho del display al montar y al resize.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setSize({
        w: Math.max(120, Math.round(rect.width - 24)),
        h: 96,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Auto-cycle del acorde cada ~1.6s
  useEffect(() => {
    const id = setInterval(() => setChordIdx(i => (i + 1) % chords.length), 1600)
    return () => clearInterval(id)
  }, [chords.length])

  const currentChord = chords[chordIdx]

  return (
    <div
      ref={wrapperRef}
      className="flex-1 min-w-0 rounded-2xl bg-canvas-muted border border-line-strong/80 px-3 py-3 sm:px-4 sm:py-4 shadow-[inset_0_4px_12px_rgba(0,0,0,0.85)]"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[9px] uppercase tracking-[0.22em] text-green-500/80 ${spaceMono.className}`}>
          demo · auto
        </span>
        <span className={`text-[9px] tabular-nums text-green-500/60 ${spaceMono.className}`}>
          {currentChord}
        </span>
      </div>

      {/* Visualizer */}
      <DisplayVisualizer width={size.w} height={size.h} chordLabel={currentChord} />

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <span className={`text-[9px] uppercase tracking-[0.18em] text-green-500/60 ${spaceMono.className}`}>
          awaiting firmware
        </span>
        <span className={`text-[9px] uppercase tracking-[0.18em] text-green-500/40 ${spaceMono.className}`}>
          q3 2026
        </span>
      </div>
    </div>
  )
}

/**
 * Random determinista por seed — para que los knobs se vean rotados
 * pero consistentes entre re-renders.
 */
function useStableRandom(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  // Map to [0, 1)
  return ((h >>> 0) % 1000) / 1000
}
