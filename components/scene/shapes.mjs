// @ts-check
/**
 * Formas de la escena persistente: 200 cuerdas por forma, en coordenadas
 * locales del plano z = 0 (x a la derecha, y hacia arriba).
 *
 * El home es la misma matemática que el ConnectingLines original del hero:
 * 100 puntos de una onda senoidal en x ∈ [-5, 5], cada uno con una cuerda
 * al ápice de arriba (0, 3) y otra al de abajo (0, -3). Las demás formas
 * reacomodan esas mismas 200 cuerdas como portada de cada experiencia.
 *
 * Sin dependencias para poder probarlo con `node --test`
 * (tests/node/scene-shapes.test.mjs).
 */

/** @typedef {'home' | 'sf01' | 'chord' | 'playground' | 'line'} ShapeKind */

export const SEGMENTS = 200
export const DOTS = 100

/** Tamaño local de cada forma, para escalar la portada a su caja. */
export const BOUNDS = {
  home: { w: 10, h: 6 },
  sf01: { w: 9.6, h: 3.4 },
  chord: { w: 6.9, h: 3.3 },
  playground: { w: 4.4, h: 4.4 },
  line: { w: 10, h: 0.6 },
}

/**
 * Ruta → forma. Tolera la barra final de `trailingSlash: true`.
 * @param {string | null | undefined} pathname
 * @returns {ShapeKind}
 */
export function shapeForPath(pathname) {
  const p = (pathname || '/').replace(/\/+$/, '') || '/'
  if (p === '/') return 'home'
  if (p === '/sf01') return 'sf01'
  if (p === '/chord-lab') return 'chord'
  if (p === '/playground') return 'playground'
  return 'line'
}

/**
 * Parámetros de movimiento. `t` es la fase en segundos. Para el home:
 * `amp` (alto de la onda), `apex` (alto de los ápices; 0 = plegado sobre
 * la onda), `freq` y `disp` (desplazamiento por punto de la onda: la
 * cuerda que se pulsa, hero.mjs).
 * @typedef {{ t: number, amp?: number, apex?: number, freq?: number, disp?: ArrayLike<number> | null }} ShapeParams
 */

/**
 * Escribe la forma en `out` (Float32Array de SEGMENTS * 4: x1, y1, x2, y2
 * por cuerda). Los puntos de la onda (los "dots") son los inicios de las
 * primeras 100 cuerdas en todas las formas.
 * @param {ShapeKind} kind
 * @param {Float32Array} out
 * @param {ShapeParams} p
 */
export function writeShape(kind, out, p) {
  const t = p.t
  /** @param {number} i @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2 */
  const set = (i, x1, y1, x2, y2) => {
    out[i * 4] = x1
    out[i * 4 + 1] = y1
    out[i * 4 + 2] = x2
    out[i * 4 + 3] = y2
  }

  if (kind === 'home') {
    const amp = p.amp ?? 0.6
    const apex = p.apex ?? 3
    const freq = p.freq ?? 1
    const disp = p.disp
    for (let i = 0; i < 100; i++) {
      const x = (i / 99) * 10 - 5
      const y = Math.sin(x * freq + t) * amp + (disp ? disp[i] : 0)
      set(i, x, y, 0, apex)
      set(100 + i, x, y, 0, -apex)
    }
    return
  }

  if (kind === 'sf01') {
    // Dos decks, como un DJ: dos diamantes pequeños que giran en sentidos opuestos.
    for (let d = 0; d < 2; d++) {
      const cx = d ? 2.6 : -2.6
      const ph = d ? -t * 1.3 : t
      for (let j = 0; j < 50; j++) {
        const xn = j / 49 - 0.5
        const x = cx + xn * 4.4
        const y = Math.sin(xn * 10 + ph) * 0.3
        set(d * 100 + j, x, y, cx, 1.6)
        set(d * 100 + 50 + j, x, y, cx, -1.6)
      }
    }
    return
  }

  if (kind === 'chord') {
    // Ocho pads de 4×2, cada uno tejido con 25 cuerdas en dos esquinas
    // opuestas (curve stitching), así se lee como una lente completa.
    const s0 = 1.5, gap = 0.3
    for (let pad = 0; pad < 8; pad++) {
      const s = s0 * (1 + 0.03 * Math.sin(t * 1.3 + pad))
      const x0 = -3.45 + (pad % 4) * (s0 + gap) + (s0 - s) / 2
      const y0 = 1.65 - Math.floor(pad / 4) * (s0 + gap) - (s0 - s) / 2
      for (let k = 0; k < 25; k++) {
        const i = pad * 25 + k
        if (k < 13) {
          const a = k / 12
          set(i, x0 + a * s, y0, x0 + s, y0 - a * s)
        } else {
          const a = (k - 13) / 11
          set(i, x0 + s - a * s, y0 - s, x0, y0 - s + a * s)
        }
      }
    }
    return
  }

  if (kind === 'playground') {
    // El orbe: tabla de multiplicar sobre un círculo (como el boceto Túnel).
    const R = 2.2
    const m = 2 + ((t * 0.12) % 7)
    for (let k = 0; k < SEGMENTS; k++) {
      const a1 = (Math.PI * 2 * k) / SEGMENTS + Math.PI / 2
      const a2 = (Math.PI * 2 * ((k * m) % SEGMENTS)) / SEGMENTS + Math.PI / 2
      set(k, R * Math.cos(a1), R * Math.sin(a1), R * Math.cos(a2), R * Math.sin(a2))
    }
    return
  }

  // 'line': las cuerdas se acuestan sobre la onda; se lee como una sola línea tranquila.
  for (let i = 0; i < 100; i++) {
    const xa = (i / 100) * 10 - 5
    const xb = ((i + 1) / 100) * 10 - 5
    const ya = Math.sin(xa + t * 0.5) * 0.15
    const yb = Math.sin(xb + t * 0.5) * 0.15
    set(i, xa, ya, xb, yb)
    set(100 + i, xa, ya, xb, yb)
  }
}

/** Interpolación suave para el morph (cúbica de entrada y salida). */
export const ease = (/** @type {number} */ x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/**
 * Mezcla `from` → `to` con un pequeño retraso por cuerda: se reacomodan en
 * ola, no de golpe. `u` va de 0 a 1.
 * @param {Float32Array} from @param {Float32Array} to @param {number} u @param {Float32Array} out
 */
export function morph(from, to, u, out) {
  for (let i = 0; i < SEGMENTS; i++) {
    const d = (i / SEGMENTS) * 0.4
    const e = ease(Math.min(1, Math.max(0, u * 1.4 - d)))
    for (let k = 0; k < 4; k++) {
      const j = i * 4 + k
      out[j] = from[j] + (to[j] - from[j]) * e
    }
  }
}
