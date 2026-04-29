'use client'

import { useEffect, useRef, useState } from 'react'
import { ReflowingParagraph } from './reflowing-paragraph'
import { DragObstacle } from './drag-obstacle'

interface ReflowCanvasProps {
  text: string
  /** Tamaño del texto (px). */
  fontSize: number
  /** Altura de línea (px). */
  lineHeight?: number
  /**
   * Aspect ratio del canvas (width/height). El componente ocupa 100%
   * del ancho del padre y calcula la altura para el aspect dado.
   * Recortable si el texto excede.
   * @default 16/9
   */
  aspect?: number
  /** Radio inicial del obstáculo (px). */
  obstacleRadius?: number
  /** className aplicada al wrapper exterior — define la fuente. */
  className?: string
  /** Color del texto. */
  color?: string
  /** Color del obstáculo. */
  obstacleColor?: string
  /** Label dentro del obstáculo. */
  obstacleLabel?: string
  /** Color del aro del obstáculo. */
  obstacleRingColor?: string
}

/**
 * Demo central de pretext: un párrafo + un obstáculo que se arrastra,
 * y el texto re-rompe en tiempo real alrededor.
 *
 * Mide su propio ancho con ResizeObserver para ser responsive.
 * En mobile, el obstáculo se restringe al rect del canvas. Como su
 * `touch-action: none` es local, el resto de la página scrollea libre.
 */
export function ReflowCanvas({
  text,
  fontSize,
  lineHeight,
  aspect = 16 / 9,
  obstacleRadius = 90,
  className,
  color = 'white',
  obstacleColor = '#dc2626',
  obstacleLabel,
  obstacleRingColor = '#ffffff',
}: ReflowCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [obstacle, setObstacle] = useState({ cx: 200, cy: 200 })
  const initialized = useRef(false)

  // Medir wrapper y reaccionar a resize.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w <= 0) return
      const h = Math.round(w / aspect)
      setSize({ width: w, height: h })
      if (!initialized.current) {
        // Posición inicial: ligeramente arriba a la derecha del centro.
        setObstacle({ cx: w * 0.62, cy: h * 0.4 })
        initialized.current = true
      } else {
        // En resize: clampear el obstáculo dentro del nuevo bound.
        setObstacle(o => ({
          cx: Math.max(obstacleRadius, Math.min(w - obstacleRadius, o.cx)),
          cy: Math.max(obstacleRadius, Math.min(h - obstacleRadius, o.cy)),
        }))
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [aspect, obstacleRadius])

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: `${size.height}px`,
        overflow: 'hidden',
      }}
    >
      <ReflowingParagraph
        text={text}
        fontSize={fontSize}
        lineHeight={lineHeight}
        width={size.width}
        color={color}
        obstacle={{ cx: obstacle.cx, cy: obstacle.cy, radius: obstacleRadius + 16 }}
        className={className}
      />
      <DragObstacle
        cx={obstacle.cx}
        cy={obstacle.cy}
        radius={obstacleRadius}
        bounds={size}
        onChange={setObstacle}
        color={obstacleColor}
        ringColor={obstacleRingColor}
        label={obstacleLabel}
      />
    </div>
  )
}
