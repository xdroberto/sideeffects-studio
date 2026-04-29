'use client'

import { useEffect, useRef } from 'react'

interface DragObstacleProps {
  /** Posición controlada (centro X,Y dentro del container padre). */
  cx: number
  cy: number
  /** Radio (px). */
  radius: number
  /**
   * Callback cuando el usuario arrastra. Recibe el centro nuevo en
   * coordenadas relativas al container (igual sistema que cx/cy).
   */
  onChange: (next: { cx: number; cy: number }) => void
  /**
   * Bounding box del container — el obstáculo no se sale de aquí.
   */
  bounds: { width: number; height: number }
  /** Color de relleno (CSS). */
  color?: string
  /** Color del aro / cue visual. */
  ringColor?: string
  /** Label opcional dentro del orb. */
  label?: string
}

/**
 * Obstáculo arrastrable 2D. Sin R3F. Es un círculo HTML controlado por
 * pointer events que reporta su posición al padre. El padre se encarga
 * del layout del texto que reflujea alrededor.
 *
 * Mobile: `touch-action: none` SOLO sobre este círculo. El resto de
 * la página scrollea normal porque touchmove con preventDefault solo
 * se llama mientras el círculo está siendo arrastrado.
 */
export function DragObstacle({
  cx,
  cy,
  radius,
  onChange,
  bounds,
  color = '#dc2626',
  ringColor = '#ffffff',
  label,
}: DragObstacleProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<{ startCX: number; startCY: number; pointerStartX: number; pointerStartY: number; active: boolean }>({
    startCX: 0,
    startCY: 0,
    pointerStartX: 0,
    pointerStartY: 0,
    active: false,
  })

  // Pointer events globales mientras se arrastra: capturan movimientos
  // fuera del propio círculo (importante: si el dedo sale del círculo
  // queremos seguir arrastrando hasta soltar).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.active) return
      e.preventDefault()
      const dx = e.clientX - dragRef.current.pointerStartX
      const dy = e.clientY - dragRef.current.pointerStartY
      const nextCX = clamp(dragRef.current.startCX + dx, radius, bounds.width - radius)
      const nextCY = clamp(dragRef.current.startCY + dy, radius, bounds.height - radius)
      onChange({ cx: nextCX, cy: nextCY })
    }
    const onUp = () => {
      dragRef.current.active = false
      document.body.style.cursor = ''
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [radius, bounds.width, bounds.height, onChange])

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    dragRef.current = {
      startCX: cx,
      startCY: cy,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      active: true,
    }
    document.body.style.cursor = 'grabbing'
  }

  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={onPointerDown}
      aria-label="Drag obstacle. The text reflows around it."
      style={{
        position: 'absolute',
        left: `${cx - radius}px`,
        top: `${cy - radius}px`,
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, ${color}, ${shade(color, -30)} 75%, ${shade(color, -55)})`,
        border: `1px solid ${ringColor}33`,
        boxShadow: `0 0 0 1px ${ringColor}1a, 0 12px 40px ${color}44, inset 0 0 30px ${color}55`,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: ringColor,
        fontSize: '10px',
        fontFamily: 'inherit',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        // Pulso sutil en reposo para indicar interactividad.
        animation: 'orb-pulse 2.6s ease-in-out infinite',
      }}
    >
      {label && <span style={{ pointerEvents: 'none', opacity: 0.85 }}>{label}</span>}
      <style>{`
        @keyframes orb-pulse {
          0%, 100% { box-shadow: 0 0 0 1px ${ringColor}1a, 0 12px 40px ${color}44, inset 0 0 30px ${color}55; }
          50% { box-shadow: 0 0 0 1px ${ringColor}33, 0 16px 48px ${color}66, inset 0 0 36px ${color}77; }
        }
      `}</style>
    </button>
  )
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

/** Aclara/oscurece un hex color por amount % (-100..100). */
function shade(hex: string, amount: number): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  let r = (n >> 16) & 0xff
  let g = (n >> 8) & 0xff
  let b = n & 0xff
  const f = amount / 100
  r = clamp(Math.round(r + (f > 0 ? (255 - r) * f : r * f)), 0, 255)
  g = clamp(Math.round(g + (f > 0 ? (255 - g) * f : g * f)), 0, 255)
  b = clamp(Math.round(b + (f > 0 ? (255 - b) * f : b * f)), 0, 255)
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}
