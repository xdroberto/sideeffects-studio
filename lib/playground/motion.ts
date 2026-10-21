import { useSyncExternalStore } from 'react'

/**
 * «Reducir movimiento» en Playground: las piezas corren si el sistema no lo
 * pide, o si el visitante pulsó «Play the pieces». La decisión del visitante
 * dura mientras la pestaña siga abierta (también al navegar por el sitio).
 */

type Listener = (running: boolean) => void

let played = false
let query: MediaQueryList | null = null
const listeners = new Set<Listener>()

function notify() {
  const running = isRunning()
  for (const fn of listeners) fn(running)
}

function media(): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia) return null
  if (!query) {
    query = window.matchMedia('(prefers-reduced-motion: reduce)')
    query.addEventListener('change', notify)
  }
  return query
}

/** El sistema pide reducir movimiento. */
export function prefersReduced(): boolean {
  return media()?.matches ?? false
}

/** Las piezas se mueven. */
export function isRunning(): boolean {
  return played || !prefersReduced()
}

/** «Play the pieces»: el visitante quiere movimiento aunque el sistema lo reduzca. */
export function play(): void {
  if (played) return
  played = true
  notify()
}

/** Avisa cada vez que cambia `isRunning()`; devuelve cómo dejar de escuchar. */
export function subscribe(fn: Listener): () => void {
  media()
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

const onChange = (fn: () => void) => subscribe(() => fn())

/**
 * Para la interfaz: `true` mientras las piezas se mueven. En el HTML estático
 * se asume movimiento; al hidratar llega la preferencia real.
 */
export function useRunning(): boolean {
  return useSyncExternalStore(onChange, isRunning, () => true)
}
