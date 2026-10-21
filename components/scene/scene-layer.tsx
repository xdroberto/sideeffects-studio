'use client'

import nextDynamic from 'next/dynamic'
import { Component, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { shapeForPath } from './shapes.mjs'
import { sceneState } from './state'

const SceneCanvas = nextDynamic(
  () => import('./scene-canvas').then((mod) => mod.SceneCanvas),
  { ssr: false, loading: () => null },
)

/**
 * Si WebGL falla (equipo sin soporte, contexto perdido, una extensión que
 * rompe el canvas), solo se apaga la escena: queda el fondo negro y el
 * resto del sitio sigue funcionando. Como la escena vive en el layout, sin
 * esto un fallo tumbaría todas las páginas en la pantalla "unhandled · 500".
 */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('[scene] la escena 3D se desactivó:', error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * Capa fija detrás de todas las páginas con la escena persistente
 * (components/scene/scene-canvas.tsx). Le dice a la escena en qué ruta
 * estamos y si el sistema pide reducir el movimiento.
 */
export function SceneLayer() {
  const pathname = usePathname()
  const kind = shapeForPath(pathname)
  const [reduce, setReduce] = useState(false)

  // La forma inicial se fija antes de montar el canvas: el sitio abre sin morph.
  if (!sceneState.invalidate) sceneState.kind = kind

  useEffect(() => {
    sceneState.kind = kind
    sceneState.invalidate?.()
  }, [kind])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      sceneState.reduce = mq.matches
      setReduce(mq.matches)
      sceneState.invalidate?.()
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-black">
      <SceneBoundary>
        <SceneCanvas reduce={reduce} />
      </SceneBoundary>
      {/* Resplandor rojo del hero original, solo en el home. */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${kind === 'home' ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'radial-gradient(circle at center, rgba(255,0,0,0.05) 0%, transparent 70%)' }}
      />
    </div>
  )
}
