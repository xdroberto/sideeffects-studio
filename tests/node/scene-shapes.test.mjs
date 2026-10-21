import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SEGMENTS, BOUNDS, shapeForPath, writeShape, morph } from '../../components/scene/shapes.mjs'

const KINDS = ['home', 'sf01', 'chord', 'playground', 'line']

test('cada ruta tiene su forma, con o sin barra final', () => {
  assert.equal(shapeForPath('/'), 'home')
  assert.equal(shapeForPath(''), 'home')
  assert.equal(shapeForPath(null), 'home')
  assert.equal(shapeForPath('/sf01/'), 'sf01')
  assert.equal(shapeForPath('/sf01'), 'sf01')
  assert.equal(shapeForPath('/chord-lab/'), 'chord')
  assert.equal(shapeForPath('/playground/'), 'playground')
  assert.equal(shapeForPath('/privacy/'), 'line')
  assert.equal(shapeForPath('/no-existe/'), 'line')
})

test('todas las formas escriben 200 cuerdas finitas dentro de sus límites', () => {
  for (const kind of KINDS) {
    for (const t of [0, 1.7, 12.3, 100]) {
      const out = new Float32Array(SEGMENTS * 4).fill(NaN)
      writeShape(kind, out, { t })
      const b = BOUNDS[kind]
      for (let j = 0; j < out.length; j++) {
        assert.ok(Number.isFinite(out[j]), `${kind}: valor ${j} no finito`)
        const half = (j % 2 === 0 ? b.w : b.h) / 2
        assert.ok(Math.abs(out[j]) <= half + 0.35, `${kind}: ${out[j]} fuera de ±${half}`)
      }
    }
  }
})

test('el home es la matemática del ConnectingLines original', () => {
  const out = new Float32Array(SEGMENTS * 4)
  const t = 0.8
  writeShape('home', out, { t })
  for (let i = 0; i < 100; i++) {
    const x = (i / 99) * 10 - 5
    const y = Math.sin(x + t) * 0.6
    // cuerda hacia arriba
    assert.ok(Math.abs(out[i * 4] - x) < 1e-5 && Math.abs(out[i * 4 + 1] - y) < 1e-5)
    assert.equal(out[i * 4 + 2], 0)
    assert.equal(out[i * 4 + 3], 3)
    // cuerda hacia abajo, desde el mismo punto de la onda
    assert.ok(Math.abs(out[(100 + i) * 4] - x) < 1e-5 && Math.abs(out[(100 + i) * 4 + 1] - y) < 1e-5)
    assert.equal(out[(100 + i) * 4 + 3], -3)
  }
})

test('plegar el home (apex = 0) acuesta las cuerdas sobre la onda', () => {
  const out = new Float32Array(SEGMENTS * 4)
  writeShape('home', out, { t: 0, apex: 0 })
  // -apex con apex = 0 da -0; para la geometría es lo mismo.
  for (let i = 0; i < SEGMENTS; i++) assert.equal(Math.abs(out[i * 4 + 3]), 0)
})

test('el morph empieza en la forma de origen y termina en la de destino', () => {
  const a = new Float32Array(SEGMENTS * 4), b = new Float32Array(SEGMENTS * 4), out = new Float32Array(SEGMENTS * 4)
  writeShape('home', a, { t: 0 })
  writeShape('chord', b, { t: 0 })
  morph(a, b, 0, out)
  assert.deepEqual(Array.from(out), Array.from(a))
  morph(a, b, 1, out)
  for (let j = 0; j < out.length; j++) assert.ok(Math.abs(out[j] - b[j]) < 1e-5)
})
