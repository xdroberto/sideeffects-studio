// @ts-check
/**
 * Lógica del Harp sin DOM ni audio, para probarla con `node --test`
 * (tests/node/playground-harp.test.mjs).
 *
 * - La compuerta de notas: para que un rasgueo no sea caótico, suena como
 *   arpegio. Cada nota espera su turno en una rejilla; si el turno queda muy
 *   lejos, o la misma nota acaba de sonar, no suena.
 * - La clavija del huevo de pascua: cada cuarto de vuelta es una muesca; con
 *   cuatro, la vuelta completa afina el instrumento y otra vuelta lo regresa.
 */

const QUARTER = Math.PI / 2

/**
 * @param {{ grid?: number, maxLag?: number, repeat?: number }} [opts]
 *   grid: s mínimos entre notas; maxLag: s máximos de espera; repeat: s antes
 *   de que la misma nota vuelva a sonar.
 */
export function createNoteGate({ grid = 0.08, maxLag = 0.6, repeat = 0.25 } = {}) {
  let last = -Infinity
  /** @type {Map<number, number>} */
  const lastByKey = new Map()
  return {
    /**
     * Pide una nota. Devuelve la hora a la que debe sonar, o `null` si no suena.
     * @param {number} key la nota (su frecuencia)
     * @param {number} now hora actual, en s
     * @param {number} [delay] s después de `now` en que el puntero cruzó la cuerda
     * @returns {number | null}
     */
    request(key, now, delay = 0) {
      if (now - (lastByKey.get(key) ?? -Infinity) < repeat) return null
      const at = Math.max(now + 0.02 + delay, last + grid)
      if (at - now > maxLag) return null
      last = at
      lastByKey.set(key, at)
      return at
    },
  }
}

/**
 * @typedef {{ type: 'notch', step: number, dir: number } | { type: 'complete', tuned: boolean, dir: number }} PegEvent
 *   notch: una muesca; `step` es cuántas lleva la vuelta en curso (con signo).
 *   complete: la vuelta completa; `tuned` es el estado nuevo.
 */

/**
 * La clavija. `ang` es su giro en radianes: sigue al arrastre y se asienta en
 * la muesca al soltar.
 * @param {{ hysteresis?: number }} [opts] fracción de un cuarto de vuelta que
 *   hay que pasar para contar la muesca siguiente: cerca de la frontera entre
 *   dos muescas, sacudir no cuenta ida y vuelta.
 */
export function createPeg({ hysteresis = 0.65 } = {}) {
  let ang = 0
  let count = 0
  let base = 0
  let tuned = false

  /**
   * @param {number} dir
   * @returns {PegEvent}
   */
  function notch(dir) {
    count += dir
    const step = count - base
    if (Math.abs(step) >= 4) {
      base = count
      tuned = !tuned
      return { type: 'complete', tuned, dir }
    }
    return { type: 'notch', step, dir }
  }

  return {
    /**
     * Girar arrastrando.
     * @param {number} dAngle radianes
     * @returns {PegEvent[]}
     */
    drag(dAngle) {
      /** @type {PegEvent[]} */
      const events = []
      ang += dAngle
      while (ang > (count + hysteresis) * QUARTER) events.push(notch(1))
      while (ang < (count - hysteresis) * QUARTER) events.push(notch(-1))
      return events
    },
    /**
     * Un toque es un cuarto de vuelta hacia adelante.
     * @returns {PegEvent[]}
     */
    tap() {
      const events = [notch(1)]
      ang = count * QUARTER
      return events
    },
    /** Al soltar un giro, la clavija se asienta en su muesca. */
    release() {
      ang = count * QUARTER
    },
    /**
     * Una vuelta a medias regresa, muesca por muesca, sin cambiar la afinación.
     * @returns {PegEvent[]}
     */
    unwind() {
      /** @type {PegEvent[]} */
      const events = []
      while (count !== base) {
        const dir = count > base ? -1 : 1
        count += dir
        events.push({ type: 'notch', step: count - base, dir })
      }
      ang = count * QUARTER
      return events
    },
    state() {
      return { ang, count, base, tuned }
    },
  }
}

/**
 * La campana de cada muesca: Sa, Re, Ga… hacia arriba. De regreso al punto de
 * partida (paso 0) solo suena el clic: no hay grado −1 que pedir.
 * @param {number} step
 * @returns {number | null}
 */
export function chimeDegree(step) {
  return step === 0 ? null : Math.abs(step) - 1
}
