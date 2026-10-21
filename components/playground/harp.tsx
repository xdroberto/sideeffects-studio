'use client'

import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { usePiece } from './use-piece'
import { createHarp, type HarpPiece } from './harp-engine'
import { PieceFallback } from './piece-fallback'

// La respuesta al permiso de sonido dura lo que la pestaña.
const ANSWER_KEY = 'playground:harp-sound'
type Answer = 'on' | 'off'

function readAnswer(): Answer | null {
  try {
    const v = sessionStorage.getItem(ANSWER_KEY)
    return v === 'on' || v === 'off' ? v : null
  } catch {
    return null
  }
}

function saveAnswer(a: Answer) {
  try {
    sessionStorage.setItem(ANSWER_KEY, a)
  } catch {
    // Sin almacenamiento, se vuelve a preguntar la próxima vez.
  }
}

export type HarpHandle = { setSound(on: boolean): boolean }
export type SoundState = 'on' | 'off' | 'unavailable'

const BUTTON = 'rounded-md px-3 py-2 font-mono text-caption-mono-sm uppercase tracking-wider transition-colors duration-150 ease-out'

/**
 * Harp: el diamante de cuerdas como instrumento. La primera vez que entra en
 * pantalla pregunta si puede sonar; la clavija secreta también es un botón
 * para el teclado («Turn the peg»). Se controla con `handle` (next/dynamic no
 * pasa refs).
 */
export function HarpStage({
  handle,
  onNote,
  onSound,
  className = '',
}: {
  handle?: Ref<HarpHandle>
  onNote?: (sargam: string) => void
  onSound?: (state: SoundState) => void
  className?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const peg = useRef<HTMLButtonElement>(null)
  const note = useRef(onNote)
  note.current = onNote
  const sound = useRef(onSound)
  sound.current = onSound
  const [asking, setAsking] = useState(false)
  const askId = useId()

  const make = useCallback((canvas: HTMLCanvasElement) => {
    if (!peg.current) throw new Error('The peg is missing.')
    return createHarp(canvas, { peg: peg.current, onNote: (n) => note.current?.(n), wantsSound: readAnswer() === 'on' })
  }, [])
  const { piece, failed } = usePiece(host, make, {
    label: "The diamond's 200 strings as an instrument, with a small peg at the top",
    className: 'absolute inset-0 block h-full w-full cursor-crosshair',
  })

  const setSound = useCallback(
    (on: boolean) => {
      const p = piece.current as HarpPiece | null
      const playing = p ? p.setSound(on) : false
      saveAnswer(playing ? 'on' : 'off')
      sound.current?.(playing ? 'on' : on ? 'unavailable' : 'off')
      return playing
    },
    [piece],
  )
  useImperativeHandle(handle, () => ({ setSound }), [setSound])

  useEffect(() => {
    const answer = readAnswer()
    if (answer) {
      // Ya respondió en esta sesión: no se vuelve a preguntar.
      sound.current?.(answer)
      return
    }
    const el = host.current
    if (!el) return
    // Se pregunta cuando el Harp cruza la franja central de la pantalla: en un
    // celular horizontal el escenario mide más del doble de la ventana y una
    // fracción visible fija (p. ej. 0.5) nunca se alcanzaría.
    const io = new IntersectionObserver(
      (es) => {
        if (!es[es.length - 1].isIntersecting) return
        setAsking(true)
        io.disconnect()
      },
      { rootMargin: '-35% 0px -35% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const answer = (yes: boolean) => {
    setAsking(false)
    setSound(yes)
  }

  return (
    <div ref={host} className={`relative h-full w-full touch-pan-y overflow-hidden bg-canvas ${className}`}>
      <button
        ref={peg}
        type="button"
        aria-label="Turn the peg"
        className="pointer-events-none absolute left-0 top-0 z-[2] rounded-full border-0 bg-transparent p-0 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      />
      {asking && !failed && (
        <div
          role="group"
          aria-labelledby={askId}
          className="absolute bottom-4 left-1/2 z-[3] grid w-max max-w-[calc(100%-32px)] -translate-x-1/2 justify-items-center gap-3 rounded-[14px] border border-line-strong bg-black/85 px-5 py-4 text-center backdrop-blur-sm"
        >
          <p id={askId} className="text-[15px] text-ink">
            This piece makes sound. Listen?
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => answer(true)} className={`${BUTTON} bg-signal text-black hover:bg-signal-hover`}>
              Yes, with sound
            </button>
            <button type="button" onClick={() => answer(false)} className={`${BUTTON} border border-line-strong text-ink-muted hover:text-signal`}>
              In silence
            </button>
          </div>
        </div>
      )}
      {failed && <PieceFallback />}
    </div>
  )
}
