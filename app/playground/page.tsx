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
  {
    ssr: false,
    // Skeleton: reserva el aspect ratio inicial del canvas (mismo `aspect`
    // que se le pasa abajo: 2.4) para evitar CLS. El skeleton final puede
    // crecer por encima cuando el text reflujea, pero al menos el primer
    // pixel coincide. Un caption-mono tenue da contexto de qué carga.
    loading: () => (
      <div
        className="relative w-full bg-neutral-950/40 border border-neutral-900 overflow-hidden"
        style={{ aspectRatio: '2.4 / 1' }}
        aria-hidden
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-caption-mono-sm uppercase text-zinc-700 animate-pulse font-mono">
            laying out paragraph
          </span>
        </div>
      </div>
    ),
  },
)

// Lead orientado a la metáfora lógica: la proposición que se inserta en
// un argumento desplaza el razonamiento. Mantiene la descripción técnica
// (@chenglou/pretext, 60fps) sin perder el guiño formal.
const LEAD =
  'Drag the proposition. Like a premise inserted into an argument, it displaces the reasoning around it — the paragraph reflows in real time using @chenglou/pretext, recomputing line breaks every frame.'

// Paráfrasis (reconstruida) en la línea de Frege / Russell: una
// proposición se entiende como función de sus argumentos, y al cambiar
// uno de ellos toda la forma debe reorganizarse a su alrededor sin
// romperse. El texto encaja con la metáfora visual del orb que reflujea
// el párrafo: la estructura sobrevive cuando se adapta, no cuando
// resiste.
const QUOTE = `A proposition is not a fixed string of words. It is a form — a function waiting for its arguments. When one term is replaced, every other element of the sentence must reorganize itself around the new value, and the form survives only if it can accommodate the change without contradiction. To think clearly is, in part, to feel where those changes propagate.

The same applies to an argument. A premise is never neutral: once it enters, the surrounding reasoning has to make room for it. Conclusions that depended on a previous arrangement either dissolve, or rearrange themselves into a new shape that the new premise will tolerate. The argument that survives is not the one that resisted the premise, but the one that re-rendered around it.

Logic is, in this sense, less a set of fixed truths than a discipline of accommodation: a way of moving terms through a structure and watching where the structure must yield.`

const ATTRIBUTION = '— after Frege & Russell'

// Pequeña fórmula proposicional como tipográfico-conceptual badge —
// `P ∧ Q → R` (si P y Q, entonces R). Caja monoespaciada, glifos Unicode
// estándar que Space Mono renderiza nativamente.
const FORMULA = 'P ∧ Q → R'

export default function PlaygroundPage() {
  return (
    <main id="main-content" className="relative min-h-screen bg-black text-white">
      <ClientOnly>
        <Nav />
      </ClientOnly>

      <article className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-24 md:pt-20 md:pb-32">
        <header className="mb-10 md:mb-14 flex flex-col gap-4 max-w-2xl">
          <p className={`text-caption-mono-sm uppercase text-red-500 ${spaceMono.className}`}>
            Playground · 2026 · {FORMULA}
          </p>
          <h1 className={`text-display-xl ${microgramma.className}`}>
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
          La demo: canvas de reflujo. El obstáculo rojo es una variable
          proposicional (`P`) que el user arrastra; el texto se re-rompe
          alrededor en tiempo real, vía pretext. La metáfora visual y el
          contenido están alineados — un argumento que se reorganiza
          alrededor de la premisa que se inserta. touch-action: none
          vive solo dentro del orb, así que el resto de la página
          scrollea normal en mobile.
        */}
        <ClientOnly>
          <ReflowCanvas
            text={QUOTE}
            fontSize={16}
            lineHeight={28}
            aspect={2.4}
            obstacleRadius={84}
            obstacleLabel="P"
            color="rgb(220, 220, 220)"
            obstacleColor="#dc2626"
            obstacleRingColor="#ffffff"
            className={spaceMono.className}
          />
        </ClientOnly>

        <p
          className={`mt-4 text-right pr-2 text-caption-mono-sm uppercase text-gray-500 ${spaceMono.className}`}
        >
          {ATTRIBUTION}
        </p>
        <p className={`mt-2 text-caption-mono-sm uppercase text-gray-600 ${spaceMono.className} text-center`}>
          Drag the proposition · the argument rearranges around it
        </p>

        <hr className="my-16 md:my-20 border-neutral-800" />

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-3xl">
          <div className="space-y-3">
            <p className={`text-caption-mono-sm uppercase text-red-500 ${spaceMono.className}`}>
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
            <p className={`text-caption-mono-sm uppercase text-red-500 ${spaceMono.className}`}>
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
