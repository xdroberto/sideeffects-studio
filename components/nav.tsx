'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CustomLogo } from './CustomLogo'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

interface NavProps {
  className?: string
}

// Onda de la página actual: la onda del diamante del hero, con longitud de
// onda fija de 12px (no se estira con el ancho del link). El SVG mide
// 264px y el contenedor lo recorta al ancho del texto; `.nav-wave` lo
// desplaza una longitud de onda por ciclo (globals.css).
const WAVE_D = (() => {
  let d = 'M0 3 Q 3 0 6 3'
  for (let x = 12; x <= 264; x += 6) d += ` T ${x} 3`
  return d
})()

function ActiveWave() {
  return (
    <span aria-hidden className="pointer-events-none absolute left-0 right-0 -bottom-[7px] h-[6px] overflow-hidden text-signal">
      <svg width="264" height="6" viewBox="0 0 264 6" className="nav-wave block">
        <path d={WAVE_D} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function Nav({ className }: NavProps) {
  const pathname = usePathname()
  // Con `trailingSlash: true` el pathname llega como '/sf01/'; sin
  // normalizar, ninguna página fuera del home se marcaba como activa.
  const path = pathname && pathname !== '/' ? pathname.replace(/\/+$/, '') : '/'
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = useCallback(() => setIsOpen(prev => !prev), [])
  const closeMenu = useCallback(() => setIsOpen(false), [])

  // La barra es fija; en cuanto la página baja, toma un fondo para leerse
  // sobre la escena, la tinta y la galería.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close on route change
  useEffect(() => { setIsOpen(false) }, [pathname])

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close drawer on Escape for keyboard users (WCAG 2.1.2 No Keyboard Trap).
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  // Baseline hover/focus pattern — coherente con design tokens:
  // - Color de reposo `text-ink-muted` (≈ ink/muted), hover → `text-signal` (rojo del proyecto)
  // - Active route → texto blanco + la onda roja del diamante debajo
  // - transition unificada: colors, 200ms, ease-out
  // - focus-visible: el outline global rojo en globals.css se encarga del keyboard ring
  const linkClass = (active: boolean) =>
    `relative transition-colors duration-200 ease-out ${
      active ? 'text-white' : 'text-ink-muted hover:text-signal focus-visible:text-signal'
    }`

  // Gallery y About viven en la landing (`/`). Los anchors funcionan
  // tanto desde la landing (scroll directo) como desde otras páginas
  // (navegación + scroll). El comportamiento smooth lo gestiona el CSS
  // global `scroll-behavior: smooth` en el `html`.
  const items = [
    { href: '/', label: 'Home', active: path === '/' },
    { href: '/#gallery', label: 'Gallery', active: false },
    { href: '/#about', label: 'About', active: false },
    { href: '/sf01', label: 'SF01', active: path === '/sf01' },
    { href: '/chord-lab', label: 'Chord Lab', active: path === '/chord-lab' },
    { href: '/playground', label: 'Playground', active: path === '/playground' },
  ]
  const navItems = (
    <>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={linkClass(it.active)}
          onClick={closeMenu}
          aria-current={it.active ? 'page' : undefined}
        >
          {it.label}
          {it.active && <ActiveWave />}
        </Link>
      ))}
    </>
  )

  return (
    <>
      {/* Reserva el alto de la barra en el flujo: ahora que es fija,
          ninguna página se mueve hacia arriba. */}
      <div aria-hidden className="h-[72px]" />
      {/* Barra fija: antes vivía en el flujo y se iba con el scroll. El
          degradado aparece al bajar; sin backdrop-filter porque no aplica
          en todos los Firefox. */}
      <div className="fixed inset-x-0 top-0 z-50">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-[112px] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.9)_60%,rgba(0,0,0,0)_100%)] transition-opacity duration-300 ease-out",
            scrolled ? "opacity-100" : "opacity-0"
          )}
        />
      <nav className={cn("relative flex items-center justify-between p-4 w-full", className)}>
        <Link
          href="/"
          className="text-signal hover:text-signal-hover transition-colors duration-200 ease-out z-50"
          aria-label="side_effects.art — home"
        >
          <CustomLogo />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex gap-8 text-lg [font-stretch:108%]">
          {navItems}
        </div>

        {/* Hamburger button — aria-expanded comunica el estado al screen
            reader; aria-controls referencia el drawer overlay. */}
        <button
          onClick={toggleMenu}
          className="md:hidden relative z-50 text-ink-muted hover:text-signal transition-colors duration-200 ease-out p-1"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-nav-drawer"
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>
      </div>

      {/* Mobile overlay — tap-anywhere-to-close, fade in/out coherente */}
      <div
        id="mobile-nav-drawer"
        className={cn(
          "fixed inset-0 z-40 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center gap-8 text-2xl [font-stretch:108%] transition-opacity duration-300 ease-out md:hidden",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!isOpen}
        onClick={closeMenu}
      >
        {navItems}
      </div>
    </>
  )
}
