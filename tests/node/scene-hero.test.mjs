import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHero } from '../../components/scene/hero.mjs'

const idle = { active: false, hover: false, tap: false, x: 0, y: 0 }
const DT = 1 / 60

/** Corre `seconds` de simulación con la misma entrada (o una función del cuadro). */
function run(hero, seconds, input = idle) {
  let f = null
  const n = Math.round(seconds / DT)
  for (let k = 0; k < n; k++) f = hero.step(DT, typeof input === 'function' ? input(k) : input)
  return f
}

/** Mayor desplazamiento de la cuerda. */
const peak = (disp) => disp.reduce((m, d) => Math.max(m, Math.abs(d)), 0)

/** PRNG determinista (mulberry32) para la prueba larga. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

test('un toque jala la cuerda y la suelta; los extremos no se mueven', () => {
  const h = createHero(() => 0.5)
  h.step(DT, { active: true, hover: false, tap: true, x: 0, y: 1.5 })
  const f = run(h, 0.02)
  assert.ok(f.disp[50] > 0.4, `jalón de ${f.disp[50]}`)
  assert.equal(f.disp[0], 0)
  assert.equal(f.disp[99], 0)
  assert.ok(peak(run(h, 5).disp) < 0.15, 'la cuerda se calma')
})

test('cruzar la onda con el mouse la pulsa', () => {
  const h = createHero(() => 0.5)
  run(h, 0.2, { active: true, hover: true, tap: false, x: 0, y: -1.5 })
  assert.ok(peak(h.out.disp) < 1e-6, 'sin cruzar, quieta')
  run(h, 0.1, (k) => ({ active: true, hover: true, tap: false, x: 0, y: -1.5 + k * 0.5 }))
  assert.ok(peak(run(h, 0.1).disp) > 0.05, 'pulsada al cruzar')
})

test('sola un rato, se pulsa sola', () => {
  const h = createHero(() => 0.5)
  assert.ok(peak(run(h, 7).disp) < 1e-6)
  assert.ok(peak(run(h, 1).disp) > 0.05)
})

test('respira: a los 4 s la onda es más alta y el rojo va hacia carmesí', () => {
  const h = createHero()
  const first = h.step(DT, idle)
  const amp0 = first.amp
  const blue0 = first.line[2]
  const f = run(h, 4 - DT)
  assert.ok(f.amp > amp0 * 1.25, `${f.amp} vs ${amp0}`)
  assert.ok(f.line[2] > blue0 * 2, `azul ${f.line[2]} vs ${blue0}`)
  assert.ok(f.line[2] > f.line[1], 'carmesí: más azul que verde')
})

test('un minuto de toques al azar no la desboca', () => {
  const r = rng(7)
  const h = createHero(r)
  const f = run(h, 60, () => {
    const on = r() < 0.6
    return { active: on, hover: on && r() < 0.7, tap: r() < 0.03, x: r() * 14 - 7, y: r() * 8 - 4 }
  })
  for (const k of ['t', 'amp', 'apex', 'act']) assert.ok(Number.isFinite(f[k]), k)
  for (const c of [...f.line, ...f.dot]) assert.ok(Number.isFinite(c) && c >= 0 && c <= 1.3, `color ${c}`)
  assert.ok(peak(f.disp) < 3, `${peak(f.disp)}`)
})
