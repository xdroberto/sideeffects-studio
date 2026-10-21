// @ts-check
/**
 * El diamante del home al tacto: A4 «Pulsar», la variante del laboratorio
 * elegida el 2026-10-21. La onda es una cuerda (ecuación de onda 1D con
 * extremos fijos): cruzarla con el mouse la pulsa en la dirección del
 * movimiento, y un toque o clic la jala hacia ese punto y la suelta. Sola
 * un rato, se pulsa sola. Debajo sigue la respiración lenta del
 * laboratorio: cada 8 s la onda crece un poco y el rojo va hacia carmesí.
 *
 * Todo va en coordenadas locales de la onda (x ∈ [-5, 5], y hacia arriba),
 * las mismas de writeShape('home'). Sin dependencias para probarlo con
 * `node --test` (tests/node/scene-hero.test.mjs).
 */

/**
 * Entrada de cada cuadro. `active`: hay un puntero que seguir (el mouse
 * encima, o un dedo que acaba de tocar); `hover`: es un mouse que pasa,
 * no un dedo; `tap`: hubo toque o clic en este cuadro; `x`, `y`: dónde,
 * en el plano de la onda.
 * @typedef {{ active: boolean, hover: boolean, tap: boolean, x: number, y: number }} HeroInput
 */

/**
 * Lo que la escena necesita para dibujar el home. `disp` es la cuerda
 * (desplazamiento de cada punto de la onda); `apex` escala el alto de los
 * ápices; `line` y `dot` son colores sRGB (0..1, un poco más en el
 * destello). Es el mismo objeto en cada paso, sin basura por cuadro.
 * @typedef {{ t: number, amp: number, apex: number, disp: Float32Array, act: number, line: number[], dot: number[] }} HeroFrame
 */

const N = 100

/** Rojo de siempre: cuerdas #ff2222 y puntos rojos. */
export const BASE_LINE = [1, 0x22 / 255, 0x22 / 255]
export const BASE_DOT = [1, 0, 0]

/** @param {number} cur @param {number} x @param {number} dt @param {number} up @param {number} down */
const follow = (cur, x, dt, up, down) => cur + (x - cur) * (1 - Math.exp(-dt * (x > cur ? up : down)))
/** @param {number} v @param {number} lo @param {number} hi */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
/** @param {number} d @param {number} s */
const gauss = (d, s) => Math.exp(-(d * d) / (2 * s * s))
/** @param {number} x */
const idx = (x) => Math.round(((x + 5) / 10) * (N - 1))

/** @param {() => number} [random] dónde se pulsa sola (inyectable en pruebas) */
export function createHero(random = Math.random) {
  const y = new Float32Array(N)
  const v = new Float32Array(N)
  const st = { t: 0, ph: 0, quiet: 0, nextSelf: 2.5, has: false, py: 0, vy: 0, side: 0 }
  /** @type {HeroFrame} */
  const out = { t: 0, amp: 0.6, apex: 1, disp: y, act: 0, line: [...BASE_LINE], dot: [...BASE_DOT] }

  /** @param {number} dt @param {HeroInput} inp */
  function step(dt, inp) {
    st.t += dt
    st.ph += dt * 0.8
    const br = 0.5 + 0.5 * Math.sin((st.t * Math.PI * 2) / 8 - Math.PI / 2)
    const amp = 0.6 * (1 + 0.3 * (br - 0.5))
    /** @param {number} x */
    const baseY = (x) => Math.sin(x + st.ph) * amp

    // Velocidad vertical del puntero sobre el plano de la onda.
    const active = inp.active || inp.tap
    if (active) {
      if (st.has) st.vy = follow(st.vy, (inp.y - st.py) / Math.max(dt, 1e-3), dt, 20, 10)
      st.py = inp.y
      st.has = true
    } else {
      st.has = false
    }
    st.quiet = active ? 0 : st.quiet + dt

    if (inp.tap) {
      // Un toque jala la cuerda hacia el dedo y la suelta.
      const i0 = idx(inp.x)
      if (i0 > 0 && i0 < N - 1) {
        const pull = clamp(inp.y - (baseY(inp.x) + y[i0]), -1.6, 1.6)
        for (let j = 1; j < N - 1; j++) {
          y[j] += pull * 0.8 * gauss(j - i0, 4.5)
          v[j] = 0
        }
      }
    } else if (inp.hover && st.has) {
      // Cruzar la onda con el mouse la pulsa en la dirección del movimiento.
      const i0 = idx(inp.x)
      if (i0 > 0 && i0 < N - 1) {
        const side = Math.sign(inp.y - (baseY(inp.x) + y[i0]))
        if (st.side && side && side !== st.side) {
          const imp = clamp(st.vy, -9, 9) * 0.45
          for (let j = 1; j < N - 1; j++) v[j] += imp * gauss(j - i0, 3)
        }
        st.side = side
      }
    } else {
      st.side = 0
    }
    // Sola un rato, se pulsa sola: la primera vez a los 7.5 s, luego cada 6 s.
    if (st.quiet > 5) {
      st.nextSelf -= dt
      if (st.nextSelf <= 0) {
        st.nextSelf = 6
        const i0 = 20 + Math.floor(random() * 60)
        for (let j = 1; j < N - 1; j++) v[j] += 2.2 * gauss(j - i0, 3)
      }
    }
    const c2 = 30, damp = 1.4, kk = 2, dx = 10 / (N - 1), sub = 4
    const h = Math.min(dt, 1 / 30) / sub
    for (let s = 0; s < sub; s++) {
      for (let i = 1; i < N - 1; i++) {
        v[i] += ((c2 * (y[i - 1] - 2 * y[i] + y[i + 1])) / (dx * dx) - damp * v[i] - kk * y[i]) * h
      }
      for (let i = 1; i < N - 1; i++) y[i] += v[i] * h
    }
    let m = 0
    for (let i = 0; i < N; i++) m = Math.max(m, Math.abs(y[i]))
    const act = Math.min(1, m * 1.4)

    // El rojo respira hacia carmesí y regresa; al pulsar se enciende hacia rosa.
    const lum = 0.74 + 0.26 * br + 0.24 * act
    const fl = 0.3 * act
    const g = 0.13 - 0.05 * br
    const b = 0.13 + 0.09 * br
    out.line[0] = lum
    out.line[1] = (g + (0.62 - g) * fl) * lum
    out.line[2] = (b + (0.62 - b) * fl) * lum
    out.dot[1] = out.dot[2] = 0.08 + 0.4 * act
    out.t = st.ph
    out.amp = amp
    out.apex = 1 + 0.025 * (br - 0.5)
    out.act = act
    return out
  }

  return { out, step }
}
