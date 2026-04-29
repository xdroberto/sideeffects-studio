'use client'

import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Orb arrastrable mobile-aware.
 *
 * Decisiones:
 * - Icosaedro low-poly con material standard + emisivo rojo. Float de
 *   drei lo hace flotar/rotar suavemente cuando no se está arrastrando.
 * - Cursor `grab` en reposo, `grabbing` mientras se arrastra (lo
 *   ponemos también en body para que persista mientras drag fuera).
 * - `touch-action: none` SOLO sobre el wrapper del canvas → la página
 *   scrollea normal en mobile fuera de esta zona.
 * - `frameloop="always"` siempre. Probamos pause-offscreen via
 *   IntersectionObserver pero R3F + Next Fast Refresh acumulan
 *   contextos WebGL fantasma cuando frameloop oscila, lo que rompe
 *   el render tras varios hot-reloads. En producción no hay churn,
 *   y el browser pausa rAF en tabs ocultos automáticamente.
 * - Los `children` se renderizan absolute encima del canvas con
 *   `pointer-events: none` → badges/labels que no interfieren con drag.
 */

interface OrbProps {
  color?: string
  emissive?: string
  radius?: number
  /** Callback con la posición normalizada (-1..1). */
  onPositionChange?: (pos: { x: number; y: number }) => void
}

function Orb({
  color = '#1a1a1a',
  emissive = '#dc2626',
  radius = 1.3,
  onPositionChange,
}: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0])
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const RANGE_X = 1.4
  const RANGE_Y = 0.9

  useFrame((_state, delta) => {
    if (meshRef.current && !dragging) {
      meshRef.current.rotation.x += delta * 0.22
      meshRef.current.rotation.y += delta * 0.28
    }
  })

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: position[0], oy: position[1] }
    document.body.style.cursor = 'grabbing'
  }

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return
    const dx = (e.clientX - dragStart.current.x) * 0.013
    const dy = (e.clientY - dragStart.current.y) * 0.013
    const nextX = Math.max(-RANGE_X, Math.min(RANGE_X, dragStart.current.ox + dx))
    const nextY = Math.max(-RANGE_Y, Math.min(RANGE_Y, dragStart.current.oy - dy))
    setPosition([nextX, nextY, 0])
    onPositionChange?.({ x: nextX / RANGE_X, y: nextY / RANGE_Y })
  }

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    setDragging(false)
    document.body.style.cursor = ''
  }

  return (
    <Float
      speed={dragging ? 0 : 1.4}
      rotationIntensity={0.5}
      floatIntensity={0.7}
      enabled={!dragging}
    >
      <mesh
        ref={meshRef}
        position={position}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <icosahedronGeometry args={[radius, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={dragging ? 0.7 : 0.45}
          flatShading
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>
    </Float>
  )
}

export interface DraggableOrbProps extends OrbProps {
  className?: string
  /**
   * Cuando hay children, se renderizan absolute encima del canvas (sin
   * pointer events) — útil para badges, hints o un borde decorativo.
   */
  children?: React.ReactNode
}

export function DraggableOrb({
  className,
  children,
  ...orbProps
}: DraggableOrbProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

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
      style={{
        // touch-action: none SOLO sobre el área del orb. La página scrollea fuera.
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: 'grab',
        position: 'relative',
        // overflow-hidden integrado: nadie tiene que recordar pasarlo
        overflow: 'hidden',
      }}
    >
      <Canvas
        {...canvasProps}
        frameloop="always"
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 5]} intensity={1.0} color="#ffffff" />
        <directionalLight position={[-3, -2, -2]} intensity={0.5} color="#dc2626" />
        <pointLight position={[0, 0, 4]} intensity={0.6} color="#ffffff" />
        <Orb {...orbProps} />
      </Canvas>
      {children && (
        <div
          // Decoración encima sin interceptar drag
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
