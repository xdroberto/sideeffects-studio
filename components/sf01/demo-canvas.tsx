'use client'

import { Canvas } from '@react-three/fiber'
import { useRef, useCallback, type PointerEvent } from 'react'
import { VoronoiMesh, type ShaderPalette } from './voronoi-preview'
import { ReactionDiffusionMesh, type SeedPoint } from './reaction-diffusion-preview'
import type { ShaderId } from '@/lib/sf01/preview-config'

// Distancia mínima entre seeds consecutivos (UV space, ~2% del canvas).
// Evita saturar la queue con frames consecutivos del mismo punto cuando
// el user mueve el dedo despacio. Constante a nivel módulo para que
// useCallback no tenga deps spurious.
const DIST_SQ_MIN = 0.02 * 0.02

interface DemoCanvasProps {
  shaderId: ShaderId
  values: Record<string, number>
  palette: ShaderPalette
  /**
   * Si true, el canvas escucha pointer events para inyectar seeds en
   * la simulación. Cuando false (e.g. Voronoi activo), el canvas
   * permite scroll/touch natural — el user no se siente bloqueado.
   */
  acceptsPointerSeeds: boolean
  /** Incrementar para limpiar la simulación RD. */
  resetKey?: number
  className?: string
}

/**
 * Canvas unificado del demo SF-01. Un solo contexto WebGL que aloja
 * VoronoiMesh o ReactionDiffusionMesh según el shader activo. El switch
 * mount/unmount es barato (Voronoi sin estado; RD recrea FBOs).
 *
 * Pointer events:
 * - Solo cuando `acceptsPointerSeeds` (RD activo). Si no, no se monta
 *   pointer-capture y la página scrollea normal en mobile.
 * - setPointerCapture en pointerdown garantiza que recibimos los moves
 *   aunque el dedo/cursor salga del rect del canvas.
 * - Throttle por distancia mínima en UV space (~2% del canvas) para
 *   evitar saturar la queue con frames consecutivos del mismo punto.
 */
export function DemoCanvas({
  shaderId,
  values,
  palette,
  acceptsPointerSeeds,
  resetKey = 0,
  className,
}: DemoCanvasProps) {
  const seedQueueRef = useRef<SeedPoint[]>([])
  const pointerDownRef = useRef(false)
  const lastSeedRef = useRef<SeedPoint | null>(null)

  const pushSeedFromPointer = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = (e.clientX - rect.left) / rect.width
    // FBO usa UV con Y up (GL convention); CSS usa Y down. Flip.
    const y = 1 - (e.clientY - rect.top) / rect.height
    if (x < 0 || x > 1 || y < 0 || y > 1) return

    const last = lastSeedRef.current
    if (last) {
      const dx = x - last.x
      const dy = y - last.y
      if (dx * dx + dy * dy < DIST_SQ_MIN) return
    }
    const seed = { x, y }
    lastSeedRef.current = seed
    seedQueueRef.current.push(seed)
  }, [])

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!acceptsPointerSeeds) return
    pointerDownRef.current = true
    lastSeedRef.current = null // tap inmediato (no skip por distancia)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Algunos navegadores rechazan setPointerCapture si el evento
      // ya está siendo capturado por otro elemento — no crítico.
    }
    pushSeedFromPointer(e)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!acceptsPointerSeeds) return
    if (!pointerDownRef.current) return
    pushSeedFromPointer(e)
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointerDownRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* no-op */
    }
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        // touchAction: pan-y permite que el user scrollee vertical sobre
        // el canvas (no se siente atrapado). Tap → seed, horizontal-drag →
        // continuous seed, vertical swipe → scroll de página. Cuando
        // Voronoi está activo no hay capture, scroll natural.
        touchAction: acceptsPointerSeeds ? 'pan-y' : 'auto',
        cursor: acceptsPointerSeeds ? 'crosshair' : 'default',
        userSelect: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        orthographic
        camera={{ position: [0, 0, 1], near: 0, far: 2 }}
      >
        {shaderId === 'voronoi' && <VoronoiMesh values={values} palette={palette} />}
        {shaderId === 'reaction-diffusion' && (
          <ReactionDiffusionMesh
            values={values}
            palette={palette}
            seedQueueRef={seedQueueRef}
            resetKey={resetKey}
          />
        )}
      </Canvas>
    </div>
  )
}
