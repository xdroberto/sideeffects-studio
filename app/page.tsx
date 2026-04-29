'use client'

import nextDynamic from 'next/dynamic'
import { Suspense, useRef } from 'react'
import { Nav } from '@/components/nav'
import { Gallery } from '@/components/gallery'
import { Footer } from '@/components/footer'
import { ClientOnly } from '@/components/client-only'
import { ReflowSubtitle } from '@/components/reflow-subtitle'
import { Michroma as Microgramma, Space_Mono } from 'next/font/google'

const DiamondScene = nextDynamic(
  () => import('@/components/diamond-scene').then(mod => mod.DiamondScene),
  { ssr: false, loading: () => <div className="fixed inset-0 z-0 bg-black" /> }
)

const AsciiBackdrop = nextDynamic(
  () => import('@/components/ascii-backdrop').then(mod => mod.AsciiBackdrop),
  { ssr: false, loading: () => null },
)

const microgramma = Microgramma({ subsets: ['latin'], weight: ['400'] })
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-space-mono',
})

export default function Home() {
  const galleryRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)

  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement | null>) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* DiamondScene queda como fixed full-viewport — sigue siendo el
          fondo visual continuo del sitio. */}
      <Suspense fallback={<div className="fixed inset-0 z-0 bg-black" />}>
        <DiamondScene />
      </Suspense>

      {/* AsciiBackdrop SOLO en la zona del hero. mix-blend-screen para
          que sume luz al diamond detrás en lugar de taparlo. Pointer
          events: none → no captura clicks. */}
      <section className="relative min-h-[calc(100vh)] overflow-hidden">
        <ClientOnly>
          <div
            className="absolute inset-0 z-[1]"
            style={{ mixBlendMode: 'screen' }}
            aria-hidden
          >
            <AsciiBackdrop
              cols={92}
              color="220, 38, 38"
              baseAlpha={0.04}
              peakAlpha={0.65}
              attractRadius={280}
            />
          </div>
        </ClientOnly>

        <div className="relative z-10">
          <ClientOnly>
            <Nav
              onGalleryClick={() => scrollToSection(galleryRef)}
              onAboutClick={() => scrollToSection(aboutRef)}
            />
          </ClientOnly>
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
            <h1
              className={`text-4xl sm:text-5xl md:text-6xl font-light tracking-wider mt-auto text-center chromatic-title ${microgramma.className}`}
            >
              side_effects.art
            </h1>
            <div className={`mt-8 mix-blend-difference opacity-70 subtitle-glow-only`}>
              <ClientOnly>
                <ReflowSubtitle
                  text="elevating visual experiences"
                  fontSize={20}
                  color="white"
                  minWidth={140}
                  maxWidth={520}
                  className={spaceMono.className}
                />
              </ClientOnly>
            </div>
            <div className="mt-auto p-8 text-gray-400 text-sm text-center">
              Generative Art • Interactive Design • Visual Symphony
            </div>
          </div>
        </div>
      </section>

      <div id="gallery" ref={galleryRef}>
        <ClientOnly>
          <Gallery />
        </ClientOnly>
      </div>
      <div ref={aboutRef}>
        <ClientOnly>
          <Footer />
        </ClientOnly>
      </div>
    </main>
  )
}
export const dynamic = "force-dynamic"
