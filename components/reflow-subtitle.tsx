'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { fontShorthand, prepare, layoutAt, type PreparedTextWithSegments } from '@/lib/pretext/layout'
import { usePointerTrack } from '@/lib/use-pointer-track'

interface ReflowSubtitleProps {
  text: string
  fontSize: number
  className?: string
  color?: string
  /** Ancho mínimo al que puede contraerse (px). */
  minWidth?: number
  /** Ancho máximo. Se cap-ea al ancho real del container responsive. */
  maxWidth?: number
  /** Altura de línea (px). Default fontSize * 1.4. */
  lineHeight?: number
  /**
   * Duración (ms) del intro one-shot al montar: el width hace un único
   * sweep min→max para insinuar que es interactivo. Sin loop.
   * @default 1400
   */
  introDuration?: number
  /**
   * Si está activo, después del intro y de cada interacción, el width
   * vuelve suavemente al máximo disponible (estado de reposo legible).
   * @default true
   */
  restAtMax?: boolean
}

/**
 * Subtítulo cuyo wrap reflujea con el puntero / dedo.
 *
 * Estructura:
 * - Outer (`role="presentation"`): width: 100%, max-width: maxWidth,
 *   responsive — NUNCA desborda viewport. Captura puntero en toda su área.
 * - Inner (text wrapper): width dinámico, cap-eado a outer.clientWidth,
 *   centrado, con `cursor: ew-resize` solo aquí.
 *
 * Comportamiento:
 * - Intro one-shot al montar (1.4s) → hint discreto.
 * - En reposo el texto vuelve al ancho máximo disponible.
 * - Hover/touch → el width sigue el puntero en X.
 * - `touch-action: pan-y` → mobile scroll vertical no se bloquea.
 * - Respeta `prefers-reduced-motion` (sin intro, ancho fijo al máximo).
 */
export function ReflowSubtitle({
  text,
  fontSize,
  className,
  color = 'white',
  minWidth = 140,
  maxWidth = 520,
  lineHeight,
  introDuration = 1400,
  restAtMax = true,
}: ReflowSubtitleProps) {
  const lh = lineHeight ?? fontSize * 1.4
  const { ref: pointerRef, state } = usePointerTrack<HTMLDivElement>()
  const measureRef = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState<number>(maxWidth)
  const [renderedWidth, setRenderedWidth] = useState<number>(maxWidth)
  const [prepared, setPrepared] = useState<PreparedTextWithSegments | null>(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const mountedAt = useRef<number>(0)

  // Detectar prefers-reduced-motion + timestamp de mount.
  useEffect(() => {
    mountedAt.current = performance.now()
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  // Medir el ancho disponible REAL del outer (que ya está cap-eado por
  // CSS responsive) y reaccionar a resize. Esto rompe el loop "child
  // infla parent" porque outer es width:100% + max-width.
  useEffect(() => {
    const el = pointerRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth || el.getBoundingClientRect().width
      if (w > 0) setAvailableWidth(Math.min(maxWidth, Math.max(minWidth, w)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxWidth, minWidth, pointerRef])

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

  // Hot-path: animar width.
  useEffect(() => {
    let raf = 0
    const introMs = reduceMotion ? 0 : introDuration

    const tick = () => {
      const now = performance.now()
      const elapsed = now - mountedAt.current
      const effectiveMin = Math.min(minWidth, availableWidth)
      const effectiveMax = availableWidth

      let target: number

      if (state.active) {
        target = effectiveMin + (effectiveMax - effectiveMin) * state.x
      } else if (elapsed < introMs) {
        const t = Math.min(1, elapsed / introMs)
        const eased = 1 - Math.pow(1 - t, 3)
        target = effectiveMin + (effectiveMax - effectiveMin) * eased
      } else if (restAtMax) {
        target = effectiveMax
      } else {
        target = renderedWidth
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
  }, [state.active, state.x, minWidth, availableWidth, restAtMax, introDuration, reduceMotion])

  // Layout actual con pretext, cap-eado al ancho real.
  const innerWidth = Math.max(
    minWidth,
    Math.min(availableWidth, renderedWidth),
  )
  const layout = useMemo(() => {
    if (!prepared) return null
    return layoutAt(prepared, innerWidth, lh)
  }, [prepared, innerWidth, lh])

  return (
    <div
      ref={pointerRef as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        // Outer responsive: 100% del padre, capeado a maxWidth, centrado.
        // Nunca desborda viewport.
        width: '100%',
        maxWidth: `${maxWidth}px`,
        margin: '0 auto',
        position: 'relative',
        // Mobile scroll vertical libre. Solo intercepta drag horizontal.
        touchAction: 'pan-y',
        minHeight: `${lh * 2}px`,
        fontSize: `${fontSize}px`,
        lineHeight: `${lh}px`,
        color,
      }}
      aria-label={text}
      role="presentation"
    >
      {/* Sondeo invisible: lee fontFamily computada (incl. hash next/font). */}
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
            // Inner: ancho dinámico, cap-eado al outer real.
            width: `${innerWidth}px`,
            maxWidth: '100%',
            margin: '0 auto',
            position: 'relative',
            height: `${layout.height}px`,
            cursor: 'ew-resize',
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
        <p style={{ margin: 0, textAlign: 'center' }}>{text}</p>
      )}
    </div>
  )
}
