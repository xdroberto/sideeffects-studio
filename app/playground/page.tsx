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

const ReflowCanvas = nextDynamic(
  () => import('@/components/playground/reflow-canvas').then(mod => mod.ReflowCanvas),
  { ssr: false, loading: () => null },
)

const LOREM_LEAD =
  'Drag the red orb. The text reflows around it in real time using @chenglou/pretext for the line layout.'

const LOREM_BODY = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.`

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

      <article className="max-w-5xl mx-auto px-6 pt-12 pb-24 md:pt-20 md:pb-32">
        <header className="mb-10 md:mb-14 flex flex-col gap-4 max-w-2xl">
          <p className={`text-[11px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
            Playground · 2026 · pretext demo
          </p>
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-light tracking-wider ${microgramma.className}`}>
            playground
          </h1>
          <ShrinkwrapText
            text={LOREM_LEAD}
            fontSize={17}
            targetLines={3}
            maxWidth={600}
            className={`${spaceMono.className} text-base sm:text-lg text-gray-300 leading-relaxed`}
          />
        </header>

        {/*
          La demo en sí: el canvas de reflujo. El obstáculo rojo se arrastra
          y el texto se re-rompe alrededor en tiempo real, vía pretext.
          touch-action: none vive solo dentro del orb, así que el resto de
          la página scrollea normal en mobile.
        */}
        <ClientOnly>
          <ReflowCanvas
            text={LOREM_BODY}
            fontSize={16}
            lineHeight={28}
            aspect={1.4}
            obstacleRadius={88}
            obstacleLabel="drag"
            color="rgb(220, 220, 220)"
            obstacleColor="#dc2626"
            obstacleRingColor="#ffffff"
            className={spaceMono.className}
          />
        </ClientOnly>

        <p className={`mt-4 text-[11px] uppercase tracking-[0.18em] text-gray-500 ${spaceMono.className} text-center`}>
          Drag the orb · the text reflows around it
        </p>

        <hr className="my-16 md:my-20 border-neutral-800" />

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-3xl">
          <div className="space-y-3">
            <p className={`text-[11px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
              How it works
            </p>
            <ShrinkwrapText
              text="Pretext prepares the text once. For each line we compute the horizontal segments not occluded by the orb's circular cross-section, then call layoutNextLineRange per segment. Re-layout runs at 60fps."
              fontSize={14}
              targetLines={5}
              maxWidth={420}
              className={`${spaceMono.className} text-sm text-gray-400 leading-relaxed`}
            />
          </div>
          <div className="space-y-3">
            <p className={`text-[11px] uppercase tracking-[0.18em] text-red-500 ${spaceMono.className}`}>
              Mobile
            </p>
            <ShrinkwrapText
              text="The orb has touch-action: none. The rest of the page scrolls naturally — touchmove only preventDefaults while a drag is active."
              fontSize={14}
              targetLines={4}
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
