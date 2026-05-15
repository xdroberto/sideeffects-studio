'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReflowingParagraph } from './reflowing-paragraph'
import { DragObstacle } from './drag-obstacle'

export interface ReflowParagraphConfig {
  text: string
  fontSize: number
  lineHeight?: number
  color?: string
  /** className override por paragraph (fuente, peso). Fallback al className del canvas. */
  className?: string
  /**
   * Gap (px) por encima de este paragraph. Override del `paragraphGap`
   * default del canvas. Útil para jerarquías visuales (e.g. más espacio
   * entre eyebrow y h1 que entre h1 y body). Ignorado para el primer
   * paragraph (que usa solo el padding superior).
   */
  gapBefore?: number
}

interface ReflowCanvasProps {
  /**
   * Lista de paragraphs que comparten el mismo obstáculo. Se apilan
   * verticalmente y el orb los empuja a todos según su posición Y. Esto
   * permite que un solo orb afecte LEAD + QUOTE como una unidad
   * editorial.
   */
  paragraphs: ReflowParagraphConfig[]
  /** Gap vertical (px) entre paragraphs. */
  paragraphGap?: number
  /**
   * Aspect ratio mínimo (width / height). Si se pasa, el canvas tiene
   * altura mínima `width / aspect` aunque el contenido sea más corto.
   * Por defecto `null` → la altura sigue al contenido + un pequeño
   * breathing room para que el orb no se sienta atrapado contra el
   * borde inferior pero tampoco flote en un void vacío debajo del
   * texto.
   */
  aspect?: number | null
  /** Radio inicial del obstáculo (px). */
  obstacleRadius?: number
  /** className base aplicada al wrapper. Define la fuente por defecto. */
  className?: string
  /** Color del obstáculo. */
  obstacleColor?: string
  /** Label dentro del obstáculo. */
  obstacleLabel?: string
  /** Color del aro. */
  obstacleRingColor?: string
}

/**
 * Demo central de pretext: N paragraphs apilados + un obstáculo único
 * que el user arrastra. Cada paragraph reflujea independientemente
 * porque transladamos `obstacle.cy` a las coords locales del paragraph
 * (restando su yOffset acumulado). Así el orb empuja LEAD cuando está
 * sobre él, empuja QUOTE cuando está sobre el QUOTE, y ambos cuando
 * el halo cubre el gap entre ellos.
 *
 * El canvas crece para que el contenido nunca se recorte (mobile con
 * columnas estrechas genera más líneas → más alto).
 */
export function ReflowCanvas({
  paragraphs,
  paragraphGap = 28,
  aspect = null,
  obstacleRadius = 90,
  className,
  obstacleColor = '#dc2626',
  obstacleLabel,
  obstacleRingColor = '#ffffff',
}: ReflowCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [heights, setHeights] = useState<number[]>(() =>
    paragraphs.map(p => (p.lineHeight ?? p.fontSize * 1.6) * 3),
  )
  const [obstacle, setObstacle] = useState({ cx: 200, cy: 200 })
  const initialized = useRef(false)

  const VERTICAL_PADDING = 16

  // Altura total del contenido (suma de paragraphs + gaps + padding).
  // Gaps soportan override por paragraph via `gapBefore`.
  const contentHeight = useMemo(() => {
    const paragraphsHeight = heights.reduce((a, h) => a + h, 0)
    const gapsTotal = paragraphs
      .slice(1)
      .reduce((a, p) => a + (p.gapBefore ?? paragraphGap), 0)
    return paragraphsHeight + gapsTotal + VERTICAL_PADDING * 2
  }, [heights, paragraphGap, paragraphs])

  // Breathing room: el orb necesita un poco de espacio debajo del
  // último paragraph para drift. Sin esto, el clamp del orb lo dejaría
  // pegado al borde inferior del texto. Con MUCHO espacio (e.g.
  // aspect-floor agresivo) el orb queda "flotando en un void" debajo
  // del contenido — se ve raro. 32px es ajustado: hay drift, no hay vacío.
  const ORB_BREATHING_ROOM = 32
  const aspectHeight = aspect != null ? Math.round(width / aspect) : 0
  const minByObstacle = obstacleRadius * 2 + 32
  const height = Math.max(aspectHeight, contentHeight + ORB_BREATHING_ROOM, minByObstacle)

  // Y offset acumulado por paragraph (top del paragraph i en coords del canvas).
  // Gap antes de cada paragraph (excepto el primero, que usa padding superior).
  const yOffsets = useMemo(() => {
    const out: number[] = []
    let acc = VERTICAL_PADDING
    paragraphs.forEach((p, i) => {
      if (i > 0) acc += p.gapBefore ?? paragraphGap
      out.push(acc)
      acc += heights[i] ?? 0
    })
    return out
  }, [heights, paragraphGap, paragraphs])

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
      // Arrancar el orb por debajo del centro vertical. Con 2 paragraphs
      // (LEAD + QUOTE) eso lo deja dentro del QUOTE, así el user lee
      // el LEAD limpio primero y descubre que el orb reflujea ambos
      // cuando lo arrastra hacia arriba.
      setObstacle({
        cx: width * 0.62,
        cy: Math.min(height * 0.55, height - obstacleRadius - 16),
      })
      initialized.current = true
      return
    }
    setObstacle(o => ({
      cx: Math.max(obstacleRadius, Math.min(width - obstacleRadius, o.cx)),
      cy: Math.max(obstacleRadius, Math.min(height - obstacleRadius, o.cy)),
    }))
  }, [width, height, obstacleRadius])

  // Setter estable por índice. setHeights con check para evitar updates
  // espurios que disparen re-render → re-layout → loop.
  const setHeightAt = useCallback((i: number, h: number) => {
    setHeights(prev => {
      if (prev[i] === h) return prev
      const next = [...prev]
      next[i] = h
      return next
    })
  }, [])

  // Callbacks estables (uno por paragraph) — necesario porque
  // ReflowingParagraph tiene onLayoutHeight en deps de useEffect; si
  // pasáramos una closure nueva cada render, dispararía el efecto cada
  // vez y causaría loop. Solo dependemos de `paragraphs.length` y NO
  // del array completo porque los callers pasan literal `[...]` que
  // cambia de referencia cada render — incluir `paragraphs` produciría
  // el loop que queremos evitar.
  const callbacks = useMemo(
    () => paragraphs.map((_, i) => (h: number) => setHeightAt(i, h)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paragraphs.length, setHeightAt],
  )

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
      {paragraphs.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${yOffsets[i]}px`,
            left: 0,
            width: `${width}px`,
          }}
        >
          <ReflowingParagraph
            text={p.text}
            fontSize={p.fontSize}
            lineHeight={p.lineHeight}
            width={width}
            color={p.color ?? 'white'}
            obstacle={{
              cx: obstacle.cx,
              cy: obstacle.cy - yOffsets[i],
              radius: obstacleRadius + 16,
            }}
            onLayoutHeight={callbacks[i]}
            className={p.className ?? className}
          />
        </div>
      ))}
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
