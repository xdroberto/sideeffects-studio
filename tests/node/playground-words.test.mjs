import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MOTTO, createWordCycle } from '../../lib/playground/words.mjs'

/** Avanza `seconds` en pasos de 0.05 s y devuelve el último estado. */
function run(cycle, seconds, onStep) {
  let s = null
  for (let k = 0; k < Math.round(seconds / 0.05); k++) {
    s = cycle.step(0.05)
    if (onStep) onStep(s, (k + 1) * 0.05)
  }
  return s
}

test('recita el lema en orden', () => {
  assert.deepEqual(MOTTO, ['playground', 'generative', 'art', 'interactive', 'design', 'visual', 'symphony', 'side effects'])
  const cycle = createWordCycle({ words: MOTTO })
  let s = run(cycle, 6.4)
  assert.equal(s.cur, 'playground')
  assert.equal(s.sweep, -1)
  assert.equal(s.changed, false, 'sin barrido no hay que redibujar')
  s = run(cycle, 0.2)
  assert.equal(s.next, 'generative')
  assert.ok(s.sweep >= 0 && s.sweep < 1, 'el barrido empieza a los 6.5 s')
  assert.equal(s.changed, true)
  s = run(cycle, 1.6)
  assert.equal(s.cur, 'generative')
  assert.equal(s.sweep, -1)

  const seen = ['playground', 'generative']
  run(cycle, 8 * (6.5 + 1.6) + 1, (st) => {
    if (st.cur !== seen.at(-1)) seen.push(st.cur)
  })
  assert.deepEqual(seen, [...MOTTO, 'playground', 'generative'])
})

test('la palabra del visitante se queda 25 s y vuelve el lema', () => {
  const cycle = createWordCycle({ words: MOTTO })
  run(cycle, 2)
  cycle.pin('  hola  ')
  let s = run(cycle, 1.7)
  assert.equal(s.cur, 'hola')
  const swept = []
  run(cycle, 24.8, (st, t) => {
    if (st.sweep >= 0) swept.push(t)
  })
  assert.deepEqual(swept, [], 'la palabra del visitante no se mueve antes de 25 s')
  s = run(cycle, 0.4)
  assert.ok(s.sweep >= 0, 'a los 25 s empieza a volver el lema')
  assert.equal(s.next, 'generative')
  s = run(cycle, 1.6)
  assert.equal(s.cur, 'generative')
})

test('una palabra vacía regresa al lema', () => {
  const cycle = createWordCycle({ words: MOTTO })
  cycle.pin('hola')
  run(cycle, 5)
  cycle.pin('   ')
  const s = run(cycle, 1.55)
  assert.ok(s.sweep >= 0, 'el lema vuelve en 1.5 s o menos')
  assert.equal(s.next, 'generative')
})

test('la palabra del visitante se recorta a 24 caracteres', () => {
  const cycle = createWordCycle({ words: MOTTO })
  cycle.pin('x'.repeat(40))
  const s = run(cycle, 1.7)
  assert.equal(s.cur, 'x'.repeat(24))
})

test('en reposo, la palabra se escribe de golpe y una vacía regresa al lema', () => {
  // Con «reducir movimiento» no hay reloj que haga el barrido.
  const cycle = createWordCycle({ words: MOTTO })
  let s = cycle.pinNow('  thread ')
  assert.equal(s.cur, 'thread')
  assert.equal(s.sweep, -1)
  s = cycle.pinNow('   ')
  assert.equal(s.cur, 'generative', 'la palabra vacía regresa a la siguiente del lema')
  assert.equal(s.sweep, -1)
})
