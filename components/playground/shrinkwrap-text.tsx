'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { fontShorthand, prepare, shrinkwrap } from '@/lib/pretext/layout'

interface ShrinkwrapTextProps {
  /** Texto a renderizar. */
  text: string
  /**
   * Tamaño en px usado para medir. Debe coincidir con lo que CSS aplica
   * en el breakpoint actual.
   */
  fontSize: number
  /**
   * Líneas objetivo. Pretext busca el ancho mínimo que mantiene el texto
   * en `targetLines` líneas o menos.
   */
  targetLines?: number
  minWidth?: number
  maxWidth?: number
  className?: string
  /**
   * Variante de elemento. `h` para títulos, `p` para body.
   */
  as?: 'h1' | 'h2' | 'h3' | 'p'
}

/**
 * Texto con shrinkwrap real (binary search vía pretext).
 *
 * SSR-safe: durante render server aplica `max-width: 36ch`. Tras
 * `document.fonts.ready` mide y aplica el ancho exacto en px.
 */
export function ShrinkwrapText({
  text,
  fontSize,
  targetLines = 3,
  minWidth = 160,
  maxWidth = 720,
  className,
  as: Component = 'p',
}: ShrinkwrapTextProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [optimalWidth, setOptimalWidth] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const measure = () => {
      if (cancelled) return
      const el = ref.current
      if (!el) return
      const computed = window.getComputedStyle(el)
      const family = computed.fontFamily || 'sans-serif'
      const weight = computed.fontWeight || '400'
      const style = (computed.fontStyle || 'normal') as 'normal' | 'italic'
      const font = fontShorthand({ size: fontSize, family, weight, style })
      try {
        const prepared = prepare(text, font)
        const result = shrinkwrap(prepared, { targetLines, minWidth, maxWidth })
        if (!cancelled) setOptimalWidth(result.width)
      } catch {
        /* noop */
      }
    }
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      ;(document as any).fonts.ready.then(measure)
    } else {
      measure()
    }
    return () => {
      cancelled = true
    }
  }, [text, fontSize, targetLines, minWidth, maxWidth])

  const style = useMemo<React.CSSProperties>(
    () => ({
      maxWidth: optimalWidth != null ? `${optimalWidth}px` : '36ch',
    }),
    [optimalWidth],
  )

  return (
    <Component ref={ref as never} className={className} style={style}>
      {text}
    </Component>
  )
}
