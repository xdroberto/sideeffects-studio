// @ts-check
/**
 * Núcleo del Loom sin DOM ni canvas, para probarlo con `node --test`
 * (tests/node/playground-loom.test.mjs).
 *
 * String art: un solo hilo y un aro de clavos. En cada paso el hilo va al
 * clavo cuya línea más acerca el tejido a la imagen; cuando ningún hilo la
 * acerca, el retrato está listo.
 */

/**
 * La silueta de Sócrates, trazada a mano sobre el grabado de D. Cunego (1783)
 * ya recortado (public/playground/socrates-cunego-1783.jpg), en fracciones del
 * recorte. El string art no resuelve rasgos chicos: lo que se lee es la
 * silueta como envolvente de los hilos.
 * @type {[number, number][]}
 */
export const SOCRATES_SILHOUETTE = [
  [0.47, 0.075], [0.55, 0.07], [0.63, 0.1], [0.7, 0.15], [0.75, 0.22], [0.785, 0.3], [0.79, 0.38], [0.775, 0.44],
  [0.74, 0.48], [0.7, 0.51], [0.665, 0.53], [0.68, 0.58], [0.71, 0.62], [0.8, 0.63], [0.9, 0.66], [1, 0.7],
  [1, 1], [0.22, 1], [0.24, 0.93], [0.28, 0.87], [0.25, 0.8], [0.23, 0.72], [0.225, 0.62], [0.22, 0.55],
  [0.235, 0.51], [0.205, 0.475], [0.225, 0.42], [0.215, 0.36], [0.215, 0.29], [0.235, 0.22], [0.28, 0.16],
  [0.34, 0.11], [0.4, 0.085],
]

/** Diámetro del aro, para medir el hilo. */
const HOOP_CM = 60

/**
 * Suaviza un campo N×N con una caja de 3×3, en su lugar.
 * @param {Float32Array} a
 * @param {number} N
 * @param {number} passes
 */
function blur(a, N, passes) {
  const b = new Float32Array(N * N)
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let s = 0
        let n = 0
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy
          if (yy < 0 || yy >= N) continue
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx
            if (xx < 0 || xx >= N) continue
            s += a[yy * N + xx]
            n++
          }
        }
        b[y * N + x] = s / n
      }
    }
    a.set(b)
  }
  return a
}

/**
 * Rellena un polígono (regla par-impar) renglón por renglón: un píxel es 1 si
 * su centro queda dentro.
 * @param {[number, number][]} poly en fracciones de N
 * @param {number} N
 */
function fill(poly, N) {
  const m = new Float32Array(N * N)
  /** @type {number[]} */
  const xs = []
  for (let y = 0; y < N; y++) {
    const yc = (y + 0.5) / N
    xs.length = 0
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0]
      const yi = poly[i][1]
      const xj = poly[j][0]
      const yj = poly[j][1]
      if (yi > yc !== yj > yc) xs.push(xi + ((yc - yi) * (xj - xi)) / (yj - yi))
    }
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] * N - 0.5))
      for (let x = from; x < N && (x + 0.5) / N < xs[k + 1]; x++) m[y * N + x] = 1
    }
  }
  return m
}

/**
 * La imagen que el telar persigue: el contraste estirado con los píxeles de
 * la figura, solo dentro del aro.
 * @param {Float32Array} lum luminancia N×N en 0..1
 * @param {number} N
 * @param {{ invert?: boolean, gamma?: number, tone?: number, soften?: number, mask?: [number, number][], outline?: number }} opts
 *   invert: lo oscuro se vuelve hilo; gamma: más de 1, las luces mandan;
 *   tone: escala la figura (el contorno no); soften: pasadas de suavizado;
 *   mask: silueta en fracciones del recorte (fuera, negro); outline: cuánto
 *   brilla el borde de la silueta.
 * @returns {Float32Array<ArrayBuffer>}
 */
export function buildTarget(lum, N, { invert = false, gamma = 1.35, tone, soften = 0, mask, outline = 0 }) {
  const l = Float32Array.from(lum, (v) => (invert ? 1 - v : v))
  if (soften) blur(l, N, soften)
  /** @type {Float32Array | null} */
  let m = null
  if (mask) {
    m = blur(fill(mask, N), N, 2)
  }
  // El contraste se estira con los píxeles de la figura, no con el fondo.
  let count = 0
  const all = new Float32Array(N * N)
  for (let i = 0; i < N * N; i++) if (!m || m[i] > 0.5) all[count++] = l[i]
  const vals = all.subarray(0, count).sort()
  const lo = vals.length ? vals[Math.floor(vals.length * 0.02)] : 0
  const hi = vals.length ? vals[Math.floor(vals.length * 0.985)] : 1
  /** @type {Float32Array | null} */
  let edge = null
  if (m && outline) {
    const soft = blur(Float32Array.from(m), N, 3)
    edge = new Float32Array(N * N)
    for (let i = 0; i < N * N; i++) edge[i] = Math.min(1, Math.abs(m[i] - soft[i]) * 4) * outline
  }
  const target = new Float32Array(N * N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x
      if (Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) >= N / 2 - 1) continue
      let t = Math.pow(Math.min(1, Math.max(0, (l[i] - lo) / Math.max(1e-3, hi - lo))), gamma)
      if (tone != null) t *= tone
      // Fuera de la silueta, nada: el perfil se lee contra el negro.
      if (m) t *= m[i]
      if (edge) t = Math.max(t, edge[i])
      target[i] = t
    }
  }
  return target
}

/**
 * El telar: elige clavo tras clavo. `next()` propone el clavo siguiente (−1:
 * terminado) y `commit(q)` tiende el hilo hasta él.
 * @param {{ pins?: number, size?: number, add?: number, bias?: number, gap?: number, threads?: number, minThreads?: number }} [opts]
 *   pins: clavos del aro; size: resolución con la que «ve» la imagen; add:
 *   luz que suma cada hilo; bias: castigo por pasar sobre zonas oscuras; gap:
 *   clavos vecinos que no se unen; threads: tope de hilos; minThreads: antes
 *   de esto no se detiene (con menos hilos se ve ralo).
 */
export function createWeaver({ pins = 300, size = 300, add = 0.03, bias = 0, gap = 18, threads = 6000, minThreads = 2500 } = {}) {
  const N = size
  /** @type {[number, number][]} */
  const coords = []
  for (let k = 0; k < pins; k++) {
    const a = (Math.PI * 2 * k) / pins - Math.PI / 2
    coords.push([N / 2 + (N / 2 - 1) * Math.cos(a), N / 2 + (N / 2 - 1) * Math.sin(a)])
  }
  let target = new Float32Array(N * N)
  const cur = new Float32Array(N * N)
  let seq = [0]
  let pin = 0
  /** @type {number[]} */
  let recent = []
  let done = 0
  let finished = false
  let meters = 0

  /** @param {number} p */
  function bestNext(p) {
    const [x0, y0] = coords[p]
    let best = -1
    let bestScore = -Infinity
    for (let q = 0; q < pins; q++) {
      const dd = Math.abs(q - p)
      if (Math.min(dd, pins - dd) < gap || recent.includes(q)) continue
      const [x1, y1] = coords[q]
      const dx = x1 - x0
      const dy = y1 - y0
      const n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)))
      let sum = 0
      for (let k = 0; k <= n; k++) {
        const i = ((y0 + (dy * k) / n) | 0) * N + ((x0 + (dx * k) / n) | 0)
        sum += target[i] - cur[i] - bias
      }
      const score = sum / (n + 1)
      if (score > bestScore) {
        bestScore = score
        best = q
      }
    }
    // Ningún hilo acerca ya el tejido a la imagen: el retrato está listo.
    return bestScore > 0 || done < minThreads ? best : -1
  }

  return {
    /** @param {Float32Array<ArrayBuffer>} t la imagen a tejer (buildTarget); empieza de cero. */
    setTarget(t) {
      target = t
      cur.fill(0)
      seq = [0]
      pin = 0
      recent = []
      done = 0
      finished = false
      meters = 0
    },
    /** @returns {number} el clavo siguiente, o −1 si el retrato está listo. */
    next() {
      if (finished) return -1
      const q = done < threads ? bestNext(pin) : -1
      if (q < 0) finished = true
      return q
    },
    /** @param {number} q */
    commit(q) {
      const [x0, y0] = coords[pin]
      const [x1, y1] = coords[q]
      const dx = x1 - x0
      const dy = y1 - y0
      const n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)))
      for (let k = 0; k <= n; k++) cur[((y0 + (dy * k) / n) | 0) * N + ((x0 + (dx * k) / n) | 0)] += add
      const steps = Math.min(Math.abs(q - pin), pins - Math.abs(q - pin))
      meters += (HOOP_CM / 100) * Math.sin((Math.PI * steps) / pins)
      seq.push(q)
      recent.push(q)
      if (recent.length > 8) recent.shift()
      pin = q
      done++
    },
    get done() {
      return done
    },
    get finished() {
      return finished
    },
    /** Los clavos tejidos, en orden; empieza en el clavo 0. */
    get seq() {
      return seq
    },
    /** Metros de hilo en un aro de 60 cm. */
    get meters() {
      return meters
    },
    /** El clavo donde está el hilo ahora. */
    get pin() {
      return pin
    },
    /** Coordenadas de los clavos en la imagen N×N. */
    pins: coords,
  }
}
