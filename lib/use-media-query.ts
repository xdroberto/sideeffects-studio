'use client'

import { useEffect, useState } from 'react'

/**
 * Hook que devuelve si una media query coincide. SSR-safe.
 *
 * @example
 *   const isDesktop = useMediaQuery('(min-width: 768px)')
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    // addEventListener moderno; algunos navegadores antiguos sólo tienen addListener.
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else mq.addListener(handler)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler)
      else mq.removeListener(handler)
    }
  }, [query])

  return matches
}
