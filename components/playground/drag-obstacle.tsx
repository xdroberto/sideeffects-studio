'use client'

import { useEffect, useRef, useState } from 'react'

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
  // Pulse de "released": cuando el user suelta, escalamos brevemente
  // (1.0 → 1.08 → 1.0) como guiño físico. El pulso del pulse infinito
  // ambient se pausa durante el drag (state `dragging`) para que el
  // release sea legible.
  const [released, setReleased] = useState(0)
  const [dragging, setDragging] = useState(false)
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      if (!dragRef.current.active) return
      dragRef.current.active = false
      document.body.style.cursor = ''
      setDragging(false)
      // Trigger pulse on release. Incrementamos el contador para que el
      // mismo release-after-release dispare otra animación aunque el
      // valor sea numéricamente "el mismo" estado.
      setReleased(r => r + 1)
      if (releaseTimer.current) clearTimeout(releaseTimer.current)
      releaseTimer.current = setTimeout(() => setReleased(0), 180)
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (releaseTimer.current) clearTimeout(releaseTimer.current)
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
    setDragging(true)
  }

  // Visual: variable proposicional (default `P`) renderizada como glifo
  // monospace centrado, como guiño a lógica formal — el orb ES una
  // proposición que, al desplazarse, reorganiza el razonamiento (texto)
  // a su alrededor. El círculo rojo de fondo conserva la matemática
  // del obstáculo (computeFreeRanges) intacta — solo cambia el glifo
  // del centro. El label se pasa como prop para que el padre pueda
  // elegir el operador (`P`, `→`, `∧`, `¬`, etc.).
  //
  // Animation logic:
  // - Idle: `orb-pulse` infinito (3s ease-in-out)
  // - Dragging: ambient pulse pausada, scale 1.04 (lift visual)
  // - Released: trigger one-shot `orb-release-<n>` (180ms) que escala
  //   brevemente 1.0 → 1.08 → 1.0 como guiño físico de "let go". El
  //   contador `released` cambia el nombre de la keyframe en cada
  //   release, lo que fuerza al navegador a re-arrancar la animación
  //   sin necesidad de re-montar el elemento (que rompería el pointer
  //   capture).
  const animation = dragging
    ? 'none'
    : released > 0
      ? `orb-release-${released} 180ms ease-out`
      : 'orb-pulse 3s ease-in-out infinite'
  const dragScale = dragging ? 1.04 : 1
  const glyph = label && label.length > 0 ? label : 'P'
  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={onPointerDown}
      aria-label={`Drag the proposition ${glyph}. The text reflows around it.`}
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
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        padding: 0,
        overflow: 'hidden',
        animation,
        transform: `scale(${dragScale})`,
        transition: 'transform 180ms ease-out',
      }}
    >
      {/* Glifo proposicional centrado. Tipografía heredada (Space Mono).
          Italic + tracking ligero — convención de variables en lógica. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -54%)',
          fontFamily: 'inherit',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: `${Math.round(radius * 0.95)}px`,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: ringColor,
          textShadow: `0 2px 8px ${shade(color, -65)}, 0 0 1px ${ringColor}55`,
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {glyph}
      </span>
      <style>{`
        @keyframes orb-pulse {
          0%, 100% { box-shadow: 0 0 0 1px ${ringColor}14, 0 14px 44px ${color}4d, inset 0 0 38px ${shade(color, -55)}; }
          50% { box-shadow: 0 0 0 1px ${ringColor}33, 0 18px 52px ${color}66, inset 0 0 44px ${shade(color, -55)}; }
        }
        @keyframes orb-release-${released} {
          0% { transform: scale(1.04); box-shadow: 0 0 0 1px ${ringColor}33, 0 18px 52px ${color}66, inset 0 0 44px ${shade(color, -55)}; }
          45% { transform: scale(1.085); box-shadow: 0 0 0 2px ${ringColor}55, 0 22px 68px ${color}88, inset 0 0 50px ${shade(color, -55)}; }
          100% { transform: scale(1); box-shadow: 0 0 0 1px ${ringColor}14, 0 14px 44px ${color}4d, inset 0 0 38px ${shade(color, -55)}; }
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
