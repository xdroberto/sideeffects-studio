'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  prepareWithSegments,
  layoutNextLineRange,
  materializeLineRange,
  type PreparedTextWithSegments,
  type LayoutCursor,
} from '@chenglou/pretext'
import { fontShorthand } from '@/lib/pretext/layout'

/**
 * Texto que reflujea alrededor de un obstáculo circular en tiempo real,
 * usando @chenglou/pretext. La interacción real de los demos editoriales
 * de Cheng Lou: el texto es físico y reacciona al obstáculo.
 *
 * Cómo funciona:
 * - Para cada línea (Y = i * lineHeight + lineHeight/2), calculamos
 *   los segmentos horizontales LIBRES (no ocupados por el círculo).
 * - Por cada segmento llamamos `layoutNextLineRange(cursor, width)`
 *   que devuelve el rango de texto que cabe en ese ancho.
 * - El cursor avanza por todo el texto. Si una línea tiene dos segmentos
 *   (izquierda y derecha del círculo), pintamos dos chunks de texto
 *   independientes en la misma fila vertical.
 *
 * Pretext es lo bastante rápido (medición pura, cero DOM) para
 * recalcular esto a 60 fps mientras el obstáculo se arrastra.
 */

export interface Obstacle {
  /** Centro X (px) relativo al container del texto. */
  cx: number
  /** Centro Y (px). */
  cy: number
  /** Radio (px). Incluye margen visual deseado. */
  radius: number
}

interface ReflowingParagraphProps {
  text: string
  fontSize: number
  /** Línea de altura (px). Default: fontSize * 1.6 */
  lineHeight?: number
  /** Obstáculo único (NULL para layout normal). */
  obstacle?: Obstacle | null
  /** Ancho del bloque de texto (px). */
  width: number
  /** className aplicada al wrapper exterior — define la fuente. */
  className?: string
  /** Color del texto. */
  color?: string
  /**
   * Mínimo ancho de segmento aceptado (px). Segmentos más estrechos
   * se descartan (no caben palabras razonables).
   * @default 60
   */
  minSegmentWidth?: number
}

interface RenderedSegment {
  x: number
  y: number
  width: number
  text: string
}

export function ReflowingParagraph({
  text,
  fontSize,
  lineHeight,
  obstacle = null,
  width,
  className,
  color = 'white',
  minSegmentWidth = 60,
}: ReflowingParagraphProps) {
  const lh = lineHeight ?? fontSize * 1.6
  const wrapperRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [prepared, setPrepared] = useState<PreparedTextWithSegments | null>(null)

  // Preparar pretext una vez la fuente esté lista.
  useEffect(() => {
    let cancelled = false
    const doPrepare = () => {
      if (cancelled) return
      const el = measureRef.current
      if (!el) return
      const computed = window.getComputedStyle(el)
      const family = computed.fontFamily || 'monospace'
      const font = fontShorthand({ size: fontSize, family })
      try {
        setPrepared(prepareWithSegments(text, font))
      } catch {
        setPrepared(null)
      }
    }
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      ;(document as any).fonts.ready.then(doPrepare)
    } else {
      doPrepare()
    }
    return () => {
      cancelled = true
    }
  }, [text, fontSize])

  // Layout actual: re-calcula cuando el obstáculo o el width cambia.
  const { segments, totalHeight } = useMemo(() => {
    if (!prepared) return { segments: [] as RenderedSegment[], totalHeight: 0 }

    const segments: RenderedSegment[] = []
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
    let lineIdx = 0
    const MAX_LINES = 1000 // safety cap

    while (lineIdx < MAX_LINES) {
      // Cursor al final del texto?
      if (
        cursor.segmentIndex >= 1e9 ||
        // No hay forma directa de saber si está al final sin probar.
        false
      ) {
        break
      }

      const yCenter = lineIdx * lh + lh / 2
      const ranges = computeFreeRanges(yCenter, obstacle, width, minSegmentWidth)

      let advancedThisLine = false
      for (const seg of ranges) {
        const range = layoutNextLineRange(prepared, cursor, seg.width)
        if (!range) continue
        // Si el cursor no avanzó, no hay nada más que hacer.
        if (
          range.end.segmentIndex === cursor.segmentIndex &&
          range.end.graphemeIndex === cursor.graphemeIndex
        ) {
          continue
        }
        const line = materializeLineRange(prepared, range)
        if (line.text.length > 0) {
          segments.push({
            x: seg.x,
            y: lineIdx * lh,
            width: seg.width,
            text: line.text,
          })
          advancedThisLine = true
        }
        cursor = range.end
      }

      if (!advancedThisLine) {
        // No avanzó nada en esta línea: o llegamos al final, o el
        // obstáculo bloquea todo. En cualquier caso paramos para no
        // hacer loop infinito.
        break
      }
      lineIdx++
    }

    return { segments, totalHeight: (lineIdx + 1) * lh }
  }, [prepared, obstacle, width, lh, minSegmentWidth])

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${Math.max(totalHeight, lh * 2)}px`,
        fontSize: `${fontSize}px`,
        lineHeight: `${lh}px`,
        color,
      }}
    >
      {/* Sondeo invisible para leer fontFamily computada. */}
      <div
        ref={measureRef}
        aria-hidden
        style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}
      >
        M
      </div>

      {prepared ? (
        segments.map((seg, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${seg.x}px`,
              top: `${seg.y}px`,
              width: `${seg.width}px`,
              whiteSpace: 'pre',
              display: 'block',
            }}
          >
            {seg.text}
          </span>
        ))
      ) : (
        // Fallback: párrafo plano hasta que pretext mida.
        <p style={{ margin: 0 }}>{text}</p>
      )}
    </div>
  )
}

/**
 * Devuelve los rangos horizontales libres a una altura `yCenter`,
 * dado un obstáculo circular y el ancho del container.
 *
 * - Si el círculo no intersecta esta Y, devuelve un único rango full-width.
 * - Si intersecta, devuelve [izquierda, derecha] del corte horizontal.
 * - Filtra rangos demasiado estrechos para una palabra.
 */
function computeFreeRanges(
  yCenter: number,
  obstacle: Obstacle | null,
  containerWidth: number,
  minSegmentWidth: number,
): Array<{ x: number; width: number }> {
  if (!obstacle) {
    return [{ x: 0, width: containerWidth }]
  }
  const dy = yCenter - obstacle.cy
  if (Math.abs(dy) >= obstacle.radius) {
    return [{ x: 0, width: containerWidth }]
  }
  const halfChord = Math.sqrt(obstacle.radius * obstacle.radius - dy * dy)
  const obstacleLeft = obstacle.cx - halfChord
  const obstacleRight = obstacle.cx + halfChord

  const ranges: Array<{ x: number; width: number }> = []
  if (obstacleLeft > 0) {
    ranges.push({ x: 0, width: Math.min(obstacleLeft, containerWidth) })
  }
  if (obstacleRight < containerWidth) {
    ranges.push({
      x: Math.max(0, obstacleRight),
      width: containerWidth - Math.max(0, obstacleRight),
    })
  }
  return ranges.filter(r => r.width >= minSegmentWidth)
}
