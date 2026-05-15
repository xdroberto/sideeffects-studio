'use client'

import { useEffect, useRef } from 'react'

interface ScrambleTextProps {
  /** Texto final que se "decodificará". */
  text: string
  /** Charset usado para los caracteres aleatorios durante el scramble. */
  charset?: string
  /** Duración total del decode (ms). */
  duration?: number
  /**
   * Cuánto antes del final empieza a "lockearse" el último caracter.
   * 0.85 = el último char queda fijo al 85% del tiempo total. Un valor
   * más bajo = decode más rápido por carácter.
   * @default 0.85
   */
  finalLockProgress?: number
  /**
   * Frecuencia de re-roll de los caracteres random (Hz). Más alto = más
   * caótico. ~30 Hz ≈ visible parpadeo, ~60 Hz ≈ casi suave. 48 Hz cae
   * cerca de un re-roll cada ~1.25 frames a 60fps — entrega textura sin
   * sentirse strobeado.
   * @default 48
   */
  scrambleHz?: number
  className?: string
}

/**
 * Charset por defecto del hero: alfanumérico mayúsculas + minúsculas +
 * dígitos + un pequeño set de glyphs "instrumentales" (`. · / -`). Se
 * descartaron los símbolos ruidosos (`$ % @ # < > ?`) — daban vibe de
 * terminal genérica en vez de instrumentación de precisión.
 */
export const HERO_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789·./-'

const DEFAULT_CHARSET = HERO_CHARSET

/**
 * Reveal "scramble decoder" estilo terminal/Mr.Robot.
 *
 * Implementación: escribe directamente al `<span>` vía ref con
 * `textContent` desde dentro de un `requestAnimationFrame`, sin pasar
 * por estado de React. Esto evita que las múltiples pasadas de
 * hidratación de Next/React 18 reseteen la animación.
 *
 * Respeta `prefers-reduced-motion`: pinta directamente el texto final.
 *
 * El componente renderiza un `<span>` simple — el wrapper que aplica
 * fuente, color y glow vive en el padre.
 */
export function ScrambleText({
  text,
  charset = DEFAULT_CHARSET,
  duration = 2200,
  finalLockProgress = 0.85,
  scrambleHz = 48,
  className,
}: ScrambleTextProps) {
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = spanRef.current
    if (!el) return

    // Nota: NO usamos un "ya animado" guard basado en ref. React 18
    // Strict Mode dispara el effect dos veces en dev (mount → cleanup
    // → mount, sobre la misma instancia); un ranKey ref persiste entre
    // las dos pasadas y mata la segunda animación, dejando el texto
    // final sin scramble. Las deps del useEffect ya manejan re-runs
    // cuando `text` cambia (la única razón legítima para re-animar).

    if (typeof window === 'undefined') return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      el.textContent = text
      return
    }

    const len = text.length
    const startedAt = performance.now()
    let raf = 0
    let lastScrambleAt = 0
    const scrambleInterval = 1000 / scrambleHz
    let pool = Array.from({ length: len }, () => randomChar(charset))

    const tick = (now: number) => {
      const elapsed = now - startedAt
      const progress = Math.min(1, elapsed / duration)

      if (now - lastScrambleAt >= scrambleInterval) {
        pool = pool.map(() => randomChar(charset))
        lastScrambleAt = now
      }

      let out = ''
      for (let i = 0; i < len; i++) {
        const ch = text[i]
        if (ch === ' ' || ch === '\n') {
          out += ch
          continue
        }
        const unlockAt = (i / Math.max(1, len - 1)) * finalLockProgress
        out += progress >= unlockAt ? ch : pool[i]
      }

      // Escribe directo al DOM: sin re-render de React.
      el.textContent = out

      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        el.textContent = text
      }
    }

    // Estado inicial visible: ya con random chars antes del primer frame.
    let initialOut = ''
    for (let i = 0; i < len; i++) {
      const ch = text[i]
      initialOut += ch === ' ' || ch === '\n' ? ch : pool[i]
    }
    el.textContent = initialOut

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, charset, duration, finalLockProgress, scrambleHz])

  return (
    <span ref={spanRef} className={className} aria-label={text}>
      {text}
    </span>
  )
}

function randomChar(charset: string): string {
  return charset[Math.floor(Math.random() * charset.length)]!
}
