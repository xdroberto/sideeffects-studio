'use client'

import { FONT_FAMILIES, type OverlayState } from '../lib/overlay'

export function TextOverlay({ overlay }: { overlay: OverlayState }) {
  if (!overlay.enabled || !overlay.text) return null

  const color = `rgb(${Math.round(overlay.color[0] * 255)}, ${Math.round(
    overlay.color[1] * 255
  )}, ${Math.round(overlay.color[2] * 255)})`

  const transformX =
    overlay.align === 'left' ? '0%' : overlay.align === 'right' ? '-100%' : '-50%'

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-30"
      style={{ mixBlendMode: overlay.mixBlend ? 'difference' : 'normal' }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${overlay.x * 100}%`,
          top: `${overlay.y * 100}%`,
          transform: `translate(${transformX}, -50%)`,
          fontSize: `${overlay.size * 100}vmin`,
          fontFamily: FONT_FAMILIES[overlay.font],
          color,
          opacity: overlay.opacity,
          letterSpacing: `${overlay.letterSpacing}em`,
          textAlign: overlay.align,
          lineHeight: 0.95,
          whiteSpace: 'pre-wrap',
          textTransform: 'none',
          fontWeight: overlay.font === 'display' ? 900 : 400,
        }}
      >
        {overlay.text}
      </div>
    </div>
  )
}
