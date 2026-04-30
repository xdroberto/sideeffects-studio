'use client'

import { useEffect, useRef } from 'react'

interface AsciiBackdropProps {
  /** Columnas de la grid. Más = más detalle, más coste. */
  cols?: number
  /** Filas. Default deriva de cols + aspect del container. */
  rows?: number
  /** Charset ordenado por densidad visual ascendente (espacio → @). */
  ramp?: string
  /** Color CSS del texto. */
  color?: string
  /** Opacidad base del texto en cells "vacías" (0..1). */
  baseAlpha?: number
  /** Opacidad máxima cerca del atractor (0..1). */
  peakAlpha?: number
  /** Velocidad del campo de noise. */
  noiseSpeed?: number
  /** Radio del atractor (px) — distancia hasta donde el cursor influye. */
  attractRadius?: number
  /**
   * Si está activo, el atractor sigue al puntero/touch global.
   * Si no, se anima en una espiral lenta como hint.
   * @default true
   */
  followPointer?: boolean
  /**
   * Modo de color de los caracteres.
   * - `solid` (default): todos los caracteres usan `color`.
   * - `iridescent`: el hue varía por celda + tiempo en HSL, produciendo
   *   un campo cromático que con `mix-blend-mode: difference` simula
   *   iridiscencia oil-slick sobre superficies de color (e.g. el diamante
   *   rojo del fondo).
   */
  colorMode?: 'solid' | 'iridescent'
  /** Saturación HSL en modo iridescent (0..100). */
  iridescenceSaturation?: number
  /** Lightness HSL en modo iridescent (0..100). */
  iridescenceLightness?: number
  /** Velocidad de rotación de hue (más alto = más rápido). */
  iridescenceSpeed?: number
  /** className aplicado al wrapper. */
  className?: string
}

/**
 * Backdrop ASCII generativo — adaptación simplificada del demo
 * `variable-typographic-ascii` de Cheng Lou.
 *
 * Diferencias respecto al demo original:
 * - Sin física de partículas: el "campo de brillo" se genera por
 *   noise sintético + un único atractor que sigue al puntero.
 * - Sin paleta proporcional dual: un solo charset ramp ascendente,
 *   se elige el caracter por mapeo directo brillo → índice.
 * - Mucho más ligero (≈30 ms por frame en mobile mid-range).
 *
 * Pintado en `<canvas>` 2D para evitar montar miles de spans en DOM.
 */
export function AsciiBackdrop({
  cols = 80,
  rows,
  ramp = ' .`-_:,;^=+*#%@',
  color = '255, 255, 255',
  baseAlpha = 0.06,
  peakAlpha = 0.85,
  noiseSpeed = 0.0007,
  attractRadius = 240,
  followPointer = true,
  colorMode = 'solid',
  iridescenceSaturation = 85,
  iridescenceLightness = 70,
  iridescenceSpeed = 0.00018,
  className,
}: AsciiBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointer = useRef({ x: 0.5, y: 0.5, active: false, lastInteract: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let dpr = window.devicePixelRatio || 1
    let canvasW = 0
    let canvasH = 0
    let cellW = 0
    let cellH = 0
    let actualRows = rows ?? 30

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvasW = rect.width
      canvasH = rect.height
      canvas.width = canvasW * dpr
      canvas.height = canvasH * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cellW = canvasW / cols
      // Cell ratio típica de monospace ≈ 0.55-0.6 (alto / ancho)
      cellH = cellW * 1.7
      actualRows = rows ?? Math.max(8, Math.floor(canvasH / cellH))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const onPointerMove = (e: PointerEvent) => {
      if (!followPointer) return
      const rect = canvas.getBoundingClientRect()
      pointer.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        active: true,
        lastInteract: performance.now(),
      }
    }
    const onPointerLeave = () => {
      // Mantenemos active=true unos segundos para suavizar la salida.
    }
    if (followPointer) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('pointerleave', onPointerLeave, { passive: true })
    }

    const tick = (t: number) => {
      ctx.clearRect(0, 0, canvasW, canvasH)
      const time = t * noiseSpeed
      const now = t

      // El atractor: sigue al puntero si interactuó recientemente,
      // si no, hace una espiral lenta como hint visual.
      let ax: number, ay: number, attractActive: boolean
      const sinceInteract = now - pointer.current.lastInteract
      if (followPointer && pointer.current.active && sinceInteract < 4000) {
        ax = pointer.current.x * canvasW
        ay = pointer.current.y * canvasH
        attractActive = true
        // Decay suave al final del timeout
        if (sinceInteract > 3000) attractActive = false
      } else {
        const phase = t * 0.0004
        ax = canvasW * (0.5 + 0.32 * Math.sin(phase))
        ay = canvasH * (0.5 + 0.18 * Math.cos(phase * 0.83))
        attractActive = true
      }

      // Tipografía monospace en el tamaño del cell, alineada al centro.
      const fontPx = Math.max(8, Math.min(cellH * 0.95, cellW * 1.8))
      ctx.font = `${fontPx}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const rampLen = ramp.length

      for (let r = 0; r < actualRows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = c * cellW + cellW / 2
          const cy = r * cellH + cellH / 2

          // Ambient noise: combinación de senos baratos.
          const ambient =
            (Math.sin(c * 0.27 + time) +
              Math.sin(r * 0.23 - time * 1.2) +
              Math.sin((c + r) * 0.13 + time * 0.7) +
              Math.sin(c * 0.05 - r * 0.07 + time * 1.6)) /
            4

          // Atractor: brillo extra basado en distancia.
          let attract = 0
          if (attractActive) {
            const dx = cx - ax
            const dy = cy - ay
            const dist = Math.sqrt(dx * dx + dy * dy)
            const t = 1 - Math.min(1, dist / attractRadius)
            attract = t * t * (3 - 2 * t) // smoothstep
          }

          // Brillo final ∈ [0, 1]: ambient (signed -1..1) + attract.
          const brightness = clamp(0, 1, 0.45 + ambient * 0.32 + attract * 0.55)

          if (brightness < 0.04) continue // skip black cells

          const idx = Math.min(rampLen - 1, Math.max(0, Math.floor(brightness * rampLen)))
          const ch = ramp[idx]
          if (ch === ' ') continue

          const alpha = baseAlpha + brightness * (peakAlpha - baseAlpha)

          if (colorMode === 'iridescent') {
            // Hue varía por celda + tiempo. Con `mix-blend-mode: difference`
            // en el contenedor, sobre superficies coloreadas (e.g. el diamante
            // rojo) se traduce en un campo cromático tipo oil-slick.
            const hue =
              (c * 6 + r * 3 + t * iridescenceSpeed * 1000 + attract * 90) % 360
            ctx.fillStyle = `hsla(${hue.toFixed(1)}, ${iridescenceSaturation}%, ${iridescenceLightness}%, ${alpha.toFixed(3)})`
          } else {
            ctx.fillStyle = `rgba(${color}, ${alpha.toFixed(3)})`
          }
          ctx.fillText(ch, cx, cy)
        }
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      if (followPointer) {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerleave', onPointerLeave)
      }
    }
  }, [
    cols,
    rows,
    ramp,
    color,
    baseAlpha,
    peakAlpha,
    noiseSpeed,
    attractRadius,
    followPointer,
    colorMode,
    iridescenceSaturation,
    iridescenceLightness,
    iridescenceSpeed,
  ])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}

function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v))
}
