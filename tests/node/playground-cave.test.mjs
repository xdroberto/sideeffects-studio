import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CAVE, CAVE_SOURCE, wrapLines } from '../../lib/playground/cave.mjs'

const ink = (parts) => parts.join('').replace(/\s+/g, '')

test('la caverna está completa', () => {
  assert.equal(CAVE.length, 17)
  assert.ok(CAVE[0].startsWith('And now, I said, let me show in a figure how far our nature is enlightened or unenlightened:—Behold!'))
  assert.ok(CAVE[15].includes('will he not be perplexed?'))
  assert.equal(CAVE[16], 'Far truer.')
  for (const p of CAVE) assert.ok(!p.includes('--'), `guiones dobles en «${p.slice(0, 40)}…»`)
  assert.equal(CAVE_SOURCE, 'Plato, Republic, Book VII · tr. Benjamin Jowett')
})

test('el ajuste de líneas no pierde palabras ni rebasa columnas', () => {
  assert.deepEqual(wrapLines(['one two three four'], 9), ['one two', 'three', 'four'])
  assert.deepEqual(wrapLines(['I see.', 'Yes, he said.'], 40), ['I see.', 'Yes, he said.'])
  // Una palabra más larga que la columna se corta después de la raya.
  assert.deepEqual(wrapLines(['or unenlightened:—Behold! human'], 16), ['or', 'unenlightened:—', 'Behold! human'])
  for (const cols of [12, 20, 34, 51, 65, 80]) {
    const lines = wrapLines(CAVE, cols)
    assert.ok(lines.length >= CAVE.length)
    for (const l of lines) {
      assert.ok(l.length <= cols, `${cols} columnas: «${l}» mide ${l.length}`)
      assert.equal(l, l.trim(), `${cols} columnas: espacios en las orillas de «${l}»`)
      assert.ok(!l.includes('  '), `${cols} columnas: doble espacio en «${l}»`)
      assert.ok(CAVE.some((p) => p.includes(l)), `${cols} columnas: «${l}» no está en el texto`)
    }
    assert.equal(ink(lines), ink(CAVE), `${cols} columnas: se perdió o se agregó texto`)
  }
})
