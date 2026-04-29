'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { fontShorthand, prepare, shrinkwrap } from '@/lib/pretext/layout'

interface JustifiedProseProps {
  /** Contenido del párrafo. Puede contener `<a>`, `<strong>`, etc. */
  children: React.ReactNode
  /**
   * Texto plano usado para medir con pretext. Si no se pasa, se
   * extrae recursivamente de `children` (concatenando strings y
   * texto de elementos hijos).
   */
  text?: string
  /**
   * Líneas objetivo para shrinkwrap. Pretext busca el ancho mínimo
   * que produce este número de líneas o menos, para que la
   * justificación distribuya bien sin forzar gaps grandes.
   * @default 4
   */
  targetLines?: number
  /** Tamaño en px para la medición. */
  fontSize?: number
  minWidth?: number
  maxWidth?: number
  /**
   * Idioma para `hyphens: auto`. Affecta tanto al diccionario de
   * silabeo del browser como a la heurística de pretext.
   * @default 'en'
   */
  lang?: string
  className?: string
}

/**
 * Párrafo justificado de calidad:
 * - Pretext mide el ancho mínimo óptimo que produce `targetLines`
 *   líneas o menos, evitando justificaciones extremas.
 * - CSS `text-align: justify` + `hyphens: auto` para silabeo nativo
 *   del browser usando el diccionario del idioma indicado.
 * - `text-wrap: pretty` cuando esté soportado, para minimizar
 *   "rivers" y huérfanas.
 *
 * SSR-safe: durante render server / antes de medir, usa `36ch`.
 */
export function JustifiedProse({
  children,
  text,
  targetLines = 4,
  fontSize = 16,
  minWidth = 280,
  maxWidth = 640,
  lang = 'en',
  className,
}: JustifiedProseProps) {
  const ref = React.useRef<HTMLParagraphElement>(null)
  const [optimalWidth, setOptimalWidth] = React.useState<number | null>(null)

  // Texto a medir: explícito > extraído de children.
  const measureText = React.useMemo(
    () => (text ?? extractText(children)).trim(),
    [text, children],
  )

  React.useEffect(() => {
    let cancelled = false
    const measure = () => {
      if (cancelled || !measureText) return
      const el = ref.current
      if (!el) return
      const computed = window.getComputedStyle(el)
      const family = computed.fontFamily || 'serif'
      const weight = computed.fontWeight || '400'
      const style = (computed.fontStyle || 'normal') as 'normal' | 'italic'
      const font = fontShorthand({ size: fontSize, family, weight, style })
      try {
        const prepared = prepare(measureText, font)
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
  }, [measureText, fontSize, targetLines, minWidth, maxWidth])

  return (
    <p
      ref={ref}
      lang={lang}
      className={cn(className)}
      style={{
        textAlign: 'justify',
        textJustify: 'inter-word',
        hyphens: 'auto',
        WebkitHyphens: 'auto',
        textWrap: 'pretty' as never,
        maxWidth: optimalWidth != null ? `${optimalWidth}px` : '36ch',
      }}
    >
      {children}
    </p>
  )
}

/**
 * Extrae texto plano recursivamente de un ReactNode.
 * Concatena strings y atraviesa elementos hijos.
 */
function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode })?.children
    return extractText(children)
  }
  return ''
}
