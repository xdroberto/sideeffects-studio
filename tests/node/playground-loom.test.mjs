import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SOCRATES_SILHOUETTE, buildTarget, createWeaver } from '../../lib/playground/loom.mjs'

const N = 100
const SQUARE = [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]]

/** Luminancia de prueba: un degradado de izquierda a derecha. */
function gradient() {
  const lum = new Float32Array(N * N)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) lum[y * N + x] = x / N
  return lum
}

const at = (t, x, y) => t[y * N + x]

test('la máscara apaga todo fuera de la silueta', () => {
  const t = buildTarget(gradient(), N, { mask: SQUARE })
  // Fuera del cuadrado (25..75), más allá del difuminado de la orilla: negro.
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const far = x < 21 || x > 78 || y < 21 || y > 78
      if (far) assert.equal(at(t, x, y), 0, `(${x}, ${y}) = ${at(t, x, y)}`)
    }
  }
  // Dentro, lo claro del degradado se vuelve hilo.
  assert.ok(at(t, 70, 50) > 0.5)
  assert.ok(at(t, 70, 50) > at(t, 40, 50))

  // La silueta de Sócrates: a la derecha de la cabeza, dentro del aro, no hay figura.
  const s = buildTarget(gradient(), N, { mask: SOCRATES_SILHOUETTE })
  for (let y = 30; y <= 44; y++) for (let x = 86; x <= 92; x++) assert.equal(at(s, x, y), 0, `(${x}, ${y})`)
  assert.ok(at(s, 60, 40) > 0, 'la cara sí se teje')
})

test('fuera del aro no hay nada que tejer', () => {
  const lum = new Float32Array(N * N).fill(0)
  for (let i = 0; i < N * N; i += 7) lum[i] = 1
  const t = buildTarget(lum, N, {})
  for (const [x, y] of [[0, 0], [99, 0], [0, 99], [99, 99], [3, 10]]) assert.equal(at(t, x, y), 0, `(${x}, ${y})`)
})

test('el contorno brilla aunque la figura sea oscura', () => {
  const t = buildTarget(new Float32Array(N * N), N, { mask: SQUARE, outline: 1 })
  // El contorno es una franja de unos 3 px a cada lado de la orilla.
  const band = (pick) => Math.max(...[-3, -2, -1, 0, 1, 2].map(pick))
  assert.ok(band((d) => at(t, 25 + d, 50)) > 0.3, 'en la orilla izquierda')
  assert.ok(band((d) => at(t, 50, 75 + d)) > 0.3, 'en la orilla de abajo')
  assert.ok(at(t, 25, 50) > 0.1, 'sin hueco en la orilla misma')
  assert.equal(at(t, 50, 50), 0, 'en medio de la figura')
  assert.equal(at(t, 10, 50), 0, 'lejos de la figura')
})

test('el telar termina entre el mínimo y el tope y no une clavos vecinos', () => {
  const disk = new Float32Array(N * N)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) disk[y * N + x] = Math.hypot(x - 50, y - 50) < 30 ? 1 : 0
  const opts = { size: N, pins: 120, gap: 18, minThreads: 100, threads: 3000 }
  const w = createWeaver(opts)
  w.setTarget(buildTarget(disk, N, {}))
  for (let q = w.next(); q >= 0; q = w.next()) w.commit(q)
  assert.equal(w.finished, true)
  assert.ok(w.done >= 100 && w.done < 3000, `${w.done} hilos: se detiene solo cuando ningún hilo mejora`)
  assert.equal(w.seq.length, w.done + 1)
  for (let k = 1; k < w.seq.length; k++) {
    const d = Math.abs(w.seq[k] - w.seq[k - 1])
    assert.ok(Math.min(d, 120 - d) >= 18, `hilo ${k}: clavos ${w.seq[k - 1]} → ${w.seq[k]}`)
    assert.ok(!w.seq.slice(Math.max(1, k - 8), k).includes(w.seq[k]), `hilo ${k} repite un clavo reciente`)
  }

  // Sin nada que mejorar, igual teje el mínimo; con demasiado, para en el tope.
  const empty = createWeaver(opts)
  empty.setTarget(new Float32Array(N * N))
  for (let q = empty.next(); q >= 0; q = empty.next()) empty.commit(q)
  assert.equal(empty.done, 100)
  const full = createWeaver({ ...opts, threads: 300 })
  full.setTarget(new Float32Array(N * N).fill(1))
  for (let q = full.next(); q >= 0; q = full.next()) full.commit(q)
  assert.equal(full.done, 300)
})

test('es determinista', () => {
  const t = buildTarget(gradient(), N, { mask: SOCRATES_SILHOUETTE, outline: 1, tone: 0.3 })
  const a = createWeaver({ size: N, pins: 120 })
  const b = createWeaver({ size: N, pins: 120 })
  a.setTarget(t)
  b.setTarget(t)
  for (let k = 0; k < 50; k++) {
    a.commit(a.next())
    b.commit(b.next())
  }
  assert.equal(a.seq[0], 0)
  assert.deepEqual(a.seq.slice(0, 51), b.seq.slice(0, 51))
})

test('el hilo se mide en un aro de 60 cm', () => {
  const w = createWeaver({ size: N, pins: 120 })
  w.setTarget(new Float32Array(N * N))
  w.commit(60) // del clavo 0 al de enfrente: un diámetro
  assert.ok(Math.abs(w.meters - 0.6) < 1e-9)
  assert.equal(w.pin, 60)
  assert.equal(w.pins.length, 120)
})
