'use client'

import { useCallback, useImperativeHandle, useRef, type Ref } from 'react'
import { usePiece } from './use-piece'
import { createLoom, type LoomCount, type LoomPiece, type LoomSource } from './loom-engine'
import { PieceFallback } from './piece-fallback'

export type LoomHandle = { weave(source: LoomSource): void; restart(): void }

const fmt = (n: number) => n.toLocaleString('en-US')

function describe(c: LoomCount) {
  if (!c.finished) return `Weaving ${c.label}: thread ${fmt(c.done + 1)}, pin ${c.from} → ${c.to}`
  const km = (c.meters / 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const label = c.label[0].toUpperCase() + c.label.slice(1)
  return `${label}: ${fmt(c.done)} threads, ${km} km of thread on a 60 cm hoop with ${c.pins} pins`
}

/**
 * Loom: el aro de 300 clavos y su contador en vivo. Empieza tejiendo a
 * Sócrates. Se controla con `handle` (next/dynamic no pasa refs).
 */
export function LoomStage({ handle, className = '' }: { handle?: Ref<LoomHandle>; className?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const counter = useRef<HTMLParagraphElement>(null)
  const make = useCallback((canvas: HTMLCanvasElement) => {
    let shown = ''
    const loom = createLoom(canvas, {
      // El contador se escribe directo en el DOM: cambia decenas de veces por segundo.
      onCount: (c) => {
        const text = describe(c)
        if (text !== shown && counter.current) counter.current.textContent = shown = text
      },
      onError: () => {
        shown = ''
        if (counter.current) counter.current.textContent = "That image couldn't be opened. Try a JPG or PNG photo."
      },
    })
    loom.weave('socrates')
    return loom
  }, [])
  const { piece, failed } = usePiece(host, make, {
    label: 'A portrait woven with one red thread on a hoop of 300 pins',
  })
  useImperativeHandle(
    handle,
    () => ({
      weave: (source) => (piece.current as LoomPiece | null)?.weave(source),
      restart: () => (piece.current as LoomPiece | null)?.restart(),
    }),
    [piece],
  )

  return (
    <div ref={host} className={`relative h-full w-full touch-pan-y overflow-hidden bg-canvas ${className}`}>
      <p
        ref={counter}
        aria-live="off"
        className="pointer-events-none absolute inset-x-3 bottom-2.5 z-[2] m-0 font-mono text-[11px] leading-snug text-[rgba(239,232,229,0.72)] [font-variant-numeric:tabular-nums]"
      />
      {failed && <PieceFallback />}
    </div>
  )
}
