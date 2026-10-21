import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createNoteGate, createPeg, chimeDegree } from '../../lib/playground/harp-logic.mjs'

const EPS = 1e-9
const DEG = Math.PI / 180

test('un rasgueo rápido suena como arpegio', () => {
  const gate = createNoteGate()
  const played = []
  // 50 cuerdas distintas cruzadas en un cuarto de segundo.
  for (let i = 0; i < 50; i++) {
    const now = (0.25 * i) / 49
    const at = gate.request(1000 + i, now)
    if (at !== null) played.push({ at, now })
  }
  assert.ok(played.length >= 8 && played.length <= 12, `${played.length} notas`)
  assert.ok(Math.abs(played[0].at - 0.02) < EPS, 'la primera nota no espera')
  for (let k = 1; k < played.length; k++) {
    assert.ok(played[k].at - played[k - 1].at >= 0.08 - EPS, `notas ${k - 1} y ${k} a ${played[k].at - played[k - 1].at} s`)
  }
  for (const p of played) assert.ok(p.at - p.now <= 0.6 + EPS, `una nota espera ${p.at - p.now} s`)
})

test('la misma nota no se repite antes de 0.25 s', () => {
  const gate = createNoteGate()
  assert.ok(Math.abs(gate.request(5, 0) - 0.02) < EPS)
  assert.equal(gate.request(5, 0.1), null)
  assert.ok(Math.abs(gate.request(7, 0.1) - 0.12) < EPS, 'otra nota sí suena')
  assert.equal(gate.request(5, 0.26), null)
  assert.ok(Math.abs(gate.request(5, 0.28) - 0.3) < EPS)
})

test('cuatro toques completan la vuelta y afinan, otros cuatro la regresan', () => {
  const peg = createPeg()
  const first = [1, 2, 3, 4].flatMap(() => peg.tap())
  assert.deepEqual(first, [
    { type: 'notch', step: 1, dir: 1 },
    { type: 'notch', step: 2, dir: 1 },
    { type: 'notch', step: 3, dir: 1 },
    { type: 'complete', tuned: true, dir: 1 },
  ])
  assert.equal(peg.state().tuned, true)
  assert.ok(Math.abs(peg.state().ang - 2 * Math.PI) < EPS, 'la clavija se asienta en su muesca')
  const second = [1, 2, 3, 4].flatMap(() => peg.tap())
  assert.deepEqual(second.at(-1), { type: 'complete', tuned: false, dir: 1 })
  assert.equal(second.length, 4)
  assert.equal(peg.state().tuned, false)
})

test('regresar la manivela al inicio no pide la campana −1', () => {
  const peg = createPeg()
  const events = [...peg.drag(100 * DEG), ...peg.drag(-110 * DEG)]
  assert.deepEqual(events, [
    { type: 'notch', step: 1, dir: 1 },
    { type: 'notch', step: 0, dir: -1 },
  ])
  assert.equal(chimeDegree(0), null)
  assert.equal(chimeDegree(1), 0)
  assert.equal(chimeDegree(-3), 2)
  for (const e of events) {
    if (e.type !== 'notch') continue
    const d = chimeDegree(e.step)
    assert.ok(d === null || d >= 0, `paso ${e.step} → grado ${d}`)
  }
})

test('sacudir en la frontera no cuenta ida y vuelta', () => {
  const peg = createPeg()
  const events = [...peg.drag(40 * DEG)]
  for (let k = 0; k < 10; k++) events.push(...peg.drag(10 * DEG), ...peg.drag(-10 * DEG))
  assert.deepEqual(events, [])
  // Ya pasada la muesca, sacudir de regreso cerca de la frontera tampoco cuenta.
  assert.equal(peg.drag(20 * DEG).length, 1)
  const back = []
  for (let k = 0; k < 10; k++) back.push(...peg.drag(-20 * DEG), ...peg.drag(20 * DEG))
  assert.deepEqual(back, [])
  assert.equal(peg.state().count, 1)
})

test('girar al revés también completa', () => {
  const peg = createPeg()
  const events = [1, 2, 3, 4].flatMap(() => peg.drag(-90 * DEG))
  assert.deepEqual(events, [
    { type: 'notch', step: -1, dir: -1 },
    { type: 'notch', step: -2, dir: -1 },
    { type: 'notch', step: -3, dir: -1 },
    { type: 'complete', tuned: true, dir: -1 },
  ])
  assert.equal(peg.state().tuned, true)
})

test('una vuelta a medias regresa sola sin cambiar la afinación', () => {
  const peg = createPeg()
  peg.tap()
  peg.tap()
  const events = peg.unwind()
  assert.deepEqual(events, [
    { type: 'notch', step: 1, dir: -1 },
    { type: 'notch', step: 0, dir: -1 },
  ])
  assert.deepEqual(peg.state(), { ang: 0, count: 0, base: 0, tuned: false })
  assert.deepEqual(peg.unwind(), [])
})
