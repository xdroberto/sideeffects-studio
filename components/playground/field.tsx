'use client'

import { useCallback, useRef } from 'react'
import { usePiece } from './use-piece'
import { createField } from './field-engine'
import { PieceFallback } from './piece-fallback'

/**
 * Field: la alegoría de la caverna como limaduras de hierro alrededor de un
 * imán. El imán es un botón: se arrastra con el mouse o el dedo (solo ahí se
 * corta el scroll táctil) y se mueve con las flechas.
 */
export function FieldStage({ onGlyphs, className = '' }: { onGlyphs?: (count: number) => void; className?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const magnet = useRef<HTMLButtonElement>(null)
  const glyphs = useRef(onGlyphs)
  glyphs.current = onGlyphs
  const make = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (!magnet.current) throw new Error('The magnet is missing.')
      return createField(canvas, { magnet: magnet.current, onGlyphs: (n) => glyphs.current?.(n) })
    },
    [],
  )
  const { failed } = usePiece(host, make, {
    label: "Plato's allegory of the cave set as iron filings around a red magnet",
  })

  return (
    <div ref={host} className={`relative h-full w-full touch-pan-y overflow-hidden bg-canvas ${className}`}>
      <button
        ref={magnet}
        type="button"
        aria-label="Magnet. Drag it, or move it with the arrow keys."
        className="absolute left-0 top-0 z-[2] cursor-grab touch-none rounded-full border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white data-[grabbing]:cursor-grabbing"
      />
      {failed && <PieceFallback />}
    </div>
  )
}
