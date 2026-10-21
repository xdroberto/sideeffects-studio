'use client'

import nextDynamic from 'next/dynamic'
import { useRef, useState, type ReactNode } from 'react'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'
import { ClientOnly } from '@/components/client-only'
import { SignalBullet } from '@/components/signal-bullet'
import { Thread } from '@/components/playground/thread'
import { InkWordInput } from '@/components/playground/ink-word-input'
import { LoomSourcePicker } from '@/components/playground/loom-source-picker'
import type { InkHandle } from '@/components/playground/ink'
import type { HarpHandle, SoundState } from '@/components/playground/harp'
import type { LoomHandle } from '@/components/playground/loom'
import { CAVE_SOURCE } from '@/lib/playground/cave.mjs'
import { play, useRunning } from '@/lib/playground/motion'

/**
 * Playground «Un hilo»: cuatro instrumentos hechos con los materiales del
 * estudio, cada uno con la forma de su material sobre una retícula de 12
 * columnas, unidos por un solo hilo rojo que sale del carrete (las cuerdas
 * del diamante de la escena persistente) y se dibuja con el scroll.
 */

/** Mientras carga una pieza: el marco ya tiene su tamaño, con viñeta y verbo. */
function Loading({ verb }: { verb: string }) {
  return (
    <div role="status" aria-live="polite" className="absolute inset-0 flex items-center justify-center gap-3 bg-canvas-muted">
      <SignalBullet size="sm" />
      <span className="animate-pulse font-mono text-caption-mono-sm uppercase text-ink-subtle">{verb}</span>
    </div>
  )
}

const InkStage = nextDynamic(() => import('@/components/playground/ink').then((m) => m.InkStage), {
  ssr: false,
  loading: () => <Loading verb="growing ink" />,
})
const FieldStage = nextDynamic(() => import('@/components/playground/field').then((m) => m.FieldStage), {
  ssr: false,
  loading: () => <Loading verb="laying out the text" />,
})
const HarpStage = nextDynamic(() => import('@/components/playground/harp').then((m) => m.HarpStage), {
  ssr: false,
  loading: () => <Loading verb="tuning strings" />,
})
const LoomStage = nextDynamic(() => import('@/components/playground/loom').then((m) => m.LoomStage), {
  ssr: false,
  loading: () => <Loading verb="threading the loom" />,
})

const INTRO = "Four instruments built from the studio's materials: ink, text, strings and thread."
const ENGRAVING =
  'https://commons.wikimedia.org/wiki/File:Socrates._Line_engraving_by_D._Cunego,_1783,_after_A._R._Men_Wellcome_V0005527.jpg'

// La retícula: dos pistas laterales flexibles y las 12 columnas del contenedor
// de 1280 px. Una pieza puede sangrar hasta la orilla sin usar 100vw (que en
// Windows mide también la barra de scroll). En celular, una columna.
const ROW =
  'px-5 sm:px-8 lg:grid lg:gap-x-6 lg:px-0 lg:[grid-template-columns:minmax(16px,1fr)_repeat(12,minmax(0,78px))_minmax(16px,1fr)]'
// En las fichas, cada dato va junto (espacios duros) y el renglón solo se corta después de un «·».
// Un ancla del hilo: un punto sin tamaño (el hilo lo mide; el clavito lo dibuja <Thread />).
const ANCHOR = 'pointer-events-none absolute h-0 w-0'
const BUTTON =
  'rounded-md border border-line-strong px-3 py-2 font-mono text-caption-mono-sm uppercase tracking-wider text-ink-muted transition-colors duration-150 ease-out hover:text-signal disabled:cursor-not-allowed disabled:opacity-60'

/** El bloque de texto de una pieza: nombre, descripción, ficha técnica e instrucción. */
function PieceText({
  id,
  name,
  children,
  spec,
  action,
  after,
}: {
  id: string
  name: string
  children: ReactNode
  spec: ReactNode
  action: string
  after?: ReactNode
}) {
  return (
    <div className="pl-6 lg:pl-0">
      <h2 id={id} className="font-display text-[28px] leading-none lg:text-[34px]">
        {name}
      </h2>
      <p className="mt-4 max-w-[34ch] text-[17px] leading-relaxed text-ink-muted">{children}</p>
      <p className="mt-5 font-mono text-caption-mono-sm uppercase text-ink-subtle">{spec}</p>
      <p className="mt-3 flex items-center gap-3 font-mono text-caption-mono-sm uppercase text-signal">
        <SignalBullet size="sm" />
        {action}
      </p>
      {after}
    </div>
  )
}

export function PlaygroundClient() {
  const running = useRunning()
  const ink = useRef<InkHandle>(null)
  const harp = useRef<HarpHandle>(null)
  const loom = useRef<LoomHandle>(null)
  const [glyphs, setGlyphs] = useState(0)
  const [sound, setSound] = useState<SoundState | null>(null)
  const [notes, setNotes] = useState<string[]>([])

  return (
    <main id="main-content" className="relative min-h-screen overflow-x-clip text-white">
      <ClientOnly>
        <Nav />
      </ClientOnly>

      <article className="relative pb-28 lg:pb-40">
        <Thread />

        {/* Ink: la portada, a todo lo ancho. */}
        <section aria-labelledby="pg-ink">
          <div className="relative aspect-[4/5] w-full sm:aspect-auto sm:h-[clamp(420px,42vw,640px)]">
            <InkStage handle={ink} />
          </div>

          <div className={`mt-10 grid grid-cols-[104px_minmax(0,1fr)] gap-x-5 gap-y-14 lg:mt-14 lg:gap-y-0 ${ROW}`}>
            <div className="col-start-2 row-start-1 self-center lg:[grid-column:2/7]">
              <h1 className="flex items-center gap-3 font-mono text-caption-mono uppercase text-signal">
                <SignalBullet />
                Playground
              </h1>
              <p className="mt-4 max-w-[30ch] text-[19px] leading-snug text-ink lg:text-[22px]">{INTRO}</p>
              {!running && (
                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="font-mono text-caption-mono-sm uppercase text-ink-subtle">Motion is reduced on your device.</p>
                  <button type="button" onClick={play} className={BUTTON}>
                    Play the pieces
                  </button>
                </div>
              )}
            </div>

            {/* El carrete: aquí las 200 cuerdas de la escena se enrollan y de aquí sale el hilo. */}
            <div className="col-start-1 row-start-1 self-center lg:[grid-column:7/9]">
              <div data-scene-cover="" aria-hidden className="relative mx-auto h-[104px] w-[104px] lg:h-[132px] lg:w-[132px]">
                <i data-thread="spool" className={`${ANCHOR} left-0 top-1/2 lg:left-1/2 lg:top-full`} />
              </div>
            </div>

            <div className="col-span-2 row-start-2 lg:row-start-1 lg:[grid-column:9/13]">
              <PieceText
                id="pg-ink"
                name="Ink"
                spec={'Gray–Scott\u00a0reaction–diffusion · f\u00a00.029 · k\u00a00.057'}
                action="Drag to drop ink"
                after={<InkWordInput onWord={(w) => ink.current?.setWord(w)} className="mt-7 max-w-[280px]" />}
              >
                The studio&apos;s motto, grown in ink. The word changes on its own; write your own and the ink regrows around it.
              </PieceText>
            </div>
          </div>
        </section>

        {/* Field: una página de libro. */}
        <section aria-labelledby="pg-field" className={`mt-28 lg:mt-40 ${ROW}`}>
          <div className="relative aspect-[2/3] w-[82%] rounded-[6px] border border-line-strong lg:w-auto lg:[grid-column:3/8]">
            <div className="absolute inset-0 overflow-hidden rounded-[6px]">
              <FieldStage onGlyphs={setGlyphs} />
            </div>
            <i data-thread="field-in" className={`${ANCHOR} left-0 top-0 lg:left-auto lg:right-0`} />
            <i data-thread="field-out" className={`${ANCHOR} bottom-0 left-0 lg:left-auto lg:right-0`} />
          </div>
          <div className="mt-10 lg:mt-0 lg:self-center lg:[grid-column:9/13]">
            <PieceText
              id="pg-field"
              name="Field"
              spec={glyphs ? `Magnetic\u00a0dipole · ${glyphs.toLocaleString('en-US')}\u00a0glyphs` : 'Magnetic\u00a0dipole'}
              action="Drag the magnet"
              after={<p className="mt-7 font-mono text-caption-mono-sm uppercase text-ink-faint">{CAVE_SOURCE}</p>}
            >
              Plato&apos;s cave as iron filings. Drag the magnet and every letter turns to follow the field, then settles back into
              its line.
            </PieceText>
          </div>
        </section>

        {/* Harp: un instrumento ancho que se sale del margen derecho. */}
        <section aria-labelledby="pg-harp" className={`mt-28 lg:mt-40 ${ROW}`}>
          <div className="-mr-5 sm:-mr-8 lg:mr-0 lg:self-start lg:[grid-column:5/-1] lg:[grid-row:1]">
            <div className="relative aspect-[4/5] rounded-l-[20px] border-y border-l border-line-strong lg:aspect-[16/9]">
              <div className="absolute inset-0 overflow-hidden rounded-l-[20px]">
                <HarpStage handle={harp} onSound={setSound} onNote={(n) => setNotes((l) => [...l.slice(-4), n])} />
              </div>
              {/* Entra por arriba, sobre la clavija, y sale por la punta de abajo del diamante:
                  en 16:9 la punta queda al 87.5 % del alto + 10.5 px (harp-engine: cy + 3 s). */}
              <i data-thread="harp-in" className={`${ANCHOR} left-0 top-6 lg:left-1/2 lg:top-0`} />
              <i data-thread="harp-out" className={`${ANCHOR} bottom-6 left-0 lg:bottom-auto lg:left-1/2 lg:top-[calc(87.5%+10.5px)]`} />
            </div>
            <p
              aria-live="off"
              className="mt-3 min-h-[1.4em] pl-6 font-mono text-caption-mono-sm uppercase tracking-[0.3em] text-ink-subtle lg:pl-0"
            >
              {notes.join(' · ')}
            </p>
          </div>
          <div className="mt-7 lg:mt-0 lg:self-center lg:[grid-column:2/5] lg:[grid-row:1]">
            <PieceText
              id="pg-harp"
              name="Harp"
              spec={'200\u00a0strings · Raga\u00a0Malkauns · plucked\u00a0synthesis'}
              action="Sweep across the strings"
              after={
                sound && (
                  <button
                    type="button"
                    disabled={sound === 'unavailable'}
                    onClick={() => harp.current?.setSound(sound !== 'on')}
                    className={`mt-7 ${BUTTON}`}
                  >
                    {sound === 'unavailable' ? 'No sound in this browser' : sound === 'on' ? 'Sound off' : 'Sound on'}
                  </button>
                )
              }
            >
              The diamond&apos;s 200 strings, tuned to a night raga. It asks before it makes a sound.
            </PieceText>
          </div>
        </section>

        {/* Loom: un aro de clavos. */}
        <section aria-labelledby="pg-loom" className={`mt-28 lg:mt-40 ${ROW}`}>
          <div className="relative aspect-square rounded-[20px] border border-line-strong lg:[grid-column:3/9]">
            <div className="absolute inset-0 overflow-hidden rounded-[20px]">
              <LoomStage handle={loom} />
            </div>
            {/* Termina en el clavo de arriba del aro (en celular, en el de la izquierda). */}
            <i data-thread="loom-in" className={`${ANCHOR} left-[5%] top-1/2 lg:left-1/2 lg:top-[5%]`} />
          </div>
          <div className="mt-10 lg:mt-0 lg:self-center lg:[grid-column:9/13]">
            <PieceText
              id="pg-loom"
              name="Loom"
              spec={'300\u00a0pins · one\u00a0thread · it stops when no thread improves the portrait'}
              action="Hold to weave faster"
              after={
                <>
                  <LoomSourcePicker loom={loom} className="mt-7" />
                  <p className="mt-7 max-w-[44ch] text-[13px] leading-relaxed text-ink-subtle">
                    Socrates,{' '}
                    <a
                      href={ENGRAVING}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-line-strong underline-offset-4 transition-colors hover:text-signal"
                    >
                      engraving by Domenico Cunego, 1783
                    </a>
                    , after Anton Raphael Mengs. Wellcome Collection,{' '}
                    <a
                      href="https://creativecommons.org/licenses/by/4.0/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-line-strong underline-offset-4 transition-colors hover:text-signal"
                    >
                      CC BY 4.0
                    </a>
                    .
                  </p>
                </>
              }
            >
              One red thread and 300 pins weave Socrates while you watch.
            </PieceText>
          </div>
        </section>
      </article>

      <ClientOnly>
        <Footer />
      </ClientOnly>
    </main>
  )
}
