// @ts-check
/**
 * Geometría del hilo rojo de Playground, sin DOM para probarla con
 * `node --test` (tests/node/playground-thread.test.mjs).
 *
 * El hilo baja de ancla en ancla con curvas suaves: entra y sale de cada una
 * en vertical, como un hilo que cuelga.
 */

/** @param {number} v */
const r = (v) => Math.round(v * 10) / 10

/**
 * Path SVG que pasa por cada ancla, de arriba abajo: cúbicas con tangentes
 * verticales y los controles al 45 % de la distancia vertical.
 * @param {{ x: number, y: number }[]} points
 * @returns {string}
 */
export function threadPath(points) {
  if (!points.length) return ''
  let d = `M${r(points[0].x)} ${r(points[0].y)}`
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const k = 0.45 * (b.y - a.y)
    d += ` C${r(a.x)} ${r(a.y + k)} ${r(b.x)} ${r(b.y - k)} ${r(b.x)} ${r(b.y)}`
  }
  return d
}

/**
 * Cuánto hilo hay que dibujar para llegar a la altura `y`: la longitud a la
 * que el hilo la cruza por primera vez, recortada a [0, total].
 * @param {{ len: number, y: number }[]} samples muestras del path en orden
 * @param {number} y
 * @returns {number}
 */
export function lengthAtY(samples, y) {
  if (!samples.length) return 0
  for (let i = 0; i < samples.length; i++) {
    const b = samples[i]
    if (b.y < y) continue
    if (i === 0) return b.len
    const a = samples[i - 1]
    return b.y === a.y ? b.len : a.len + ((y - a.y) / (b.y - a.y)) * (b.len - a.len)
  }
  return samples[samples.length - 1].len
}
