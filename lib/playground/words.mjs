// @ts-check
/**
 * El reloj de las palabras de Ink, sin DOM para probarlo con `node --test`
 * (tests/node/playground-words.test.mjs).
 *
 * La palabra va cambiando sola y recita el lema del estudio; cada cambio se
 * reescribe con un barrido de izquierda a derecha. La palabra que escribe el
 * visitante se queda un rato y luego vuelve el lema.
 */

export const MOTTO = ['playground', 'generative', 'art', 'interactive', 'design', 'visual', 'symphony', 'side effects']

/** Largo máximo de la palabra del visitante. */
export const MAX_WORD = 24

/**
 * @typedef {{ cur: string, next: string, sweep: number, changed: boolean }} WordState
 *   cur: la palabra que se ve; next: la que se está escribiendo; sweep: avance
 *   del barrido (0..1) o −1 si no hay barrido; changed: hay que redibujar la
 *   máscara de la palabra.
 */

/**
 * @param {{ words: string[], hold?: number, sweep?: number, pinned?: number }} opts
 *   hold: s que se queda cada palabra del lema; sweep: s del barrido;
 *   pinned: s que se queda la palabra del visitante.
 */
export function createWordCycle({ words, hold = 6.5, sweep = 1.6, pinned = 25 }) {
  let idx = 0
  let cur = words[0]
  let next = ''
  let progress = -1
  let holdT = hold
  let pinnedT = 0

  /** @param {string} word */
  function startSweep(word) {
    // Un barrido nuevo arranca desde lo que ya se ve.
    if (progress >= 0) cur = next
    next = word
    progress = 0
  }

  function advance() {
    idx = (idx + 1) % words.length
    startSweep(words[idx])
  }

  /** @param {boolean} changed @returns {WordState} */
  const state = (changed) => ({ cur, next, sweep: progress, changed })

  /**
   * La palabra del visitante se queda `pinned` segundos; vacía, el lema
   * vuelve en 1.5 s o menos.
   * @param {string} word
   */
  function pin(word) {
    const text = String(word || '').trim().slice(0, MAX_WORD)
    if (!text) {
      pinnedT = 0
      holdT = Math.min(holdT, 1.5)
      return
    }
    pinnedT = pinned
    startSweep(text)
  }

  return {
    /**
     * Avanza el reloj `dt` segundos.
     * @param {number} dt
     * @returns {WordState}
     */
    step(dt) {
      if (progress >= 0) {
        progress = Math.min(1, progress + dt / sweep)
        if (progress >= 1) {
          cur = next
          progress = -1
          holdT = hold
        }
        return state(true)
      }
      if (pinnedT > 0) {
        pinnedT -= dt
        if (pinnedT > 0) return state(false)
        pinnedT = 0
        advance()
        return state(true)
      }
      holdT -= dt
      if (holdT > 0) return state(false)
      advance()
      return state(true)
    },
    pin,
    /**
     * Lo mismo que `pin`, ya escrito: en reposo («reducir movimiento») no hay
     * reloj que haga el barrido. Una palabra vacía regresa de golpe al lema.
     * @param {string} word
     * @returns {WordState}
     */
    pinNow(word) {
      pin(word)
      if (!String(word || '').trim()) advance()
      if (progress >= 0) {
        cur = next
        progress = -1
        holdT = hold
      }
      return state(true)
    },
  }
}
