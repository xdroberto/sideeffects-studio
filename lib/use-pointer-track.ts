'use client'

import { useEffect, useRef, useState } from 'react'

interface PointerState {
  /** Posición normalizada [0, 1] dentro del rect del target. */
  x: number
  y: number
  /** Si el usuario está activamente interactuando (mouse over o touch down). */
  active: boolean
}

interface UsePointerTrackOptions {
  /**
   * En mobile, decide si capturar el touch o dejar que el browser scrollee.
   * Si el primer movimiento es claramente vertical, soltamos el control.
   * Threshold en píxeles.
   * @default 8
   */
  scrollThreshold?: number
  /**
   * Tras cuántos ms sin input volver a `active=false` (mobile,
   * cuando el dedo se levanta).
   */
  inactivityTimeout?: number
}

/**
 * Track de puntero (mouse + touch) sobre un elemento, **respetando el
 * scroll vertical en mobile**.
 *
 * - Desktop: `pointermove` sobre el target → `active=true` mientras hover.
 * - Mobile: `touchstart` activa, pero solo capturamos el evento si el
 *   primer drag es horizontal. Si es vertical, soltamos → scroll normal.
 *   Esto evita el clásico "no puedo hacer scroll porque hay un widget
 *   interactivo en medio".
 *
 * Devuelve `{ x, y }` normalizados [0,1] al rect del target.
 */
export function usePointerTrack<T extends HTMLElement>(
  options: UsePointerTrackOptions = {},
): { ref: React.MutableRefObject<T | null>; state: PointerState } {
  const { scrollThreshold = 8 } = options
  const ref = useRef<T | null>(null)
  const [state, setState] = useState<PointerState>({ x: 0.5, y: 0.5, active: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const updateFromClient = (clientX: number, clientY: number, active = true) => {
      const rect = el.getBoundingClientRect()
      const x = (clientX - rect.left) / rect.width
      const y = (clientY - rect.top) / rect.height
      setState({
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
        active,
      })
    }

    // ── Mouse / pen via Pointer Events ──────────────────────────
    const onPointerEnter = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      updateFromClient(e.clientX, e.clientY, true)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      updateFromClient(e.clientX, e.clientY, true)
    }
    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      setState(s => ({ ...s, active: false }))
    }

    // ── Touch with vertical-scroll detection ────────────────────
    let touchStart: { x: number; y: number } | null = null
    let touchCaptured = false

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      touchStart = { x: t.clientX, y: t.clientY }
      touchCaptured = false
      updateFromClient(t.clientX, t.clientY, true)
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t || !touchStart) return

      if (!touchCaptured) {
        const dx = Math.abs(t.clientX - touchStart.x)
        const dy = Math.abs(t.clientY - touchStart.y)
        // Si el usuario está scrolleando vertical, soltamos.
        if (dy > scrollThreshold && dy > dx) {
          touchStart = null
          setState(s => ({ ...s, active: false }))
          return
        }
        // Si ya hay drag horizontal claro, capturamos.
        if (dx > scrollThreshold && dx > dy) {
          touchCaptured = true
        }
      }

      if (touchCaptured) {
        e.preventDefault() // bloquea scroll horizontal incidental
      }
      updateFromClient(t.clientX, t.clientY, true)
    }
    const onTouchEnd = () => {
      touchStart = null
      touchCaptured = false
      // En mobile dejamos el último valor pero marcamos inactivo.
      setState(s => ({ ...s, active: false }))
    }

    el.addEventListener('pointerenter', onPointerEnter)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerleave', onPointerLeave)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    // touchmove con passive:false porque puede llamar preventDefault
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('pointerenter', onPointerEnter)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerleave', onPointerLeave)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [scrollThreshold])

  return { ref, state }
}
