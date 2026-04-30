export type OverlayAlign = 'left' | 'center' | 'right'
export type OverlayFont = 'sans' | 'mono' | 'serif' | 'display'

export type OverlayState = {
  enabled: boolean
  text: string
  size: number
  x: number
  y: number
  color: [number, number, number]
  opacity: number
  align: OverlayAlign
  font: OverlayFont
  letterSpacing: number
  mixBlend: boolean
}

export const DEFAULT_OVERLAY: OverlayState = {
  enabled: false,
  text: 'SIDE_EFFECTS',
  size: 0.12,
  x: 0.5,
  y: 0.5,
  color: [1, 1, 1],
  opacity: 1,
  align: 'center',
  font: 'mono',
  letterSpacing: 0.15,
  mixBlend: false,
}

export const FONT_FAMILIES: Record<OverlayFont, string> = {
  sans: 'system-ui, -apple-system, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  serif: 'Georgia, "Times New Roman", serif',
  display: 'Impact, "Arial Black", sans-serif',
}
