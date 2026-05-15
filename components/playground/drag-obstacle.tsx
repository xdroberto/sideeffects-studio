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
      // GLOW_PADDING: el orb tiene un halo de glow más allá del radio
      // del círculo. Si dejamos al user pegarlo al borde del container,
      // ese halo se recorta visualmente contra el borde y se hace obvio
      // el límite. Reservamos padding extra para que el glow respire.
      // Ajustado en relación al box-shadow blur del orb (~16-24px).
      const GLOW_PADDING = 16
      const nextCX = clamp(dragRef.current.startCX + dx, radius + GLOW_PADDING, bounds.width - radius - GLOW_PADDING)
      const nextCY = clamp(dragRef.current.startCY + dy, radius + GLOW_PADDING, bounds.height - radius - GLOW_PADDING)
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

  // Visual: busto de filósofo (game-icons.net "philosopher-bust" by
  // Delapouite, CC BY 3.0). El círculo rojo de fondo conserva la
  // matemática del obstáculo (computeFreeRanges) intacta — solo el
  // glifo del centro cambia.
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
  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={onPointerDown}
      aria-label="Drag the philosopher. The text reflows around it."
      style={{
        position: 'absolute',
        left: `${cx - radius}px`,
        top: `${cy - radius}px`,
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 28%, ${shade(color, 18)}, ${color} 55%, ${shade(color, -45)})`,
        border: `1px solid ${ringColor}26`,
        // Glow reducido: menos blur radius + menos opacidad para que el
        // halo no se desborde tanto del orb. Antes: 0 14px 44px ${color}4d.
        boxShadow: `0 0 0 1px ${ringColor}14, 0 6px 20px ${color}33, inset 0 0 32px ${shade(color, -55)}`,
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
      {/* Busto del filósofo — game-icons.net `philosopher-bust` por
          Delapouite, licencia CC BY 3.0. */}
      <svg
        viewBox="0 0 512 512"
        width="68%"
        height="68%"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'block',
          pointerEvents: 'none',
          color: ringColor,
          filter: `drop-shadow(0 2px 6px ${shade(color, -65)})`,
        }}
        aria-hidden
      >
        <path
          fill="currentColor"
          fillOpacity="0.94"
          d="M256 37.4c-28.1 0-50.9 21.3-50.9 59.9c0 29.8 12.9 58.3 12.9 58.3l15-18.5h12.6v-22.7H218V93.5h76v20.9h-27.6v22.7H279l15 18.5s12.9-28.5 12.9-58.3c0-38.6-22.8-59.9-50.9-59.9m-66.9 72.5c-1.3 8.7-1.9 17.8-1.9 27.2c0 64.2 30.8 106.4 68.8 106.4s68.8-42.2 68.8-106.4c0-9.4-.6-18.5-1.9-27.2c-2.8 28.3-13.7 52.6-13.7 52.6L298.1 187l-27-33.2h-30.2l-27 33.2l-11.1-24.5s-10.9-24.3-13.7-52.6m58.6 53.7h16.6v12.7h-16.6zm71 19.7v.2zm-145.5 5l-36.9 9.3L168 339.4h61.8l24-75.1c-34.7-1.2-66.9-28.9-80.6-76m165.6 0c-10.5 36.2-32 61-57.2 71L256 339.4h21.7l20.7-70.4l12 3.5l-19.6 66.9h16.9l36.4-125.8l12 3.5l-35.4 122.3H344l31.7-141.8zM197 360.6v94h18v-64h82v64h18v-94zm36 48v46h46v-46zm-69.3 64l-14 18h212.6l-14-18z"
        />
      </svg>
      <style>{`
        @keyframes orb-pulse {
          0%, 100% { box-shadow: 0 0 0 1px ${ringColor}14, 0 6px 20px ${color}33, inset 0 0 32px ${shade(color, -55)}; }
          50% { box-shadow: 0 0 0 1px ${ringColor}26, 0 8px 26px ${color}44, inset 0 0 36px ${shade(color, -55)}; }
        }
        @keyframes orb-release-${released} {
          0% { transform: scale(1.04); box-shadow: 0 0 0 1px ${ringColor}26, 0 8px 26px ${color}44, inset 0 0 36px ${shade(color, -55)}; }
          45% { transform: scale(1.085); box-shadow: 0 0 0 2px ${ringColor}44, 0 12px 32px ${color}55, inset 0 0 40px ${shade(color, -55)}; }
          100% { transform: scale(1); box-shadow: 0 0 0 1px ${ringColor}14, 0 6px 20px ${color}33, inset 0 0 32px ${shade(color, -55)}; }
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
