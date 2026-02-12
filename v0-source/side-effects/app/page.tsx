'use client'

import { useRef } from 'react'
import { Nav } from './components/nav'
import { DiamondLogo } from './components/diamond-logo'
import { Gallery } from './components/gallery'
import { Footer } from './components/footer'
import { Michroma as Microgramma, Space_Mono } from 'next/font/google'

const microgramma = Microgramma({ subsets: ['latin'], weight: ['400'] })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400'] })

export default function Home() {
  const galleryRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)

  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <DiamondLogo />
      <div className="relative z-10">
        <Nav 
          onGalleryClick={() => scrollToSection(galleryRef)}
          onAboutClick={() => scrollToSection(aboutRef)}
        />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-light tracking-wider mt-auto text-center text-white ${microgramma.className}`}>
            side_effects.art
          </h1>
          <p className={`mt-4 text-lg sm:text-xl md:text-2xl text-white ${spaceMono.className} mix-blend-difference opacity-70`}>
            elevating visual experiences
          </p>
          <div className="mt-auto p-8 text-gray-400 text-sm text-center">
            Generative Art • Interactive Design • Visual Symphony
          </div>
        </div>
      </div>
      <div id="gallery" ref={galleryRef}>
        <Gallery />
      </div>
      <div ref={aboutRef}>
        <Footer />
      </div>
    </main>
  )
}

