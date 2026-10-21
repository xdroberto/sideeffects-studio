/**
 * Viñeta de señal: la onda del diamante del hero, a escala de etiqueta,
 * corriendo en lugar del punto rojo pulsante. El SVG mide dos longitudes
 * de onda y se desplaza media caja en loop (ver `.signal-bullet-wave` en
 * globals.css), así el ciclo no tiene costura. Con «reducir movimiento»
 * queda quieta.
 */
export function SignalBullet({ size = 'md', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const w = size === 'sm' ? 14 : 18
  const h = size === 'sm' ? 6 : 8
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 overflow-hidden text-signal ${className}`}
      style={{ width: w, height: h }}
    >
      <svg
        viewBox="0 0 36 8"
        width={w * 2}
        height={h}
        preserveAspectRatio="none"
        className="block signal-bullet-wave"
      >
        <path
          d="M0 4 Q 4.5 0 9 4 T 18 4 T 27 4 T 36 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
