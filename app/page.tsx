'use client'

import nextDynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Nav } from '@/components/nav'
import { Gallery } from '@/components/gallery'
import { Footer } from '@/components/footer'
import { ClientOnly } from '@/components/client-only'
import { HashScroll } from '@/components/hash-scroll'
import { ScrambleText } from '@/components/scramble-text'
import { Michroma as Microgramma, Space_Mono } from 'next/font/google'

const DiamondScene = nextDynamic(
  () => import('@/components/diamond-scene').then(mod => mod.DiamondScene),
  {
    ssr: false,
    // Loading skeleton: black background + radial glow tenue donde irá el
    // diamante, así el hero no parpadea negro→escena 3D. El gradient
    // imita el `radial-gradient` overlay que la propia DiamondScene
    // monta encima del canvas (rgba(255,0,0,0.05) center → transparent).
    loading: () => (
      <div
        className="fixed inset-0 z-0 bg-black"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at center, rgba(255,0,0,0.04) 0%, transparent 70%)',
        }}
      />
    ),
  }
)

const microgramma = Microgramma({ subsets: ['latin'], weight: ['400'] })
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-space-mono',
})

export default function Home() {
  return (
    <main id="main-content" className="relative min-h-screen bg-black text-white overflow-hidden">
      <Suspense fallback={<div className="fixed inset-0 z-0 bg-black" />}>
        <DiamondScene />
      </Suspense>
      <HashScroll />
      <div className="relative z-10">
        <ClientOnly>
          <Nav />
        </ClientOnly>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-4">
          <h1 className={`text-[clamp(1.75rem,9vw,3.75rem)] sm:text-5xl md:text-6xl font-light tracking-normal sm:tracking-wider mt-auto text-center break-words max-w-full chromatic-title ${microgramma.className}`}>
            side_effects.art
          </h1>
          <p
            className={`mt-4 text-base sm:text-xl md:text-2xl text-white text-center ${spaceMono.className} mix-blend-difference opacity-70 subtitle-glow-only`}
          >
            <ScrambleText text="elevating visual experiences" />
          </p>
          <div className="mt-auto p-6 sm:p-8 text-gray-400 text-xs sm:text-sm text-center">
            Generative Art • Interactive Design • Visual Symphony
          </div>
        </div>
      </div>
      {/* Anchors `#gallery` y `#about` los usa la nav desde cualquier
          página (Link href="/#gallery"), gracias al scroll-behavior:
          smooth global definido en globals.css. El footer ya lleva
          id="about" internamente. */}
      <div id="gallery">
        <ClientOnly>
          <Gallery />
        </ClientOnly>
      </div>
      <div id="about">
        <ClientOnly>
          <Footer />
        </ClientOnly>
      </div>
    </main>
  )
}
export const dynamic = "force-dynamic"
