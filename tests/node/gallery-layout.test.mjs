import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planGallery } from '../../lib/gallery-layout.mjs'

const KINDS = ['portrait', 'square', 'landscape']

// Generador determinista para que una falla sea reproducible.
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function randomItems(n, rand) {
  return Array.from({ length: n }, () => ({
    aspectRatio: KINDS[Math.floor(rand() * KINDS.length)],
    featured: rand() < 0.2,
  }))
}

/** Cada celda de la cuadrícula queda cubierta exactamente una vez. */
function assertNoHoles(items, cols, { placements, rows }) {
  assert.equal(placements.length, items.length, 'una posición por obra')
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(0))
  for (const p of placements) {
    assert.ok(p.col >= 1 && p.col + p.w - 1 <= cols, `columna fuera de rango: ${JSON.stringify(p)}`)
    assert.ok(p.row >= 1 && p.row + p.h - 1 <= rows, `fila fuera de rango: ${JSON.stringify(p)}`)
    for (let r = p.row; r < p.row + p.h; r++) {
      for (let c = p.col; c < p.col + p.w; c++) grid[r - 1][c - 1]++
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      assert.equal(grid[r][c], 1, `celda (${r + 1}, ${c + 1}) cubierta ${grid[r][c]} veces`)
    }
  }
}

for (const cols of [4, 2]) {
  test(`sin huecos ni encimados con 1 a 40 obras (${cols} columnas)`, () => {
    const rand = rng(cols * 7919)
    for (let n = 1; n <= 40; n++) {
      for (let trial = 0; trial < 12; trial++) {
        const items = randomItems(n, rand)
        assertNoHoles(items, cols, planGallery(items, cols))
      }
    }
  })

  test(`las destacadas siempre caen en un espacio grande (${cols} columnas)`, () => {
    const rand = rng(cols * 104729)
    for (let n = 1; n <= 40; n++) {
      const items = randomItems(n, rand)
      const { placements } = planGallery(items, cols)
      items.forEach((it, i) => {
        if (it.featured) assert.ok(placements[i].w * placements[i].h >= 4, `destacada ${i} en ${JSON.stringify(placements[i])}`)
      })
    }
  })
}

test('la galería actual (5 obras) llena la cuadrícula y Tarot Bloom va en grande', () => {
  const items = [
    { aspectRatio: 'portrait', featured: true },
    { aspectRatio: 'landscape' },
    { aspectRatio: 'square' },
    { aspectRatio: 'landscape' },
    { aspectRatio: 'landscape' },
  ]
  for (const cols of [4, 2]) {
    const plan = planGallery(items, cols)
    assertNoHoles(items, cols, plan)
    assert.ok(plan.placements[0].w * plan.placements[0].h >= 4)
  }
})

test('sin obras no hay filas', () => {
  assert.deepEqual(planGallery([], 4), { placements: [], rows: 0 })
})
