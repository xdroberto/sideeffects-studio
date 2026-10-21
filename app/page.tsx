'use client'

import { Nav } from '@/components/nav'
import { Gallery } from '@/components/gallery'
import { Footer } from '@/components/footer'
import { ClientOnly } from '@/components/client-only'
import { HashScroll } from '@/components/hash-scroll'
import { ScrambleText } from '@/components/scramble-text'
import { Michroma as Microgramma, Space_Mono } from 'next/font/google'

// El diamante ya no se monta aquí: vive en la escena persistente del
// layout (components/scene/), que lo transforma al navegar y al bajar
// hacia la galería.

const microgramma = Microgramma({ subsets: ['latin'], weight: ['400'] })
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-space-mono',
})

export default function Home() {
  return (
    <main id="main-content" className="relative min-h-screen text-white overflow-hidden">
      <HashScroll />
      {/* Sin z-index propio: la escena ya vive en el layout, debajo de todo,
          y así la navbar fija (z-50) no queda atrapada en esta capa. */}
      <div className="relative">
        <ClientOnly>
          <Nav />
        </ClientOnly>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-4">
          <h1 className={`text-[clamp(1.5rem,7.5vw,3.75rem)] sm:text-5xl md:text-6xl font-light tracking-normal sm:tracking-wider mt-auto text-center max-w-full chromatic-title whitespace-nowrap ${microgramma.className}`}>
            side_effects.art
          </h1>
          <p
            className={`mt-4 text-base sm:text-xl md:text-2xl text-white text-center ${spaceMono.className} mix-blend-difference opacity-70 subtitle-glow-only`}
          >
            <ScrambleText text="elevating visual experiences" />
          </p>
          <div className="mt-auto p-6 sm:p-8 text-ink-muted text-xs sm:text-sm text-center">
            Generative Art • Interactive Design • Visual Symphony
          </div>
        </div>
      </div>
      {/* Anchors `#gallery` y `#about` los usa la nav desde cualquier
          página (Link href="/#gallery"), gracias al scroll-behavior:
          smooth global definido en globals.css. El footer ya lleva
          id="about" internamente. */}
      {/* Escenario de B1: al bajar, el diamante se pliega sobre su onda y
          la tinta crece aquí, antes de que la galería se abra encima. */}
      <div aria-hidden className="h-[75vh]" />
      <div id="gallery" className="scroll-mt-20">
        <ClientOnly>
          <Gallery />
        </ClientOnly>
      </div>
      <div id="about" className="scroll-mt-20">
        <ClientOnly>
          <Footer />
        </ClientOnly>
      </div>
    </main>
  )
}
export const dynamic = "force-dynamic"
