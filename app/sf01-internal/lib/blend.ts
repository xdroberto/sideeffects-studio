export type BlendMode =
  | 'crossfade'
  | 'add'
  | 'multiply'
  | 'screen'
  | 'difference'
  | 'overlay'

export const BLEND_MODES: { id: BlendMode; label: string }[] = [
  { id: 'crossfade', label: 'X-Fade' },
  { id: 'add', label: 'Add' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'screen', label: 'Screen' },
  { id: 'difference', label: 'Difference' },
  { id: 'overlay', label: 'Overlay' },
]

export const BLEND_MODE_INDEX: Record<BlendMode, number> = {
  crossfade: 0,
  add: 1,
  multiply: 2,
  screen: 3,
  difference: 4,
  overlay: 5,
}
