/**
 * Wrappers ergonómicos sobre `@chenglou/pretext`.
 *
 * Pretext separa `prepare` (one-time, caro) de `layout` (hot-path, barato),
 * justo lo que necesitamos para reflujo a 60fps respondiendo a touch/cursor.
 */

import {
  prepareWithSegments,
  layoutWithLines,
  measureLineStats,
  measureNaturalWidth,
  type PreparedTextWithSegments,
  type LayoutLine,
} from '@chenglou/pretext'

export type { PreparedTextWithSegments, LayoutLine }

/**
 * Construye una `font` string compatible con CSS `font` shorthand,
 * que es lo que `prepare()` espera (Canvas2D measureText por debajo).
 */
export function fontShorthand(opts: {
  size: number
  family: string
  weight?: number | string
  style?: 'normal' | 'italic'
}): string {
  const { size, family, weight = 400, style = 'normal' } = opts
  return `${style} ${weight} ${size}px ${family}`
}

/**
 * Prepara un texto para layout repetido. Llamar una vez por (texto, fuente).
 */
export function prepare(text: string, font: string): PreparedTextWithSegments {
  return prepareWithSegments(text, font)
}

/**
 * Layout completo a un ancho dado. Devuelve líneas absolutas.
 * Llámalo en el hot-path (cada cambio de width).
 */
export function layoutAt(
  prepared: PreparedTextWithSegments,
  maxWidth: number,
  lineHeight: number,
) {
  return layoutWithLines(prepared, maxWidth, lineHeight)
}

/**
 * Shrinkwrap: encuentra el `maxWidth` mínimo (entero) que mantiene el
 * texto en `targetLines` líneas o menos, vía búsqueda binaria.
 *
 * Útil para captions/títulos que queremos que rompan en N líneas justas,
 * no en `max-w-prose` arbitrario.
 */
export function shrinkwrap(
  prepared: PreparedTextWithSegments,
  options: {
    targetLines?: number
    minWidth?: number
    maxWidth?: number
  } = {},
): { width: number; lines: number } {
  const { targetLines = 3, minWidth = 120, maxWidth = 720 } = options

  const naturalWidth = measureNaturalWidth(prepared)
  const ceiling = Math.min(maxWidth, Math.max(minWidth, Math.ceil(naturalWidth)))

  // Si cabe entero en una línea bajo el techo, devolver natural width.
  const ceilStats = measureLineStats(prepared, ceiling)
  if (ceilStats.lineCount > targetLines) {
    return { width: ceiling, lines: ceilStats.lineCount }
  }

  let lo = minWidth
  let hi = ceiling
  let bestWidth = hi
  let bestLines = ceilStats.lineCount

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const stats = measureLineStats(prepared, mid)
    if (stats.lineCount <= targetLines) {
      bestWidth = mid
      bestLines = stats.lineCount
      hi = mid
    } else {
      lo = mid + 1
    }
  }

  return { width: bestWidth, lines: bestLines }
}
