'use client'

import { useEffect, useRef } from 'react'

/**
 * Pequeño visualizador auto-running para la pantalla del chassis.
 *
 * No hay audio real, pero pintamos algo que SE COMPORTA como si lo
 * hubiera: una "forma de onda" senoidal con armónicos que late, y
 * unas barras de espectro abajo derivadas de envolventes sinusoidales
 * desplazadas. Da la sensación de que el aparato está corriendo en
 * modo demo, no apagado.
 *
 * Pintado en `<canvas>` 2D (verde sobre negro, estilo LCD).
 */
interface Props {
  /** Render width in CSS px. */
  width: number
  /** Render height in CSS px. */
  height: number
  /** Color principal (CSS). Default verde LCD. */
  color?: string
  /** Etiqueta de acorde actual auto-cycling (se actualiza fuera). */
  chordLabel?: string
}

export function DisplayVisualizer({ width, height, color = '#4ade80', chordLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.scale(dpr, dpr)

    let raf = 0
    const startedAt = performance.now()

    const tick = (now: number) => {
      const t = (now - startedAt) / 1000

      // Fondo (clear)
      ctx.clearRect(0, 0, width, height)

      // Línea horizontal central muy tenue (como un osciloscopio)
      ctx.strokeStyle = `${color}22`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()

      // Forma de onda — suma de senos con pequeño ruido determinista.
      ctx.beginPath()
      const samples = Math.max(80, Math.floor(width / 2))
      for (let i = 0; i <= samples; i++) {
        const x = (i / samples) * width
        const phase = (i / samples) * Math.PI * 4
        const wave =
          Math.sin(phase + t * 1.6) * 0.5 +
          Math.sin(phase * 2.1 - t * 2.3) * 0.22 +
          Math.sin(phase * 3.7 + t * 0.9) * 0.12
        const y = height / 2 + wave * (height * 0.28)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = 1.4
      ctx.shadowColor = color
      ctx.shadowBlur = 6
      ctx.stroke()
      ctx.shadowBlur = 0

      // Barras de espectro fake al fondo (8 barras)
      const barCount = 8
      const padding = 4
      const barAreaH = Math.min(20, height * 0.28)
      const barAreaY = height - barAreaH - 2
      const barW = (width - padding * 2) / barCount - 2
      for (let i = 0; i < barCount; i++) {
        const env =
          0.5 +
          0.5 *
            Math.sin(t * (1.2 + i * 0.27) + i * 1.3) *
            Math.cos(t * (0.7 + i * 0.11) - i * 0.6)
        const h = Math.max(1, env * barAreaH)
        const x = padding + i * (barW + 2)
        const y = barAreaY + (barAreaH - h)
        ctx.fillStyle = `${color}cc`
        ctx.fillRect(x, y, barW, h)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [width, height, color])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: `${width}px`,
        height: `${height}px`,
      }}
      aria-label={chordLabel ? `Demo visualizer · ${chordLabel}` : 'Demo visualizer'}
    />
  )
}
