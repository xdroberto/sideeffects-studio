import { test } from 'node:test'
import assert from 'node:assert/strict'
import { threadPath, lengthAtY } from '../../lib/playground/thread.mjs'

/** Lee un path de `M x y` y `C x1 y1 x2 y2 x y` como lista de comandos con números. */
function parse(d) {
  return [...d.matchAll(/([MC])([^MC]*)/g)].map(([, cmd, nums]) => ({ cmd, n: nums.trim().split(/[\s,]+/).map(Number) }))
}

test('el hilo pasa por cada ancla', () => {
  const anchors = [{ x: 10, y: 0 }, { x: 100, y: 200 }, { x: 40, y: 500 }]
  const cmds = parse(threadPath(anchors))
  assert.deepEqual(cmds.map((c) => c.cmd), ['M', 'C', 'C'])
  assert.deepEqual(cmds[0].n, [10, 0])
  // Tangentes verticales: cada control queda sobre su ancla, al 45 % de la distancia vertical.
  assert.deepEqual(cmds[1].n, [10, 90, 100, 110, 100, 200])
  assert.deepEqual(cmds[2].n, [100, 335, 40, 365, 40, 500])
  assert.equal(threadPath([]), '')
  assert.deepEqual(parse(threadPath([{ x: 3, y: 4 }])), [{ cmd: 'M', n: [3, 4] }])
})

test('lengthAtY es monótona y se recorta en los extremos', () => {
  const samples = [{ len: 0, y: 0 }, { len: 50, y: 40 }, { len: 120, y: 100 }, { len: 200, y: 180 }]
  assert.equal(lengthAtY(samples, -10), 0)
  assert.equal(lengthAtY(samples, 500), 200)
  assert.equal(lengthAtY(samples, 20), 25)
  assert.equal(lengthAtY(samples, 100), 120)
  let prev = -1
  for (let y = -20; y <= 200; y += 0.5) {
    const l = lengthAtY(samples, y)
    assert.ok(l >= prev, `en y = ${y}: ${l} < ${prev}`)
    assert.ok(l >= 0 && l <= 200)
    prev = l
  }
  // Un tramo horizontal (dos muestras a la misma altura) no rompe nada.
  const flat = [{ len: 0, y: 0 }, { len: 30, y: 50 }, { len: 90, y: 50 }, { len: 140, y: 100 }]
  assert.equal(lengthAtY(flat, 50), 30)
  assert.equal(lengthAtY(flat, 75), 115)
  assert.equal(lengthAtY([], 10), 0)
})
