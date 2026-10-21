import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'

// acorn llega con Next (webpack). Valida cada expresión regular contra una versión de ECMAScript.
const acorn = createRequire(import.meta.url)('acorn')
const DIR = new URL('../../lib/playground/', import.meta.url)

/** Las expresiones regulares de un módulo que un motor ES2017 no podría leer. */
function unreadable(src) {
  const bad = []
  for (const token of acorn.tokenizer(src, { ecmaVersion: 'latest', sourceType: 'module' })) {
    if (token.type.label !== 'regexp') continue
    const { pattern, flags } = token.value
    try {
      acorn.parse(`/${pattern}/${flags}`, { ecmaVersion: 2017 })
    } catch {
      bad.push(`/${pattern}/${flags}`)
    }
  }
  return bad
}

test('las expresiones regulares de Playground se leen en Safari 15 (sin lookbehind)', () => {
  // Safari e iOS anteriores a 16.4 no tienen lookbehind y el error ocurre al leer el
  // módulo: la página entera dejaría de hidratar. ES2017 es el piso conservador.
  // El verificador sí distingue: rechaza un lookbehind y acepta lo de siempre.
  const sample = ["const a = 'x'.split(/(?<=—)/)", 'const b = /a\\.b/g'].join('\n')
  assert.deepEqual(unreadable(sample), ['/(?<=—)/'])
  const files = readdirSync(DIR).filter((f) => f.endsWith('.mjs'))
  assert.ok(files.length >= 6, `pocos módulos: ${files.join(', ')}`)
  for (const file of files) assert.deepEqual(unreadable(readFileSync(new URL(file, DIR), 'utf8')), [], file)
})
