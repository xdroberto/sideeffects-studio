/**
 * Las fuentes del sitio para dibujar en canvas. `next/font` registra las
 * familias con un nombre propio (`__Michroma_…`) que solo se expone en las
 * variables CSS del <html> (app/layout.tsx); un `ctx.font` con «Michroma» a
 * secas caería a la fuente de respaldo.
 */

export type FontVar = '--font-display' | '--font-mono' | '--font-sans'

/** La pila de familias de una variable de fuente, lista para `ctx.font`. */
export function cssFamily(variable: FontVar, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  return v ? `${v}, ${fallback}` : fallback
}

/** Espera a que la fuente esté lista para canvas; nunca rechaza. */
export function loadFont(spec: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  return document.fonts.load(spec).then(
    () => undefined,
    () => undefined,
  )
}
