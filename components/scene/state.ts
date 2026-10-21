import type { ShapeKind } from './shapes.mjs'

/**
 * Estado compartido de la escena persistente. Es un objeto mutable (no
 * estado de React) porque se lee en cada cuadro dentro de useFrame y no
 * debe provocar renders. SceneLayer escribe la ruta y la preferencia de
 * movimiento; la escena escribe lo que necesitan sus otras partes.
 */
export const sceneState = {
  /** Forma de la ruta actual. */
  kind: 'home' as ShapeKind,
  /** prefers-reduced-motion: morph instantáneo, sin tinta, cuadros a demanda. */
  reduce: false,
  /** Pide un cuadro (frameloop "demand"); lo registra el Canvas al montarse. */
  invalidate: null as null | (() => void),
  /** Posiciones de mundo de los 100 puntos de la onda (semilla de la tinta). */
  dots: new Float32Array(300),
  /** B1: avance del scroll del home hacia la galería (0..1), suavizado. */
  progress: 0,
  /** Hay un morph en curso. */
  morphing: false,
  /** La portada de la página sigue en pantalla. */
  coverVisible: true,
}
