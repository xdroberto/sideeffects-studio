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

export function Nav({ className }: NavProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = useCallback(() => setIsOpen(prev => !prev), [])
  const closeMenu = useCallback(() => setIsOpen(false), [])

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
  // - Active route → `text-signal` (red-500) sin hover (ya está en el destino)
  // - transition unificada: colors, 200ms, ease-out
  // - focus-visible: el outline global rojo en globals.css se encarga del keyboard ring
  const linkClass = (active: boolean) =>
    `transition-colors duration-200 ease-out ${
      active ? 'text-signal' : 'text-ink-muted hover:text-signal focus-visible:text-signal'
    }`

  // Gallery y About viven en la landing (`/`). Los anchors funcionan
  // tanto desde la landing (scroll directo) como desde otras páginas
  // (navegación + scroll). El comportamiento smooth lo gestiona el CSS
  // global `scroll-behavior: smooth` en el `html`.
  const navItems = (
    <>
      <Link href="/" className={linkClass(pathname === '/')} onClick={closeMenu}>
        Home
      </Link>
      <Link href="/#gallery" className={linkClass(false)} onClick={closeMenu}>
        Gallery
      </Link>
      <Link href="/#about" className={linkClass(false)} onClick={closeMenu}>
        About
      </Link>
      <Link href="/sf01" className={linkClass(pathname === '/sf01')} onClick={closeMenu}>
        SF01
      </Link>
      <Link href="/chord-lab" className={linkClass(pathname === '/chord-lab')} onClick={closeMenu}>
        Chord Lab
      </Link>
      <Link href="/playground" className={linkClass(pathname === '/playground')} onClick={closeMenu}>
        Playground
      </Link>
    </>
  )

  return (
    <>
      <nav className={cn("flex items-center justify-between p-4 w-full", className)}>
        <Link
          href="/"
          className="text-signal hover:text-signal-hover transition-colors duration-200 ease-out z-50"
          aria-label="side_effects.art — home"
        >
          <CustomLogo />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex gap-8 text-lg">
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

      {/* Mobile overlay — tap-anywhere-to-close, fade in/out coherente */}
      <div
        id="mobile-nav-drawer"
        className={cn(
          "fixed inset-0 z-40 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center gap-8 text-2xl transition-opacity duration-300 ease-out md:hidden",
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
