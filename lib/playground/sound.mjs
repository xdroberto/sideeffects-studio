// @ts-check
/**
 * Síntesis de cuerdas del Harp, sin DOM para probarla con `node --test`
 * (tests/node/playground-sound.test.mjs).
 *
 * Karplus-Strong: una ráfaga de ruido recorre una línea de retardo del largo
 * de un periodo y se suaviza en cada vuelta, como una cuerda real. Para el
 * sitar y la tanpura, el puente «jawari»: un recorte de un solo lado dentro
 * del lazo que agrega el zumbido brillante mientras la cuerda vibra fuerte y
 * se apaga cuando la vibración baja.
 *
 * Un solo búfer con NaN que llega al compresor o a la reverberación silencia
 * para siempre todo el audio de la página. Por eso los generadores devuelven
 * un búfer de una muestra con una frecuencia inválida, e `isClean` es la
 * guarda que el motor consulta antes de reproducir cualquier búfer.
 */

/** @typedef {'sitar' | 'tanpura'} Timbre */

/** Malkauns: Sa, ga komal, Ma, dha komal, ni komal. Nocturno y pentatónico: ninguna combinación desafina. */
export const MALKAUNS = [0, 3, 5, 8, 10]

/** Bhupali: Sa, Re, Ga, Pa, Dha. Pentatónica mayor y luminosa: la escala del instrumento «afinado». */
export const BHUPALI = [0, 2, 4, 7, 9]

/** Sa en Do# (C#3), una afinación común de sitar. */
export const SA = 138.59

/** @type {Record<Timbre, { dur: number, decay: number, bright: number, jawari: number }>} */
const TIMBRES = {
  sitar: { dur: 3.2, decay: 0.9988, bright: 0.85, jawari: 0.55 },
  tanpura: { dur: 4.6, decay: 0.9994, bright: 0.7, jawari: 0.75 },
}

/**
 * Ruido determinista en [-1, 1].
 * @param {number} seed
 */
function rng(seed) {
  let s = seed % 2147483647 || 1
  return () => (s = (s * 16807) % 2147483647) / 1073741823.5 - 1
}

/** @param {number | undefined} f */
const valid = (f) => typeof f === 'number' && f > 0 && Number.isFinite(f)

/**
 * Normaliza a pico 0.9 y apaga la cola en `fade` segundos para que no truene.
 * @param {Float32Array<ArrayBuffer>} out
 * @param {number} sr
 * @param {number} fade
 */
function finish(out, sr, fade) {
  let peak = 1e-6
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]))
  const n = out.length
  const tail = Math.floor(sr * fade)
  for (let i = 0; i < n; i++) out[i] *= (0.9 / peak) * (tail > 0 ? Math.min(1, (n - 1 - i) / tail) : 1)
  return out
}

/**
 * Una nota pulsada, normalizada a pico 0.9, sin componente continua y con una
 * cola que se desvanece.
 * @param {number} sr frecuencia de muestreo
 * @param {number} f frecuencia de la nota
 * @param {Timbre} timbre
 * @returns {Float32Array<ArrayBuffer>}
 */
export function pluck(sr, f, timbre) {
  if (!valid(f)) return new Float32Array(1)
  const P = TIMBRES[timbre]
  const n = Math.floor(sr * P.dur)
  const N = Math.max(2, Math.round(sr / f))
  const out = new Float32Array(n)
  const ring = new Float32Array(N)
  const rnd = rng(Math.round(f * 977))
  for (let i = 0; i < N; i++) ring[i] = rnd()
  for (let i = 1; i < N; i++) ring[i] = P.bright * ring[i] + (1 - P.bright) * ring[i - 1]
  let mean = 0
  for (let i = 0; i < N; i++) mean += ring[i]
  mean /= N
  for (let i = 0; i < N; i++) ring[i] -= mean
  const bridge = 0.3
  let idx = 0
  for (let i = 0; i < n; i++) {
    const j = idx + 1 === N ? 0 : idx + 1
    const a = ring[idx]
    out[i] = a
    let y = 0.5 * (a + ring[j]) * P.decay
    if (P.jawari > 0 && y > bridge) y = bridge + (y - bridge) * (1 - P.jawari)
    ring[idx] = y
    idx = j
  }
  // Filtro anti-DC: el puente de un solo lado la genera.
  let px = 0
  let py = 0
  for (let i = 0; i < n; i++) {
    const x = out[i]
    py = x - px + 0.995 * py
    px = x
    out[i] = py
  }
  return finish(out, sr, 0.35)
}

/**
 * Una campana suave, de caja de música: parciales inarmónicos que se apagan a
 * distinto ritmo.
 * @param {number} sr
 * @param {number} f
 * @returns {Float32Array<ArrayBuffer>}
 */
export function bell(sr, f) {
  if (!valid(f)) return new Float32Array(1)
  const n = Math.floor(sr * 2.8)
  const out = new Float32Array(n)
  // [razón de frecuencia, amplitud, segundos de caída]
  const partials = [[1, 1, 2.2], [2, 0.3, 1.2], [2.76, 0.2, 0.8], [5.4, 0.07, 0.4], [8.93, 0.03, 0.22]]
  for (const [ratio, amp, tau] of partials) {
    if (f * ratio > sr * 0.45) continue
    const w = (2 * Math.PI * f * ratio) / sr
    const k = 1 / (sr * tau)
    for (let i = 0; i < n; i++) out[i] += amp * Math.sin(w * i) * Math.exp(-i * k)
  }
  const attack = Math.floor(sr * 0.004)
  for (let i = 0; i < attack; i++) out[i] *= i / attack
  return finish(out, sr, 0.3)
}

/**
 * El clic de la clavija: un golpecito de madera, muy corto.
 * @param {number} sr
 * @returns {Float32Array<ArrayBuffer>}
 */
export function tick(sr) {
  const n = Math.floor(sr * 0.05)
  const out = new Float32Array(n)
  const rnd = rng(31)
  for (let i = 0; i < n; i++) {
    const e = Math.exp(-i / (sr * 0.006))
    out[i] = (0.7 * Math.sin((2 * Math.PI * 1900 * i) / sr) + 0.3 * rnd()) * e
  }
  return finish(out, sr, 0)
}

/**
 * Respuesta de una sala para la reverberación: ruido estéreo que se apaga.
 * @param {number} sr
 * @param {number} seconds
 * @returns {[Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>]}
 */
export function room(sr, seconds) {
  const n = Math.floor(sr * seconds)
  const L = new Float32Array(n)
  const R = new Float32Array(n)
  const a = rng(7)
  const b = rng(13)
  let l = 0
  let r = 0
  for (let i = 0; i < n; i++) {
    const env = Math.pow(1 - i / n, 2.6)
    l = 0.55 * l + 0.45 * a()
    r = 0.55 * r + 0.45 * b()
    L[i] = l * env * 0.5
    R[i] = r * env * 0.5
  }
  return [L, R]
}

/**
 * Frecuencia del grado `deg` de una escala de cinco notas a partir de `base`.
 * Los grados negativos bajan de octava (−1 es la última nota, una octava
 * abajo): un grado fuera de la escala nunca da NaN.
 * @param {number[]} scale
 * @param {number} base
 * @param {number} deg
 */
export function degreeIn(scale, base, deg) {
  const m = ((deg % 5) + 5) % 5
  return base * Math.pow(2, (scale[m] + 12 * Math.floor(deg / 5)) / 12)
}

/**
 * Frecuencia del grado `deg` de Malkauns a partir de `base`.
 * @param {number} base
 * @param {number} deg
 */
export const degree = (base, deg) => degreeIn(MALKAUNS, base, deg)

/**
 * La guarda anti-NaN: solo un búfer con más de una muestra, todas finitas,
 * puede llegar al grafo de audio.
 * @param {ArrayLike<number>} data
 */
export function isClean(data) {
  if (!data || data.length <= 1) return false
  for (let i = 0; i < data.length; i++) if (!Number.isFinite(data[i])) return false
  return true
}
