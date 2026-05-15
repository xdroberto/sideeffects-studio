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
  /**
   * Callback con la altura total del texto layout-eado (px). El padre
   * la usa para dimensionar su container y evitar que el texto se
   * recorte en breakpoints estrechos donde el wrap produce más líneas.
   */
  onLayoutHeight?: (height: number) => void
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
  minSegmentWidth,
  onLayoutHeight,
}: ReflowingParagraphProps) {
  const lh = lineHeight ?? fontSize * 1.6
  const wrapperRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [prepared, setPrepared] = useState<PreparedTextWithSegments | null>(null)
  // minSegmentWidth responsive: en columnas estrechas (mobile 375px) un
  // valor fijo de 60px puede dejar la mitad del flujo sin renderear cuando
  // el orb se acerca al borde. Escala con el width pero con un piso de 40px
  // que sigue garantizando palabras razonables.
  const effectiveMinSegment = minSegmentWidth ?? Math.max(40, Math.min(60, width * 0.16))

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
      const ranges = computeFreeRanges(yCenter, obstacle, width, effectiveMinSegment)

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
  }, [prepared, obstacle, width, lh, effectiveMinSegment])

  // Reportar altura del layout al padre (útil para que el container
  // crezca cuando el wrap genera más líneas en pantallas estrechas).
  useEffect(() => {
    if (totalHeight > 0) onLayoutHeight?.(totalHeight)
  }, [totalHeight, onLayoutHeight])

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

      {/*
        Layout en dos capas para evitar el flicker que se notaba al cargar:
        antes el fallback `<p>` aparecía y luego se reemplazaba bruscamente
        por los segments cuando `prepareWithSegments` terminaba. Ahora
        ambas capas coexisten en el mismo árbol y cruzamos opacidad
        (300ms) cuando los segments están listos. El fallback ocupa el
        mismo `lineHeight` y `color`, así que la transición es suave y
        no hay salto visible de altura.
      */}
      <p
        aria-hidden={prepared != null}
        style={{
          position: 'absolute',
          inset: 0,
          margin: 0,
          opacity: prepared ? 0 : 1,
          transition: 'opacity 220ms ease-out',
          pointerEvents: 'none',
        }}
      >
        {text}
      </p>
      <div
        aria-hidden={prepared == null}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: prepared ? 1 : 0,
          transition: 'opacity 320ms ease-out',
        }}
      >
        {segments.map((seg, i) => (
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
        ))}
      </div>
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
