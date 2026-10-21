// @ts-check
/**
 * Planificador de la cuadrícula de la galería.
 *
 * Reparte las obras en "bandas" que llenan la cuadrícula completa —una
 * fila (4 celdas) o dos (8 celdas) en escritorio; una o dos filas de 2
 * celdas en celular—, así nunca quedan huecos, sin importar cuántas obras
 * haya ni su orientación. Una programación dinámica elige la secuencia de
 * plantillas que menos recorta cada obra (object-cover) y que pone las
 * destacadas en un espacio grande. El orden de las obras se respeta: se
 * asignan en secuencia a los espacios de cada banda en orden de lectura.
 *
 * Sin dependencias para poder probarlo con `node --test`
 * (tests/node/gallery-layout.test.mjs).
 */

/** @typedef {{ aspectRatio?: string, featured?: boolean }} PlanItem */
/** @typedef {{ col: number, row: number, w: number, h: number }} Placement */
/** @typedef {{ id: string, h: number, slots: number[][] }} Template */

/** Proporción típica de cada categoría que registra el admin. */
const ASPECT = { portrait: 0.75, square: 1, landscape: 16 / 9 }

/**
 * Celda de la cuadrícula del sitio: ancho/alto (u) y gap/alto (g).
 * Escritorio: ~326×180 px con gap de 16 px. Celular: ~175×180 px con gap de 8 px.
 */
const GEOM = { 4: { u: 1.81, g: 0.089 }, 2: { u: 0.97, g: 0.044 } }

/**
 * Plantillas por número de columnas. Cada espacio es [x, y, w, h] dentro
 * de la banda, ya en orden de lectura (por fila y luego por columna).
 * @type {Record<number, Template[]>}
 */
const TEMPLATES = {
  4: [
    { id: 'big+4', h: 2, slots: [[0, 0, 2, 2], [2, 0, 1, 1], [3, 0, 1, 1], [2, 1, 1, 1], [3, 1, 1, 1]] },
    { id: '4+big', h: 2, slots: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 2, 2], [0, 1, 1, 1], [1, 1, 1, 1]] },
    { id: 'big+tall+tall', h: 2, slots: [[0, 0, 2, 2], [2, 0, 1, 2], [3, 0, 1, 2]] },
    { id: 'tall+tall+big', h: 2, slots: [[0, 0, 1, 2], [1, 0, 1, 2], [2, 0, 2, 2]] },
    { id: 'tall+big+tall', h: 2, slots: [[0, 0, 1, 2], [1, 0, 2, 2], [3, 0, 1, 2]] },
    { id: 'big+wide+2', h: 2, slots: [[0, 0, 2, 2], [2, 0, 2, 1], [2, 1, 1, 1], [3, 1, 1, 1]] },
    { id: 'wide+big+2', h: 2, slots: [[0, 0, 2, 1], [2, 0, 2, 2], [0, 1, 1, 1], [1, 1, 1, 1]] },
    { id: 'big+big', h: 2, slots: [[0, 0, 2, 2], [2, 0, 2, 2]] },
    { id: '1+1+1+1', h: 1, slots: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1], [3, 0, 1, 1]] },
    { id: 'wide+1+1', h: 1, slots: [[0, 0, 2, 1], [2, 0, 1, 1], [3, 0, 1, 1]] },
    { id: '1+1+wide', h: 1, slots: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 2, 1]] },
    { id: 'wide+wide', h: 1, slots: [[0, 0, 2, 1], [2, 0, 2, 1]] },
    { id: 'full', h: 2, slots: [[0, 0, 4, 2]] },
  ],
  2: [
    { id: 'big', h: 2, slots: [[0, 0, 2, 2]] },
    { id: 'wide', h: 1, slots: [[0, 0, 2, 1]] },
    { id: '1+1', h: 1, slots: [[0, 0, 1, 1], [1, 0, 1, 1]] },
    { id: 'tall+2', h: 2, slots: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]] },
    { id: '2+tall', h: 2, slots: [[0, 0, 1, 1], [1, 0, 1, 2], [0, 1, 1, 1]] },
    { id: 'tall+tall', h: 2, slots: [[0, 0, 1, 2], [1, 0, 1, 2]] },
  ],
}

const FEATURED_OUT_OF_BIG = 50 // prácticamente prohibido
const PLAIN_IN_BIG = 0.35 // se permite, pero se prefieren los grandes para destacadas
const REPEAT = 0.25 // misma plantilla dos bandas seguidas se ve mecánico
const FULL = 0.5 // una sola obra a todo lo ancho, solo si no queda de otra

/** @param {PlanItem} item */
function aspectOf(item) {
  const k = /** @type {keyof typeof ASPECT} */ (item.aspectRatio)
  return ASPECT[k] ?? ASPECT.landscape
}

/**
 * Costo de poner una obra en un espacio.
 * @param {PlanItem} item
 * @param {number[]} slot
 * @param {{ u: number, g: number }} geo
 */
function slotCost(item, slot, geo) {
  const [, , w, h] = slot
  const slotAspect = (w * geo.u + (w - 1) * geo.g) / (h + (h - 1) * geo.g)
  let c = Math.abs(Math.log(aspectOf(item)) - Math.log(slotAspect))
  const big = w * h >= 4
  if (item.featured && !big) c += FEATURED_OUT_OF_BIG
  if (!item.featured && big) c += PLAIN_IN_BIG
  return c
}

/**
 * Acomoda las obras sin huecos.
 * @param {PlanItem[]} items
 * @param {2 | 4} cols
 * @returns {{ placements: Placement[], rows: number }}
 */
export function planGallery(items, cols) {
  const templates = TEMPLATES[cols]
  const geo = GEOM[cols]
  if (!templates || !geo) throw new Error(`planGallery: columnas no soportadas (${cols})`)
  const n = items.length
  if (n === 0) return { placements: [], rows: 0 }

  // best(i, prev) = costo mínimo de acomodar items[i..] si la banda anterior usó `prev`.
  /** @type {Map<string, { cost: number, t: number }>} */
  const memo = new Map()
  /** @param {number} i @param {number} prev @returns {number} */
  function best(i, prev) {
    if (i === n) return 0
    const key = `${i}|${prev}`
    const hit = memo.get(key)
    if (hit) return hit.cost
    let bestCost = Infinity
    let bestT = -1
    for (let t = 0; t < templates.length; t++) {
      const tpl = templates[t]
      const k = tpl.slots.length
      if (i + k > n) continue
      let c = t === prev ? REPEAT : 0
      if (tpl.id === 'full') c += FULL
      for (let s = 0; s < k; s++) c += slotCost(items[i + s], tpl.slots[s], geo)
      c += best(i + k, t)
      if (c < bestCost) { bestCost = c; bestT = t }
    }
    memo.set(key, { cost: bestCost, t: bestT })
    return bestCost
  }
  best(0, -1)

  /** @type {Placement[]} */
  const placements = []
  let i = 0, prev = -1, row = 1
  while (i < n) {
    const choice = memo.get(`${i}|${prev}`)
    if (!choice || choice.t < 0) throw new Error('planGallery: sin solución (no debería pasar)')
    const tpl = templates[choice.t]
    for (const [x, y, w, h] of tpl.slots) placements.push({ col: x + 1, row: row + y, w, h })
    row += tpl.h
    i += tpl.slots.length
    prev = choice.t
  }
  return { placements, rows: row - 1 }
}
