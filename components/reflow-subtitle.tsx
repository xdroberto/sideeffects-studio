'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { fontShorthand, prepare, layoutAt, type PreparedTextWithSegments } from '@/lib/pretext/layout'
import { usePointerTrack } from '@/lib/use-pointer-track'

interface ReflowSubtitleProps {
  /** Texto a renderizar. */
  text: string
  /** Tamaño en px. */
  fontSize: number
  /**
   * className aplicada al container — debe definir la `font-family`.
   * El componente lee la fuente computada desde el DOM para que Canvas2D
   * mida con la misma fuente que pintamos (incluido lo que `next/font`
   * inyecta como hash).
   */
  className?: string
  /** Color del texto (CSS color). */
  color?: string
  /** Ancho mínimo al que puede contraerse el bloque (px). */
  minWidth?: number
  /** Ancho máximo al que puede expandirse (px). */
  maxWidth?: number
  /** Altura de línea (px). Default: fontSize * 1.4 */
  lineHeight?: number
  /**
   * Ms sin input antes de soltar el control y volver a Lissajous idle.
   * @default 1500
   */
  idleTimeout?: number
}

/**
 * Subtítulo cuyo wrap reflujea en tiempo real con el puntero / dedo.
 *
 * - El `maxWidth` del bloque se mapea a la posición horizontal del input:
 *   izquierda → estrecho (más líneas), derecha → ancho (menos líneas).
 * - Pretext re-layout-ea por frame (es su súper poder: hot-path barato).
 * - En mobile, `usePointerTrack` cede el touch al scroll vertical si el
 *   primer movimiento del dedo es vertical.
 * - En idle, el `maxWidth` se anima con un Lissajous lento como hint de
 *   interactividad. Respeta `prefers-reduced-motion`.
 */
export function ReflowSubtitle({
  text,
  fontSize,
  className,
  color = 'white',
  minWidth = 140,
  maxWidth = 520,
  lineHeight,
  idleTimeout = 1500,
}: ReflowSubtitleProps) {
  const lh = lineHeight ?? fontSize * 1.4
  const { ref: pointerRef, state } = usePointerTrack<HTMLDivElement>()
  const measureRef = useRef<HTMLDivElement>(null)
  const [renderedWidth, setRenderedWidth] = useState<number>(maxWidth)
  const [prepared, setPrepared] = useState<PreparedTextWithSegments | null>(null)
  const [reduceMotion, setReduceMotion] = useState(false)

  // Detectar prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  // Preparar pretext una vez la fuente esté lista. Leemos la fontFamily
  // resuelta del DOM (incluye el hash de next/font).
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
        setPrepared(prepare(text, font))
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

  // Hot-path: animar width hacia objetivo basado en pointer (o Lissajous idle).
  useEffect(() => {
    let raf = 0
    let lastActiveAt = performance.now()
    const startedAt = performance.now()

    const tick = () => {
      const now = performance.now()
      const elapsed = (now - startedAt) / 1000

      let target: number
      if (state.active) {
        const t = state.x
        target = minWidth + (maxWidth - minWidth) * t
        lastActiveAt = now
      } else if (now - lastActiveAt < idleTimeout) {
        target = renderedWidth
      } else if (reduceMotion) {
        target = maxWidth
      } else {
        // Idle Lissajous lento — invita a tocar.
        const phase = elapsed * 0.4
        const t = 0.5 + 0.45 * Math.sin(phase) * Math.cos(phase * 0.7)
        target = minWidth + (maxWidth - minWidth) * t
      }

      setRenderedWidth(prev => {
        const next = prev + (target - prev) * 0.18
        return Math.abs(next - target) < 0.4 ? target : next
      })

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, state.x, minWidth, maxWidth, idleTimeout, reduceMotion])

  // Calcular líneas con pretext al ancho actual.
  const layout = useMemo(() => {
    if (!prepared) return null
    return layoutAt(prepared, Math.max(minWidth, renderedWidth), lh)
  }, [prepared, renderedWidth, lh, minWidth])

  return (
    <div
      ref={pointerRef as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        // Permite scroll vertical en mobile, intercepta solo horizontal.
        touchAction: 'pan-y',
        // El container ocupa el ancho máximo para que el puntero pueda
        // barrer todo el rango.
        width: `${maxWidth}px`,
        maxWidth: '100%',
        position: 'relative',
        margin: '0 auto',
        cursor: 'ew-resize',
        // Reservamos altura mínima para evitar layout shift.
        minHeight: `${lh * 2}px`,
        fontSize: `${fontSize}px`,
        lineHeight: `${lh}px`,
        color,
      }}
      aria-label={text}
      role="presentation"
    >
      {/* Sondeo invisible: hereda la className/font para que readComputed
          devuelva la fontFamily real (incl. hash de next/font). */}
      <div
        ref={measureRef}
        aria-hidden
        style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}
      >
        M
      </div>

      {layout ? (
        <div
          style={{
            width: `${renderedWidth}px`,
            margin: '0 auto',
            position: 'relative',
            height: `${layout.height}px`,
          }}
        >
          {layout.lines.map((line, i) => (
            <span
              key={i}
              style={{
                display: 'block',
                whiteSpace: 'pre',
                position: 'absolute',
                top: `${i * lh}px`,
                left: 0,
                width: '100%',
                textAlign: 'center',
              }}
            >
              {line.text}
            </span>
          ))}
        </div>
      ) : (
        // Fallback no-JS / pretext aún midiendo. Centrado y en una línea.
        <p style={{ margin: 0, textAlign: 'center' }}>{text}</p>
      )}
    </div>
  )
}
