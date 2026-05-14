'use client'

/**
 * Global error boundary — App Router pattern.
 *
 * Captura errores no manejados en cualquier ruta dentro de `app/`.
 * Es client-only (`'use client'`) y recibe `error` + `reset` desde Next.
 *
 * Filosofía de copy:
 * - Voz técnica y honesta, sin marketing. "this should not have happened."
 * - Mezcla Michroma (display) + Space Mono (caption) para mantener la
 *   identidad del portfolio. Aquí no se importa el Nav/Footer real porque
 *   pueden ser parte del fallo — preferimos un layout autónomo, mínimo.
 * - El glyph `///` actúa como ASCII decorativo discreto, en lugar de
 *   montar el componente AsciiBackdrop pesado (canvas 2D + drei).
 *
 * El digest se muestra cuando Next lo provee — útil si Roberto tiene
 * que correlacionar con logs server. En cliente puro suele ser `undefined`.
 */
import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Hook reservado para logging — por ahora solo console.error.
    // Si en el futuro Roberto conecta Sentry / Logflare / similar, este
    // es el punto natural para emitir el evento.
    // eslint-disable-next-line no-console
    console.error('[side_effects.art] unhandled error:', error)
  }, [error])

  return (
    <main
      id="main-content"
      role="main"
      className="relative min-h-screen bg-canvas text-ink flex flex-col items-center justify-center px-4 py-24 overflow-hidden"
    >
      {/* Glyph decorativo — bisel ASCII discreto que repite la vibe del
          hero sin importar el AsciiBackdrop completo. Hidden de assistive
          tech: es ornamental. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      >
        <span
          className="font-mono text-[18vw] sm:text-[14vw] leading-none text-signal/[0.04] tracking-tighter"
          style={{ letterSpacing: '-0.04em' }}
        >
          {'///'}
        </span>
      </div>

      <div className="relative z-10 max-w-xl text-center space-y-8">
        {/* Status tag — pulsa para insinuar señal viva detrás de la falla */}
        <div className="flex items-center justify-center gap-3">
          <span
            aria-hidden
            className="block w-2 h-2 rounded-full bg-signal animate-pulse"
          />
          <p className="text-caption-mono uppercase text-signal font-mono">
            unhandled · 500
          </p>
        </div>

        <h1 className="text-display-md font-display tracking-wide">
          something glitched
        </h1>

        <p className="text-caption-mono font-mono uppercase text-ink-subtle leading-relaxed">
          this should not have happened.
          <br />
          try again, or head back.
        </p>

        {error.digest && (
          <p className="text-caption-mono-xs font-mono uppercase text-ink-faint tabular-nums">
            digest · {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-3 px-5 py-3 border border-line-strong hover:border-signal/70 bg-canvas-muted hover:bg-signal/[0.06] text-ink hover:text-signal transition-colors duration-200 ease-out font-mono text-caption-mono uppercase"
          >
            <span aria-hidden className="text-base leading-none">
              &#8635;
            </span>
            <span>try again</span>
          </button>

          <a
            href="/"
            className="inline-flex items-center gap-3 px-5 py-3 text-ink-muted hover:text-signal transition-colors duration-200 ease-out font-mono text-caption-mono uppercase"
          >
            <span>head back</span>
            <span aria-hidden className="text-base leading-none">
              &rarr;
            </span>
          </a>
        </div>
      </div>
    </main>
  )
}
