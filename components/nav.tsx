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

  const linkClass = (active: boolean) =>
    `transition-colors ${active ? 'text-red-500' : 'text-gray-400 hover:text-white'}`

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
        <Link href="/" className="text-red-500 hover:text-red-600 transition-colors z-50">
          <CustomLogo />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex gap-8 text-lg">
          {navItems}
        </div>

        {/* Hamburger button */}
        <button
          onClick={toggleMenu}
          className="md:hidden relative z-50 text-gray-400 hover:text-white transition-colors p-1"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center gap-8 text-2xl transition-all duration-300 md:hidden",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
      >
        {navItems}
      </div>
    </>
  )
}
