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

  // Visual: silueta minimalista de busto griego (perfil con barba)
  // dentro de un círculo rojo. Mantiene la forma circular para que
  // la matemática del obstáculo (computeFreeRanges) siga siendo
  // exacta — solo cambia lo que se ve.
  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={onPointerDown}
      aria-label="Drag the bust. The text reflows around it."
      style={{
        position: 'absolute',
        left: `${cx - radius}px`,
        top: `${cy - radius}px`,
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 28%, ${shade(color, 18)}, ${color} 55%, ${shade(color, -45)})`,
        border: `1px solid ${ringColor}26`,
        boxShadow: `0 0 0 1px ${ringColor}14, 0 14px 44px ${color}4d, inset 0 0 38px ${shade(color, -55)}`,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        padding: 0,
        overflow: 'hidden',
        animation: 'orb-pulse 3s ease-in-out infinite',
      }}
    >
      {/* Silueta de busto griego — SVG minimalista, perfil derecho */}
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        style={{ display: 'block', pointerEvents: 'none' }}
        aria-hidden
      >
        <defs>
          <radialGradient id="bust-shade" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor={ringColor} stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
          </radialGradient>
        </defs>
        {/* Sombreado interno para profundidad */}
        <circle cx="50" cy="50" r="50" fill="url(#bust-shade)" />
        {/* Busto (perfil mirando a la derecha) — formas geometricas
            que sugieren cabeza, nariz, barba y hombros sin pretender
            realismo. */}
        <g fill={ringColor} fillOpacity="0.92">
          {/* Cabeza + frente + nariz */}
          <path d="M 38,28
                   C 32,28 27,34 27,42
                   C 27,48 28,52 30,55
                   L 30,58
                   L 33,60
                   L 37,58
                   L 37,55
                   L 41,52
                   L 41,49
                   L 38,46
                   L 41,44
                   L 41,40
                   C 41,32 39,28 38,28 Z" />
          {/* Barba */}
          <path d="M 30,58
                   C 26,62 24,68 24,72
                   L 24,78
                   L 28,82
                   L 33,80
                   L 36,78
                   L 38,72
                   L 37,66
                   L 37,58
                   L 33,60 Z" />
          {/* Cuello + hombros */}
          <path d="M 22,82
                   L 22,92
                   L 60,92
                   L 60,82
                   C 56,78 50,76 44,76
                   C 38,76 32,78 28,80 Z" />
        </g>
      </svg>
      <style>{`
        @keyframes orb-pulse {
          0%, 100% { box-shadow: 0 0 0 1px ${ringColor}14, 0 14px 44px ${color}4d, inset 0 0 38px ${shade(color, -55)}; }
          50% { box-shadow: 0 0 0 1px ${ringColor}33, 0 18px 52px ${color}66, inset 0 0 44px ${shade(color, -55)}; }
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
