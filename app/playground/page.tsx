'use client'

import nextDynamic from 'next/dynamic'
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

const LEAD =
  'Drag the red orb. As you move it, the paragraph below rearranges itself around the obstacle in real time, using @chenglou/pretext to recompute the line breaks every frame.'

// Fragmento (reconstruido) de Ward Farnsworth, *The Socratic Method*
// (Godine, 2021). El texto encaja con la metáfora visual: el obstáculo
// no detiene al pensamiento, lo reorganiza.
const QUOTE = `The Socratic method is not a way of finding answers. It is a way of seeing what you do not yet understand. Faced with a contradiction, the mind has two options: defend the position it already holds, or rearrange itself in the light of what has been said. The first is comfort; the second is thought. Socrates believed only the second has any future.

The method does not promise certainty. It promises movement — small, deliberate, and continual. Each question is a kind of obstacle placed in the path of an opinion, to test whether the opinion can flow around it gracefully or whether it breaks. The opinions that survive are not the ones that resisted; they are the ones that adapted.

To think Socratically, then, is to learn how to be wrong without collapse. It is to recognize that the shape of one's own understanding is provisional, and to make a habit of letting it be redrawn.`

const ATTRIBUTION = '— Ward Farnsworth, The Socratic Method'

export default function PlaygroundPage() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <ClientOnly>
        <Nav />
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
            text={LEAD}
            fontSize={17}
            targetLines={4}
            maxWidth={600}
            className={`${spaceMono.className} text-base sm:text-lg text-gray-300 leading-relaxed`}
          />
        </header>

        {/*
          La demo en sí: el canvas de reflujo. El obstáculo rojo se arrastra
          y el texto se re-rompe alrededor en tiempo real, vía pretext.
          El texto es un fragmento de Farnsworth sobre el método socrático
          — la metáfora visual y el contenido están alineados.
          touch-action: none vive solo dentro del orb, así que el resto de
          la página scrollea normal en mobile.
        */}
        <ClientOnly>
          <ReflowCanvas
            text={QUOTE}
            fontSize={16}
            lineHeight={28}
            aspect={1.2}
            obstacleRadius={88}
            obstacleLabel="drag"
            color="rgb(220, 220, 220)"
            obstacleColor="#dc2626"
            obstacleRingColor="#ffffff"
            className={spaceMono.className}
          />
        </ClientOnly>

        <p
          className={`mt-4 text-right pr-2 text-[11px] uppercase tracking-[0.18em] text-gray-500 ${spaceMono.className}`}
        >
          {ATTRIBUTION}
        </p>
        <p className={`mt-2 text-[11px] uppercase tracking-[0.18em] text-gray-600 ${spaceMono.className} text-center`}>
          Drag the orb · the paragraph rearranges around it
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

      <ClientOnly>
        <Footer />
      </ClientOnly>
    </main>
  )
}
