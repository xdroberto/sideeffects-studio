'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ReflowingParagraph } from './reflowing-paragraph'
import { DragObstacle } from './drag-obstacle'

interface ReflowCanvasProps {
  text: string
  /** Tamaño del texto (px). */
  fontSize: number
  /** Altura de línea (px). */
  lineHeight?: number
  /**
   * Aspect ratio mínimo del canvas (width/height). Si el texto al
   * reflujear genera más alto del que el aspect produce, el canvas
   * crece para que NUNCA se recorte el contenido. Esto es vital en
   * mobile, donde columnas estrechas implican muchas más líneas.
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
 * El canvas se dimensiona como `max(aspectHeight, textHeight + padding)`
 * para que el texto nunca se recorte aun cuando el ancho disponible
 * (mobile) genere muchas líneas.
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
  const [width, setWidth] = useState(800)
  const [textHeight, setTextHeight] = useState(0)
  const [obstacle, setObstacle] = useState({ cx: 200, cy: 200 })
  const initialized = useRef(false)

  // Padding inferior para que la última línea no toque el borde.
  const VERTICAL_PADDING = 16

  // Altura final = max(aspectHeight, textHeight + padding, obstacleDiameter + padding).
  const aspectHeight = Math.round(width / aspect)
  const minByObstacle = obstacleRadius * 2 + 32
  const minByText = textHeight + VERTICAL_PADDING * 2
  const height = Math.max(aspectHeight, minByText, minByObstacle)

  // Medir wrapper y reaccionar a resize.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w <= 0) return
      setWidth(w)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Inicializar / clampear posición del obstáculo al cambiar bounds.
  useEffect(() => {
    if (!initialized.current && width > 0 && height > 0) {
      setObstacle({ cx: width * 0.62, cy: Math.min(height * 0.4, height - obstacleRadius - 16) })
      initialized.current = true
      return
    }
    setObstacle(o => ({
      cx: Math.max(obstacleRadius, Math.min(width - obstacleRadius, o.cx)),
      cy: Math.max(obstacleRadius, Math.min(height - obstacleRadius, o.cy)),
    }))
  }, [width, height, obstacleRadius])

  const onLayoutHeight = useCallback((h: number) => setTextHeight(h), [])

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        overflow: 'hidden',
      }}
    >
      <ReflowingParagraph
        text={text}
        fontSize={fontSize}
        lineHeight={lineHeight}
        width={width}
        color={color}
        obstacle={{ cx: obstacle.cx, cy: obstacle.cy, radius: obstacleRadius + 16 }}
        onLayoutHeight={onLayoutHeight}
        className={className}
      />
      <DragObstacle
        cx={obstacle.cx}
        cy={obstacle.cy}
        radius={obstacleRadius}
        bounds={{ width, height }}
        onChange={setObstacle}
        color={obstacleColor}
        ringColor={obstacleRingColor}
        label={obstacleLabel}
      />
    </div>
  )
}
