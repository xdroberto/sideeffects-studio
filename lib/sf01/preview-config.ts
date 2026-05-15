/**
 * Configuración compartida del demo de SF-01.
 *
 * El demo público expone DOS shaders (Voronoi, Reaction-Diffusion) que
 * comparten un canvas + un panel de controles adaptativo. Cada shader
 * declara aquí qué 4 sliders se muestran y a qué uniform GLSL mapean.
 *
 * `defaultsFor(shaderId)` produce los valores iniciales del state cuando
 * el user cambia de shader.
 */

export type ShaderId = 'voronoi' | 'reaction-diffusion'

export interface PreviewSliderConfig {
  /** Nombre del uniform en GLSL (e.g. 'u_density'). */
  key: string
  /** Etiqueta visible. */
  label: string
  /**
   * Hint corto y atmosférico debajo del label (lowercase). Explica QUÉ
   * controla cada slider sin entrar en jerga técnica. Roberto pidió
   * preservar la magia de exploración del user — los rangos quedan
   * amplios, los hints son el rail.
   */
  hint: string
  min: number
  max: number
  step: number
  default: number
}

export interface PreviewShaderConfig {
  id: ShaderId
  /** Nombre canónico (canvas top-left "X · live"). */
  label: string
  /** Versión corta para tabs (espacio apretado). Fallback a `label`. */
  tabLabel?: string
  /** Descripción corta — aparece debajo del tab. */
  hint: string
  /** Mensaje pequeño en bottom-right del canvas. */
  canvasFooter: string
  /** Si true, el canvas escucha pointer events para inyectar seeds. */
  acceptsPointerSeeds: boolean
  sliders: PreviewSliderConfig[]
}

export const SHADER_CONFIGS: readonly PreviewShaderConfig[] = [
  {
    id: 'reaction-diffusion',
    label: 'Reaction-Diffusion',
    tabLabel: 'Reaction',
    hint: 'gray-scott · feedback · tap to seed',
    canvasFooter: 'tap or drag anywhere to seed',
    acceptsPointerSeeds: true,
    sliders: [
      // Rangos amplios deliberadamente — Roberto pidió preservar la
      // magia de la exploración. Algunas combinaciones colapsan la
      // simulación (todo plano); el botón CLEAR resucita. Hints
      // atmosféricos, no técnicos.
      {
        key: 'u_feed',
        label: 'Feed',
        hint: 'how much grows back',
        min: 0.01,
        max: 0.08,
        step: 0.001,
        default: 0.037,
      },
      {
        key: 'u_kill',
        label: 'Kill',
        hint: 'how fast it dies off',
        min: 0.04,
        max: 0.068,
        step: 0.0005,
        default: 0.062,
      },
      {
        key: 'u_glow',
        label: 'Glow',
        hint: 'luminance of the bloom',
        min: 0,
        max: 2,
        step: 0.01,
        default: 0.8,
      },
      {
        key: 'u_sharpness',
        label: 'Sharpness',
        hint: 'edge definition',
        min: 0,
        max: 2,
        step: 0.01,
        default: 0.7,
      },
    ],
  },
  {
    id: 'voronoi',
    label: 'Voronoi',
    hint: 'cell tessellation · fragment shader',
    canvasFooter: 'fragment shader · move the sliders',
    acceptsPointerSeeds: false,
    sliders: [
      {
        key: 'u_density',
        label: 'Density',
        hint: 'how packed the cells are',
        min: 1.5,
        max: 25,
        step: 0.1,
        default: 10,
      },
      {
        key: 'u_motion',
        label: 'Motion',
        hint: 'how fast they drift',
        min: 0,
        max: 3,
        step: 0.01,
        default: 0.8,
      },
      {
        key: 'u_hueDrift',
        label: 'Hue drift',
        hint: 'color cycling speed',
        min: 0,
        max: 1,
        step: 0.01,
        default: 0.45,
      },
      {
        key: 'u_edgeIntensity',
        label: 'Edge',
        hint: 'border intensity',
        min: 0,
        max: 2,
        step: 0.01,
        default: 1.0,
      },
    ],
  },
] as const

export function getShaderConfig(id: ShaderId): PreviewShaderConfig {
  const c = SHADER_CONFIGS.find(s => s.id === id)
  if (!c) throw new Error(`Unknown shader: ${id}`)
  return c
}

export function defaultsFor(id: ShaderId): Record<string, number> {
  return Object.fromEntries(getShaderConfig(id).sliders.map(s => [s.key, s.default]))
}

/** Convierte un hex CSS '#rrggbb' a una tupla [r, g, b] normalizada 0..1. */
export function hexToRgb01(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-f]{6})$/i)
  if (!m) return [1, 1, 1]
  const n = parseInt(m[1], 16)
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255]
}
