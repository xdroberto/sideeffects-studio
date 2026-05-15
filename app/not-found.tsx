'use client'

/**
 * 404 — App Router not-found.tsx.
 *
 * Voz alineada con el playground (Frege / Russell): páginas como
 * proposiciones que nunca llegaron a fijar referencia. El copy juega con
 * la idea de un argumento mal formado en lugar de la línea genérica de
 * "page not found".
 *
 * Mantenemos Nav + Footer reales (a diferencia de error.tsx, donde se
 * omiten porque pueden ser parte del fallo). Aquí la app está sana,
 * solo el path no resuelve.
 *
 * Lista de "valid forms" → sugerencias de páginas reales del portfolio,
 * presentadas como variables proposicionales numeradas. Refuerza el tono.
 */
import Link from 'next/link'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'
import { ClientOnly } from '@/components/client-only'

interface ValidPath {
  href: string
  label: string
  hint: string
}

const VALID_PATHS: ValidPath[] = [
  { href: '/', label: 'home', hint: 'landing · diamond field' },
  { href: '/#gallery', label: 'gallery', hint: 'curated images & video' },
  { href: '/sf01', label: 'sf-01', hint: 'live visual synthesizer' },
  { href: '/chord-lab', label: 'chord lab', hint: 'pocket chord toy' },
  { href: '/playground', label: 'playground', hint: 'reflow & propositions' },
]

export default function NotFound() {
  return (
    <main
      id="main-content"
      role="main"
      className="relative min-h-screen bg-canvas text-ink flex flex-col overflow-hidden"
    >
      <ClientOnly>
        <Nav />
      </ClientOnly>

      <section className="relative flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        {/* Big 404 numeric ghost background — decorative, layered behind */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        >
          <span
            className="font-display text-[40vw] sm:text-[28vw] md:text-[22vw] leading-none text-ink/[0.025] tracking-wider"
            style={{ letterSpacing: '0.08em' }}
          >
            404
          </span>
        </div>

        <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
          {/* Status caption — coherente con SF-01 / Chord Lab hero pattern */}
          <div className="flex items-center justify-center gap-3">
            <span
              aria-hidden
              className="block w-2 h-2 rounded-full bg-signal animate-pulse"
            />
            <p className="text-caption-mono uppercase text-signal font-mono">
              proposition · undefined
            </p>
          </div>

          <h1 className="text-display-xl font-display">404</h1>

          <p className="text-caption-mono font-mono uppercase text-ink-muted leading-relaxed max-w-lg mx-auto">
            this page never existed,
            <br />
            or it never was meant to.
          </p>

          <p className="text-sm sm:text-base text-ink-subtle font-mono leading-relaxed max-w-md mx-auto">
            A reference without a referent. The form is well-typed, the
            symbol is not.
          </p>

          {/* Valid forms — sugerencias como variables proposicionales */}
          <div className="pt-6 max-w-md mx-auto text-left">
            <p className="text-caption-mono-sm uppercase text-signal font-mono mb-3 text-center sm:text-left">
              valid forms
            </p>
            <ul
              className="space-y-2 font-mono"
              aria-label="Valid pages on side_effects.art"
            >
              {VALID_PATHS.map((path, i) => (
                <li key={path.href} className="flex items-baseline gap-3">
                  <span className="text-caption-mono-sm tabular-nums text-signal/60 shrink-0 w-6">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Link
                    href={path.href}
                    className="group flex-1 flex items-baseline justify-between gap-3 text-ink hover:text-signal transition-colors duration-200 ease-out"
                  >
                    <span className="text-sm uppercase tracking-wider">
                      {path.label}
                    </span>
                    <span className="text-caption-mono-xs uppercase text-ink-faint group-hover:text-signal/70 transition-colors hidden sm:block">
                      {path.hint}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 px-5 py-3 border border-line-strong hover:border-signal/70 bg-canvas-muted hover:bg-signal/[0.06] text-ink hover:text-signal transition-colors duration-200 ease-out font-mono text-caption-mono uppercase"
            >
              <span aria-hidden className="text-base leading-none">
                &larr;
              </span>
              <span>back to a valid form</span>
            </Link>
          </div>
        </div>
      </section>

      <ClientOnly>
        <Footer />
      </ClientOnly>
    </main>
  )
}
