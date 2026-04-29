'use client'

import nextDynamic from 'next/dynamic'
import { useRef } from 'react'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'
import { ClientOnly } from '@/components/client-only'
import { ShrinkwrapText } from '@/components/playground/shrinkwrap-text'
import { Michroma as Microgramma, Space_Mono } from 'next/font/google'

const microgramma = Microgramma({ subsets: ['latin'], weight: ['400'] })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400'] })

const DraggableOrb = nextDynamic(
  () => import('@/components/playground/draggable-orb').then(mod => mod.DraggableOrb),
  { ssr: false, loading: () => null },
)

const LOREM_LEAD =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

const LOREM_BODY = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
occaecat cupidatat non proident, sunt in culpa qui officia deserunt
mollit anim id est laborum.`

const LOREM_BODY_2 = `Sed ut perspiciatis unde omnis iste natus error sit voluptatem
accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab
illo inventore veritatis et quasi architecto beatae vitae dicta sunt
explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut
odit aut fugit, sed quia consequuntur magni dolores eos qui ratione
voluptatem sequi nesciunt.`

export default function PlaygroundPage() {
  const galleryRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)

  return (
    <main className="relative min-h-screen bg-black text-white">
      <ClientOnly>
        <Nav
          onGalleryClick={() => galleryRef.current?.scrollIntoView({ behavior: 'smooth' })}
          onAboutClick={() => aboutRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />
      </ClientOnly>

      <article className="max-w-6xl mx-auto px-6 pt-12 pb-24 md:pt-20 md:pb-32">
        <header className="mb-12 md:mb-16 flex flex-col gap-4 max-w-2xl">
          <p className={`text-[11px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
            Playground · 2026
          </p>
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-light tracking-wider ${microgramma.className}`}>
            playground
          </h1>
          <ShrinkwrapText
            text={LOREM_LEAD}
            fontSize={18}
            targetLines={3}
            maxWidth={620}
            className={`${spaceMono.className} text-base sm:text-lg text-gray-300 leading-relaxed`}
          />
        </header>

        {/*
          Grid responsivo con UN SOLO canvas:
          - Mobile (default): grid-cols-1, orb arriba (source-order), texto debajo.
          - Desktop (lg+): grid-cols-5, orb en cols 4-5 (sticky), texto en cols 1-3.
            `lg:row-start-1` mantiene orb y texto en la misma fila para que el
            sticky funcione respecto al article.
        */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12 lg:items-start">
          {/* Orb — un solo componente para evitar dual-canvas */}
          <aside className="lg:col-span-2 lg:col-start-4 lg:row-start-1">
            <div className="lg:sticky lg:top-24 mx-auto w-full max-w-[380px] lg:max-w-none">
              <ClientOnly>
                <DraggableOrb className="relative w-full aspect-square rounded-[20px] border border-neutral-800 bg-gradient-to-br from-neutral-950 to-black">
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className={`text-[10px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
                      Drag
                    </span>
                  </div>
                  <div className={`absolute bottom-3 right-3 text-[10px] uppercase tracking-[0.18em] text-gray-500 ${spaceMono.className}`}>
                    ICOSA · 01
                  </div>
                </DraggableOrb>
              </ClientOnly>
              <p className={`mt-3 text-[11px] uppercase tracking-[0.18em] text-gray-500 ${spaceMono.className} text-center`}>
                Drag · click · play
              </p>
            </div>
          </aside>

          {/* Texto */}
          <div className="lg:col-span-3 lg:col-start-1 lg:row-start-1">
            <div className={`${spaceMono.className} text-[15px] sm:text-base leading-[1.8] text-gray-300 space-y-6`}>
              <p>
                <span className="float-left mr-2 mt-1 text-5xl leading-none font-light text-red-500">
                  L
                </span>
                {LOREM_BODY.replace(/^Lorem/, 'orem')}
              </p>
              <p>{LOREM_BODY_2}</p>
            </div>
          </div>
        </div>

        <hr className="my-16 md:my-20 border-neutral-800" />

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-3xl">
          <div className="space-y-3">
            <p className={`text-[11px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
              Tools
            </p>
            <ShrinkwrapText
              text="TypeScript, GLSL, Three.js, React Three Fiber, Tone.js, Framer Motion."
              fontSize={15}
              targetLines={3}
              maxWidth={420}
              className={`${spaceMono.className} text-sm text-gray-400 leading-relaxed`}
            />
          </div>
          <div className="space-y-3">
            <p className={`text-[11px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
              Pretext
            </p>
            <ShrinkwrapText
              text="The captions on this page use chenglou/pretext to find the optimal width that produces the cleanest line breaks."
              fontSize={15}
              targetLines={3}
              maxWidth={420}
              className={`${spaceMono.className} text-sm text-gray-400 leading-relaxed`}
            />
          </div>
        </section>
      </article>

      <div ref={galleryRef} />
      <div ref={aboutRef} />
      <ClientOnly>
        <Footer />
      </ClientOnly>
    </main>
  )
}
