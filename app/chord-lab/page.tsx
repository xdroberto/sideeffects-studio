'use client'

import { useEffect, useRef, useState } from 'react'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'
import { ClientOnly } from '@/components/client-only'
import { Michroma as Microgramma, Space_Mono } from 'next/font/google'

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

export default function ChordLabPage() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <Nav />

      <article className="max-w-6xl mx-auto px-6 pt-12 pb-24 md:pt-20 md:pb-32">
        {/* Hero */}
        <header className="mb-10 md:mb-14 max-w-2xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className={`text-[11px] uppercase tracking-[0.22em] text-red-500 ${spaceMono.className}`}>
              Chord Lab · Coming Q3 2026
            </p>
          </div>
          <h1
            className={`text-5xl sm:text-6xl md:text-7xl font-light tracking-wider mb-6 ${microgramma.className}`}
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
        <section className="mb-16 border-t border-neutral-900 pt-10">
          <p className={`text-[11px] uppercase tracking-[0.22em] text-red-500 ${spaceMono.className} mb-6`}>
            Will ship with
          </p>
          <ul className={`${spaceMono.className} space-y-3 max-w-xl`}>
            {FEATURES.map((f, i) => (
              <li key={f} className="flex items-baseline gap-4 text-sm sm:text-base text-gray-300">
                <span className="text-[10px] tabular-nums text-red-500/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Status */}
        <section className="border-t border-neutral-900 pt-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            <div className="space-y-2">
              <p className={`text-[10px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
                Status
              </p>
              <p className="text-base text-white">UI prototype</p>
              <p className="text-sm text-gray-500">Audio engine wired internally. Public UI in progress.</p>
            </div>
            <div className="space-y-2">
              <p className={`text-[10px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
                Public release
              </p>
              <p className="text-base text-white">Q3 2026</p>
              <p className="text-sm text-gray-500">Standalone web app + embeddable widget.</p>
            </div>
            <div className="space-y-2">
              <p className={`text-[10px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
                For who
              </p>
              <p className="text-base text-white">Producers, teachers, songwriters</p>
              <p className="text-sm text-gray-500">Anyone who hears chords better than they read them.</p>
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

/**
 * Chassis con look Teenage Engineering: panel gris cálido, esquinas
 * redondeadas, screws ornamentales en las esquinas, pantalla central
 * verde mostrando "OFF".
 */
function ToyChassis() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative rounded-[28px] bg-gradient-to-b from-neutral-300 to-neutral-400 p-6 sm:p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
        {/* "Tornillos" decorativos en las 4 esquinas */}
        <Screw className="top-3 left-3" />
        <Screw className="top-3 right-3" />
        <Screw className="bottom-3 left-3" />
        <Screw className="bottom-3 right-3" />

        {/* Top bar: brand + power led */}
        <div className="flex items-center justify-between mb-5 px-1">
          <span className={`text-[10px] uppercase tracking-[0.22em] text-neutral-700 ${spaceMono.className}`}>
            side_effects · cl-1
          </span>
          <div className="flex items-center gap-2">
            <span className="block w-1.5 h-1.5 rounded-full bg-neutral-700/50" />
            <span className={`text-[9px] uppercase tracking-[0.2em] text-neutral-700/70 ${spaceMono.className}`}>
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

          {/* Right knob cluster */}
          <div className="flex flex-col gap-3 shrink-0 hidden sm:flex">
            <Knob label="bpm" />
            <Knob label="vol" />
          </div>
        </div>

        {/* Mobile knob row */}
        <div className="flex sm:hidden gap-3 justify-between mb-6">
          <Knob label="key" />
          <Knob label="oct" />
          <Knob label="bpm" />
          <Knob label="vol" />
        </div>

        {/* 8-pad grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'I'].map((label, i) => (
            <Pad key={i} label={label} index={i} />
          ))}
        </div>

        {/* Mode + record row */}
        <div className="flex items-center justify-between gap-3 mt-3 px-1">
          <div className="flex items-center gap-3">
            <ToggleLed label="play" active={false} color="green" />
            <ToggleLed label="rec" active={false} color="red" />
            <ToggleLed label="loop" active={false} color="yellow" />
          </div>
          <div className={`text-[9px] uppercase tracking-[0.2em] text-neutral-700/70 ${spaceMono.className}`}>
            v 0.1.0 · build 14
          </div>
        </div>
      </div>

      <p className={`mt-4 text-center text-[10px] uppercase tracking-[0.22em] text-gray-500 ${spaceMono.className}`}>
        controls are decorative · v1 ships Q3 2026
      </p>
    </div>
  )
}

/* ── Internal toy components ───────────────────────────────────────── */

function Screw({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`absolute w-2.5 h-2.5 rounded-full bg-neutral-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),inset_0_-1px_1px_rgba(255,255,255,0.15)] ${className}`}
    >
      <span className="block w-full h-px bg-neutral-700/60 mt-[5px] rotate-[35deg]" />
    </span>
  )
}

function Knob({ label }: { label: string }) {
  // Animación decorativa: cada knob mantiene una rotación leve aleatoria.
  const rot = useStableRandom(label) * 240 - 120 // -120..120 deg
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-neutral-700 to-neutral-900 shadow-[inset_0_2px_3px_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.4)]">
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${rot}deg)` }}
        >
          <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-red-500 rounded-full" />
        </div>
      </div>
      <span className={`text-[9px] uppercase tracking-[0.2em] text-neutral-700 ${spaceMono.className}`}>
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
      className="aspect-square rounded-xl bg-gradient-to-b from-neutral-200 to-neutral-300 border border-neutral-400/60 shadow-[inset_0_-2px_2px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center cursor-not-allowed select-none"
    >
      <span className={`text-base sm:text-lg text-neutral-700 ${spaceMono.className}`}>
        {label}
      </span>
      <span className={`text-[8px] uppercase tracking-[0.2em] text-neutral-500/70 ${spaceMono.className}`}>
        {String(index + 1).padStart(2, '0')}
      </span>
    </button>
  )
}

function ToggleLed({
  label,
  active,
  color,
}: {
  label: string
  active: boolean
  color: 'green' | 'red' | 'yellow'
}) {
  const colorClass =
    color === 'green'
      ? 'bg-green-500'
      : color === 'red'
      ? 'bg-red-500'
      : 'bg-amber-400'
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`block w-2 h-2 rounded-full ${active ? colorClass : 'bg-neutral-500/40'} ${active ? 'shadow-[0_0_6px_currentColor]' : ''}`}
      />
      <span className={`text-[9px] uppercase tracking-[0.2em] text-neutral-700/70 ${spaceMono.className}`}>
        {label}
      </span>
    </div>
  )
}

/**
 * Pantalla central tipo display LCD/OLED. Muestra "OFF" parpadeando
 * con un cursor, y debajo una breve descripción de lo que vendrá.
 */
function Display() {
  const [blink, setBlink] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => setBlink(b => !b), 700)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div className="flex-1 rounded-2xl bg-neutral-950 border border-neutral-800/80 px-4 py-4 sm:px-6 sm:py-5 shadow-[inset_0_4px_12px_rgba(0,0,0,0.85)]">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[9px] uppercase tracking-[0.22em] text-green-500/80 ${spaceMono.className}`}>
          display
        </span>
        <span className={`text-[9px] uppercase tracking-[0.22em] text-green-500/40 ${spaceMono.className}`}>
          ▮▮▮▮ ░░░░
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span
          className={`text-3xl sm:text-4xl tracking-[0.2em] text-green-400 ${spaceMono.className}`}
          style={{ textShadow: '0 0 14px rgba(74, 222, 128, 0.4)' }}
        >
          OFF
        </span>
        <span
          className={`text-3xl sm:text-4xl text-green-400 ${blink ? 'opacity-100' : 'opacity-0'} transition-opacity`}
          style={{ textShadow: '0 0 14px rgba(74, 222, 128, 0.4)' }}
        >
          _
        </span>
      </div>

      <p
        className={`text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-green-500/70 leading-relaxed ${spaceMono.className}`}
      >
        Power off · awaiting firmware
        <br />
        Public release Q3 2026
      </p>
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
