'use client'

import nextDynamic from 'next/dynamic'
import { useRef } from 'react'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'
import { ClientOnly } from '@/components/client-only'
import { ShrinkwrapText } from '@/components/playground/shrinkwrap-text'
import { useMediaQuery } from '@/lib/use-media-query'
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
mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus
error sit voluptatem accusantium doloremque laudantium, totam rem
aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto
beatae vitae dicta sunt explicabo.`

const LOREM_BODY_2 = `Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut
fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem
sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor
sit amet, consectetur, adipisci velit, sed quia non numquam eius modi
tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.`

/**
 * Bloque de body con drop-cap. En desktop, el orb flotante con
 * `shape-outside: circle(50%)` se inserta antes del párrafo principal
 * y el texto reflujea alrededor. En mobile, el orb va apilado fuera
 * de este bloque.
 */
function BodyText({ withFloatingOrb }: { withFloatingOrb: boolean }) {
  return (
    <>
      {withFloatingOrb && (
        <div
          aria-hidden
          className="float-right ml-8 mb-4 w-[300px] h-[300px]"
          style={{
            shapeOutside: 'circle(50%)',
            shapeMargin: '14px',
          }}
        >
          <DraggableOrb className="w-full h-full rounded-full border border-neutral-800 bg-neutral-950/40" />
        </div>
      )}

      <div className={`${spaceMono.className} text-[15px] sm:text-base leading-[1.8] text-gray-300 space-y-6`}>
        <p>
          <span className="float-left mr-2 mt-1 text-5xl leading-none font-light text-red-500">
            L
          </span>
          {LOREM_BODY.replace(/^Lorem/, 'orem')}
        </p>
        <p>{LOREM_BODY_2}</p>
      </div>
    </>
  )
}

export default function PlaygroundPage() {
  const galleryRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)
  // Solo montamos UN canvas — el correspondiente al breakpoint actual.
  // Esto evita que un segundo contexto WebGL se inicialice oculto.
  const isDesktop = useMediaQuery('(min-width: 768px)', false)

  return (
    <main className="relative min-h-screen bg-black text-white">
      <ClientOnly>
        <Nav
          onGalleryClick={() => galleryRef.current?.scrollIntoView({ behavior: 'smooth' })}
          onAboutClick={() => aboutRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />
      </ClientOnly>

      <article className="max-w-3xl mx-auto px-6 pt-12 pb-24 md:pt-20 md:pb-32">
        <header className="mb-12 md:mb-16 flex flex-col gap-4">
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

        <ClientOnly>
          {isDesktop ? (
            // Desktop: orb flotante dentro del body, texto reflujea con shape-outside.
            <BodyText withFloatingOrb />
          ) : (
            // Mobile: orb stacked arriba, body debajo full-width.
            <>
              <div className="mb-8">
                <DraggableOrb className="w-full h-[280px] rounded-[20px] border border-neutral-800 bg-neutral-950/60 overflow-hidden" />
                <p className={`mt-3 text-[11px] uppercase tracking-[0.18em] text-gray-500 ${spaceMono.className} text-center`}>
                  Drag the orb · scroll the rest
                </p>
              </div>
              <BodyText withFloatingOrb={false} />
            </>
          )}
        </ClientOnly>

        <hr className="my-12 md:my-16 border-neutral-800" />

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
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
