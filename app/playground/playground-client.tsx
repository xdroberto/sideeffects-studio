'use client'

import nextDynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
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
        className="relative w-full bg-canvas-muted/40 border border-line overflow-hidden"
        style={{ aspectRatio: '2.4 / 1' }}
        role="status"
        aria-live="polite"
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

const LEAD =
  'Drag the red orb. As you move it, the paragraph below rearranges itself around the obstacle in real time, using @chenglou/pretext to recompute the line breaks every frame.'

// Fragmento (reconstruido) de Ward Farnsworth, *The Socratic Method*
// (Godine, 2021). El texto encaja con la metáfora visual: el obstáculo
// no detiene al pensamiento, lo reorganiza.
const QUOTE = `The Socratic method is not a way of finding answers. It is a way of seeing what you do not yet understand. Faced with a contradiction, the mind has two options: defend the position it already holds, or rearrange itself in the light of what has been said. The first is comfort; the second is thought. Socrates believed only the second has any future.

The method does not promise certainty. It promises movement — small, deliberate, and continual. Each question is a kind of obstacle placed in the path of an opinion, to test whether the opinion can flow around it gracefully or whether it breaks. The opinions that survive are not the ones that resisted; they are the ones that adapted.

To think Socratically, then, is to learn how to be wrong without collapse. It is to recognize that the shape of one's own understanding is provisional, and to make a habit of letting it be redrawn.`

const ATTRIBUTION = '— Ward Farnsworth, The Socratic Method'

// Pequeña fórmula proposicional como guiño tipográfico-conceptual en el
// eyebrow del header — `P ∧ Q → R` (si P y Q, entonces R). Glifos Unicode
// estándar que Space Mono renderiza nativamente.
const FORMULA = 'P ∧ Q → R'

// Eyebrow pre-uppercased — necesario porque pretext mide caracteres
// literales y CSS `text-transform: uppercase` no afecta la medida.
const EYEBROW_TEXT = `Playground · 2026 · ${FORMULA}`.toUpperCase()
const TITLE_TEXT = 'playground'

/**
 * Tamaño responsivo del título dentro del canvas. ReflowingParagraph
 * usa `fontSize` para layoutear, así que no podemos depender de CSS
 * clamp — necesitamos un número concreto que cambie con el viewport.
 * Tres breakpoints alineados con Tailwind sm/lg.
 */
function useResponsiveHeadingSize() {
  const [size, setSize] = useState(56)
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth
      if (w >= 1024) setSize(72)
      else if (w >= 640) setSize(56)
      else setSize(40)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])
  return size
}

/**
 * Radio del orb-obstáculo: en mobile 84px de radio (168px diámetro)
 * ocupa ~47% del viewport útil — deja líneas de texto a su izquierda
 * tan estrechas (~70px) que cada línea tiene 3-4 palabras y se ven
 * ríos verticales feos. Lo bajamos a 56 en mobile (diámetro 112, ~31%
 * del ancho), 72 en sm+, y 84 desde lg+ donde sí hay espacio.
 */
function useResponsiveObstacleRadius() {
  const [radius, setRadius] = useState(72)
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth
      if (w >= 1024) setRadius(84)
      else if (w >= 640) setRadius(72)
      else setRadius(56)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])
  return radius
}

export function PlaygroundClient() {
  const headingSize = useResponsiveHeadingSize()
  const obstacleRadius = useResponsiveObstacleRadius()

  return (
    <main id="main-content" className="relative min-h-screen bg-canvas text-white">
      <ClientOnly>
        <Nav />
      </ClientOnly>

      {/* H1 fuera del canvas para SEO + screen readers. Visualmente
          oculto — el título real lo dibuja pretext dentro del reflow
          como uno de los paragraphs. */}
      <h1 className="sr-only">playground</h1>

      <article className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-24 md:pt-14 md:pb-32">
        {/*
          La demo: canvas de reflujo donde TODO el header del page
          (eyebrow, título, LEAD, QUOTE) son paragraphs apilados que
          comparten un único obstáculo. Roberto pidió que el header
          también reaccionara al orb — el efecto se extiende desde la
          línea de Playground · 2026 hasta el final del quote.
        */}
        <ClientOnly>
          <ReflowCanvas
            paragraphs={[
              {
                text: EYEBROW_TEXT,
                fontSize: 12,
                lineHeight: 18,
                color: 'rgb(220, 38, 38)',
                className: `${spaceMono.className} tracking-wider`,
              },
              {
                text: TITLE_TEXT,
                fontSize: headingSize,
                lineHeight: headingSize + 6,
                color: 'rgb(245, 245, 245)',
                className: microgramma.className,
                gapBefore: 14,
              },
              {
                text: LEAD,
                fontSize: 16,
                lineHeight: 28,
                color: 'rgb(180, 180, 180)',
                gapBefore: 44,
              },
              {
                text: QUOTE,
                fontSize: 16,
                lineHeight: 28,
                color: 'rgb(220, 220, 220)',
                gapBefore: 36,
              },
            ]}
            paragraphGap={36}
            obstacleRadius={obstacleRadius}
            obstacleColor="#dc2626"
            obstacleRingColor="#ffffff"
            className={spaceMono.className}
          />
        </ClientOnly>

        <p
          className={`mt-4 text-right pr-2 text-caption-mono-sm uppercase text-ink-subtle ${spaceMono.className}`}
        >
          {ATTRIBUTION}
        </p>

        <hr className="my-16 md:my-20 border-line-strong" />

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-3xl">
          <div className="space-y-3">
            <p className={`text-caption-mono-sm uppercase text-signal ${spaceMono.className}`}>
              How it works
            </p>
            <ShrinkwrapText
              text="Pretext prepares the text once. For each line we compute the horizontal segments not occluded by the orb's circular cross-section, then call layoutNextLineRange per segment. Re-layout runs at 60fps."
              fontSize={14}
              targetLines={5}
              maxWidth={420}
              className={`${spaceMono.className} text-sm text-ink-muted leading-relaxed`}
            />
          </div>
          <div className="space-y-3">
            <p className={`text-caption-mono-sm uppercase text-signal ${spaceMono.className}`}>
              Mobile
            </p>
            <ShrinkwrapText
              text="The orb has touch-action: none. The rest of the page scrolls naturally — touchmove only preventDefaults while a drag is active."
              fontSize={14}
              targetLines={4}
              maxWidth={420}
              className={`${spaceMono.className} text-sm text-ink-muted leading-relaxed`}
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
