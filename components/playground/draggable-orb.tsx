'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Float, Icosahedron } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Orb arrastrable mobile-aware. Pensado para vivir en una sección
 * concreta de `/playground`, no fullscreen.
 *
 * Decisiones mobile:
 * - `frameloop="demand"` cuando idle → no quema batería renderizando
 *   un cubo estático en cada vsync.
 * - Drag con pointer events; el container usa `touch-action: none` solo
 *   sobre el área del canvas, así el resto de la página scrollea libre.
 * - dpr cap 1.5 para no fundir GPUs móviles.
 * - Restringimos el desplazamiento del orb a un cuadrado pequeño en
 *   world units → no escapa del card.
 */

interface OrbProps {
  /** Color base. */
  color?: string
  /** Color emisivo (rojo del logo por default). */
  emissive?: string
  /** Tamaño en world units. */
  radius?: number
  /** Callback cuando cambia la posición normalizada (-1..1). */
  onPositionChange?: (pos: { x: number; y: number }) => void
}

function Orb({
  color = '#1a1a1a',
  emissive = '#dc2626',
  radius = 1.2,
  onPositionChange,
}: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0])
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  // Rango permitido en world units (cuadrado simétrico).
  const RANGE_X = 1.6
  const RANGE_Y = 0.8

  useFrame((_state, delta) => {
    if (meshRef.current && !dragging) {
      meshRef.current.rotation.x += delta * 0.2
      meshRef.current.rotation.y += delta * 0.25
    }
  })

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: position[0], oy: position[1] }
  }

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return
    const dx = (e.clientX - dragStart.current.x) * 0.012
    const dy = (e.clientY - dragStart.current.y) * 0.012
    const nextX = Math.max(-RANGE_X, Math.min(RANGE_X, dragStart.current.ox + dx))
    const nextY = Math.max(-RANGE_Y, Math.min(RANGE_Y, dragStart.current.oy - dy))
    setPosition([nextX, nextY, 0])
    onPositionChange?.({ x: nextX / RANGE_X, y: nextY / RANGE_Y })
  }

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    setDragging(false)
  }

  return (
    <Float
      speed={dragging ? 0 : 1.4}
      rotationIntensity={0.5}
      floatIntensity={0.7}
      enabled={!dragging}
    >
      <Icosahedron
        ref={meshRef}
        args={[radius, 1]}
        position={position}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={dragging ? 0.55 : 0.32}
          flatShading
          roughness={0.55}
          metalness={0.25}
        />
      </Icosahedron>
    </Float>
  )
}

export interface DraggableOrbProps extends OrbProps {
  className?: string
  /**
   * Si está activo, escucha pointer global y mantiene el frameloop on-demand.
   * Cuando está fuera de viewport pausa el render.
   */
  pauseOffscreen?: boolean
}

export function DraggableOrb({ className, pauseOffscreen = true, ...orbProps }: DraggableOrbProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)

  useEffect(() => {
    if (!pauseOffscreen || !wrapperRef.current) return
    const obs = new IntersectionObserver(
      entries => setInView(entries[0]?.isIntersecting ?? true),
      { threshold: 0 },
    )
    obs.observe(wrapperRef.current)
    return () => obs.disconnect()
  }, [pauseOffscreen])

  const canvasProps = useMemo(
    () => ({
      camera: { position: [0, 0, 5] as [number, number, number], fov: 45 },
      dpr: [1, 1.5] as [number, number],
      gl: { antialias: true, powerPreference: 'low-power' as const },
    }),
    [],
  )

  return (
    <div
      ref={wrapperRef}
      className={className}
      // touch-action: none SOLO sobre el canvas → el orb se puede arrastrar
      // en mobile sin scrollear la página. El resto del playground scrollea
      // normal porque este estilo está en este wrapper, no en body.
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <Canvas
        {...canvasProps}
        frameloop={inView ? 'always' : 'never'}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 4, 5]} intensity={0.85} color="#ffffff" />
        <directionalLight position={[-3, -2, -2]} intensity={0.4} color="#dc2626" />
        <Orb {...orbProps} />
      </Canvas>
    </div>
  )
}
