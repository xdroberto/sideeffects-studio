'use client'

import { useCallback, useImperativeHandle, useRef, type Ref } from 'react'
import { usePiece } from './use-piece'
import { createInk, type InkPiece } from './ink-engine'
import { PieceFallback } from './piece-fallback'

export type InkHandle = { setWord(word: string): void }

/**
 * Ink: la palabra rodeada de tinta en laberinto. Llena su contenedor. Se
 * controla con `handle` (next/dynamic no pasa refs).
 */
export function InkStage({ handle, className = '' }: { handle?: Ref<InkHandle>; className?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const make = useCallback((canvas: HTMLCanvasElement) => createInk(canvas), [])
  const { piece, failed } = usePiece(host, make, {
    maxDpr: 1.5,
    label: 'A word surrounded by a maze of red ink that grows from its letters',
  })
  useImperativeHandle(handle, () => ({ setWord: (word) => (piece.current as InkPiece | null)?.setWord(word) }), [piece])

  return (
    <div ref={host} className={`relative h-full w-full cursor-crosshair touch-pan-y overflow-hidden bg-canvas ${className}`}>
      {failed && <PieceFallback />}
    </div>
  )
}
