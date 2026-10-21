import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MALKAUNS, BHUPALI, SA, degreeIn, degree, pluck, bell, tick, room, isClean } from '../../lib/playground/sound.mjs'

const SR = 44100

function rms(data, from, to) {
  let s = 0
  for (let i = from; i < to; i++) s += data[i] * data[i]
  return Math.sqrt(s / (to - from))
}

function peak(data) {
  let p = 0
  for (const v of data) p = Math.max(p, Math.abs(v))
  return p
}

test('los grados fuera de la escala dan frecuencias válidas', () => {
  for (const scale of [MALKAUNS, BHUPALI]) {
    let prev = 0
    for (let deg = -12; deg <= 12; deg++) {
      const f = degreeIn(scale, SA, deg)
      assert.ok(Number.isFinite(f) && f > 0, `grado ${deg}: ${f}`)
      assert.ok(f > prev, `grado ${deg} (${f}) no sube respecto al anterior (${prev})`)
      prev = f
    }
  }
  // −1 es la última nota de la escala, una octava abajo: Dha (9) − 12 = −3 semitonos.
  assert.ok(Math.abs(degreeIn(BHUPALI, 277.18, -1) - 233.08) <= 0.01)
  // Malkauns: Sa, ga komal (3 semitonos), y la octava en el grado 5.
  assert.ok(Math.abs(degree(SA, 0) - 138.59) <= 0.01)
  assert.ok(Math.abs(degree(SA, 1) - 164.81) <= 0.01)
  assert.ok(Math.abs(degree(SA, 5) - 277.18) <= 0.01)
})

test('sitar, tanpura, campana y clic: sin NaN, pico ≤ 0.9 y se apagan', () => {
  const sounds = [
    ['sitar grave', pluck(SR, SA, 'sitar')],
    ['sitar agudo', pluck(SR, degree(SA * 2, 9), 'sitar')],
    ['tanpura', pluck(SR, SA / 2, 'tanpura')],
    ['campana', bell(SR, degreeIn(BHUPALI, SA * 2, 3))],
    ['clic', tick(SR)],
  ]
  for (const [name, data] of sounds) {
    assert.ok(isClean(data), `${name}: muestras no finitas o búfer vacío`)
    assert.ok(peak(data) <= 0.9 + 1e-6, `${name}: pico ${peak(data)}`)
    assert.ok(peak(data) > 0.5, `${name}: casi en silencio (${peak(data)})`)
    if (name === 'clic') continue
    const q = data.length / 4
    const r = [0, 1, 2, 3].map((k) => rms(data, Math.floor(k * q), Math.floor((k + 1) * q)))
    for (let k = 1; k < 4; k++) assert.ok(r[k] < r[k - 1], `${name}: el cuarto ${k + 1} (${r[k]}) no baja (${r[k - 1]})`)
  }
  const [L, R] = room(SR, 3.2)
  assert.equal(L.length, Math.floor(SR * 3.2))
  assert.ok(isClean(L) && isClean(R), 'la sala trae muestras no finitas')
  assert.ok(rms(L, 0, SR) > 10 * rms(L, L.length - SR / 2, L.length), 'la sala no se apaga')
})

test('una frecuencia inválida no produce sonido', () => {
  for (const f of [NaN, 0, -5, Infinity, undefined]) {
    assert.equal(isClean(pluck(SR, f, 'sitar')), false, `sitar con f = ${f}`)
    assert.equal(isClean(pluck(SR, f, 'tanpura')), false, `tanpura con f = ${f}`)
    assert.equal(isClean(bell(SR, f)), false, `campana con f = ${f}`)
  }
  assert.equal(isClean(Float32Array.of(0, NaN, 0.2)), false)
  assert.equal(isClean(Float32Array.of(0, 0.1, Infinity)), false)
  assert.equal(isClean(new Float32Array(1)), false)
  assert.equal(isClean(Float32Array.of(0, 0.1, -0.2)), true)
})
