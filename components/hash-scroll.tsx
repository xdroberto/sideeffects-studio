'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Soluciona la quirk de Next.js App Router: cuando navegas a un href
 * con hash desde OTRA página (e.g. desde `/sf01` haces click en
 * `<Link href="/#gallery">`), Next hace soft-navigation pero el browser
 * no dispara el scroll automático al anchor.
 *
 * Este componente escucha cambios de pathname y, si hay hash en la URL,
 * scrollea al elemento correspondiente. El `scroll-behavior: smooth`
 * global en `html` se encarga de la animación.
 */
export function HashScroll() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash) return
    const id = hash.slice(1)
    const el = document.getElementById(id)
    if (!el) return
    // Pequeño delay para asegurar que el DOM (incluido el contenido
    // dinámico vía ClientOnly) ya esté pintado.
    const timeout = setTimeout(() => {
      el.scrollIntoView({ block: 'start' })
    }, 80)
    return () => clearTimeout(timeout)
  }, [pathname])

  // También responde a navegaciones HASH-only (mismo pathname pero
  // hash distinto), e.g. cuando ya estás en `/` y haces click a
  // `/#about`. Escuchamos `hashchange` además de pathname.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onHashChange = () => {
      const hash = window.location.hash
      if (!hash) return
      const id = hash.slice(1)
      const el = document.getElementById(id)
      el?.scrollIntoView({ block: 'start' })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return null
}
