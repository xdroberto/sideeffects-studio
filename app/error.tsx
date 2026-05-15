'use client'

/**
 * Global error boundary — App Router pattern.
 *
 * Captura errores no manejados en cualquier ruta dentro de `app/`. Es
 * client-only (`'use client'`) y recibe `error` + `reset` desde Next.
 *
 * El page está atravesado por efectos glitch en capas — coherente con
 * la idea de "algo glitchó":
 *  - Triple-layer ASCII `///` con RGB split (red + cyan + magenta) y
 *    flicker asincrónico por capa → chromatic aberration ambiente.
 *  - Título con ScrambleText que **se vuelve a corromper** cada ~4-6s
 *    durante 300-400 ms (`GlitchScrambleText`).
 *  - Capa de glitch slices sobre el título: dos pseudo-clones con
 *    `clip-path` rebanado y `translateX` micro-saltos → simulan
 *    interferencia VHS.
 *  - Scanlines globales sutiles encima del page (mix-blend-mode overlay).
 *  - Status dot con `signal-blink` errático en lugar de pulse smooth.
 *
 * Todo respeta `prefers-reduced-motion` — el page degrada a estático.
 */
import { useEffect, useState } from 'react'
import { ScrambleText } from '@/components/scramble-text'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

const TITLE = 'something glitched'

/**
 * Wrapper sobre ScrambleText que ocasionalmente re-dispara la animación
 * para simular que la "señal" sigue interferida después del crash. Cada
 * `tick` (4-6s aleatorio), con 50% probabilidad, fuerza un re-scramble
 * corto (300 ms). Cambia el `key` para remount el ScrambleText interior
 * y re-arrancar su useEffect de animación.
 */
function GlitchScrambleText({ text }: { text: string }) {
  const [tick, setTick] = useState(0)
  const [glitching, setGlitching] = useState(false)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      const wait = 3500 + Math.random() * 3000 // 3.5 – 6.5s
      timeoutId = setTimeout(() => {
        if (Math.random() < 0.6) {
          setGlitching(true)
          setTick(t => t + 1)
          setTimeout(() => setGlitching(false), 320)
        }
        schedule()
      }, wait)
    }
    schedule()
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  return (
    <ScrambleText
      key={tick}
      text={text}
      duration={glitching ? 320 : 1600}
      scrambleHz={glitching ? 60 : 48}
      finalLockProgress={glitching ? 0.5 : 0.8}
    />
  )
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[side_effects.art] unhandled error:', error)
  }, [error])

  return (
    <main
      id="main-content"
      role="main"
      className="relative min-h-screen bg-canvas text-ink flex flex-col items-center justify-center px-4 py-24 overflow-hidden"
    >
      {/* Triple-layer `///` con RGB split. Cada capa flickea en fase
          distinta, lo que produce micro-instantes de chromatic aberration
          completo (las tres capas separadas) que se "re-alinean" al
          siguiente frame. Hidden de assistive tech: ornamental. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      >
        <span
          className="error-glyph error-glyph-r font-mono leading-none tracking-tighter"
          style={{ letterSpacing: '-0.04em' }}
        >
          {'///'}
        </span>
        <span
          className="error-glyph error-glyph-c font-mono leading-none tracking-tighter"
          style={{ letterSpacing: '-0.04em' }}
        >
          {'///'}
        </span>
        <span
          className="error-glyph error-glyph-m font-mono leading-none tracking-tighter"
          style={{ letterSpacing: '-0.04em' }}
        >
          {'///'}
        </span>
      </div>

      {/* Scanlines globales — overlay finísimo que da textura CRT/VHS.
          mix-blend-mode overlay para que el fondo dark las absorba sin
          dominar. Z-index bajo: el contenido va encima. */}
      <div aria-hidden className="error-scanlines pointer-events-none absolute inset-0" />

      <div className="relative z-10 max-w-xl text-center space-y-8">
        {/* Status tag — el dot ahora hace blink errático (signal-blink)
            en vez del pulse smooth, coherente con la vibe glitch */}
        <div className="flex items-center justify-center gap-3">
          <span
            aria-hidden
            className="block w-2 h-2 rounded-full bg-signal signal-blink"
          />
          <p className="text-caption-mono uppercase text-signal font-mono">
            unhandled · 500
          </p>
        </div>

        {/* Título con glitch slices: dos pseudo-clones del texto en
            posición absoluta con clip-path rebanado + translateX micro
            jumps en colores red/cyan. El ScrambleText sobre el span
            principal escribe textContent en runtime; los pseudo-clones
            usan attr(data-text) que se queda fijo (no glitchea con el
            scramble — eso es deliberado, dan el "fantasma" detrás). */}
        <h1
          className="text-display-md font-display tracking-wide glitch-title relative inline-block"
          data-text={TITLE}
        >
          <GlitchScrambleText text={TITLE} />
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

      {/* Todos los keyframes del page consolidados aquí. */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            /* --- Triple-layer /// con RGB split --- */
            .error-glyph {
              position: absolute;
              font-size: 18vw;
              opacity: 0.04;
              will-change: opacity, transform, filter;
            }
            @media (min-width: 640px) {
              .error-glyph { font-size: 14vw; }
            }
            .error-glyph-r {
              color: #ef4444; /* signal */
              transform: translate(0px, 0px);
              animation: glyph-flicker-r 5.3s steps(1, end) infinite;
            }
            .error-glyph-c {
              color: #06b6d4; /* cyan-500 */
              mix-blend-mode: screen;
              transform: translate(-3px, 1px);
              animation: glyph-flicker-c 4.1s steps(1, end) infinite;
            }
            .error-glyph-m {
              color: #d946ef; /* fuchsia-500 */
              mix-blend-mode: screen;
              transform: translate(3px, -1px);
              animation: glyph-flicker-m 6.7s steps(1, end) infinite;
            }
            @keyframes glyph-flicker-r {
              0%, 78%, 100% { opacity: 0.05; transform: translate(0, 0); }
              80% { opacity: 0.16; transform: translate(-2px, 0); filter: blur(0.6px); }
              82% { opacity: 0.03; transform: translate(2px, 0); filter: blur(0); }
              84% { opacity: 0.12; transform: translate(-4px, 1px); }
              86% { opacity: 0.05; transform: translate(0, 0); }
              94% { opacity: 0.08; transform: translate(1px, -1px); }
              96% { opacity: 0.04; transform: translate(0, 0); }
            }
            @keyframes glyph-flicker-c {
              0%, 60%, 100% { opacity: 0.04; transform: translate(-3px, 1px); }
              63% { opacity: 0.18; transform: translate(-6px, 1px); }
              65% { opacity: 0.06; transform: translate(-2px, 1px); }
              71% { opacity: 0.10; transform: translate(-4px, 2px); }
              73% { opacity: 0.04; transform: translate(-3px, 1px); }
            }
            @keyframes glyph-flicker-m {
              0%, 40%, 100% { opacity: 0.04; transform: translate(3px, -1px); }
              43% { opacity: 0.14; transform: translate(6px, -1px); }
              45% { opacity: 0.05; transform: translate(2px, -1px); }
              52% { opacity: 0.10; transform: translate(5px, 0); }
              54% { opacity: 0.04; transform: translate(3px, -1px); }
            }

            /* --- Scanlines globales --- */
            .error-scanlines {
              background-image: repeating-linear-gradient(
                to bottom,
                transparent 0px,
                transparent 2px,
                rgba(255, 255, 255, 0.025) 3px,
                transparent 4px
              );
              mix-blend-mode: overlay;
              animation: scanline-drift 8s linear infinite;
            }
            @keyframes scanline-drift {
              0% { background-position-y: 0; }
              100% { background-position-y: 4px; }
            }

            /* --- Status dot blink errático --- */
            .signal-blink {
              animation: signal-blink 2.4s steps(1, end) infinite;
            }
            @keyframes signal-blink {
              0%, 55%, 60%, 78%, 84%, 100% { opacity: 1; }
              57% { opacity: 0.15; }
              80% { opacity: 0.4; }
              82% { opacity: 0.05; }
            }

            /* --- Glitch slices sobre el título --- */
            .glitch-title::before,
            .glitch-title::after {
              content: attr(data-text);
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              font: inherit;
              letter-spacing: inherit;
              pointer-events: none;
              text-align: center;
            }
            .glitch-title::before {
              color: rgba(239, 68, 68, 0.85);
              animation: glitch-slice-1 3.1s steps(1, end) infinite;
              clip-path: inset(0 0 100% 0);
              transform: translate(-2px, 0);
            }
            .glitch-title::after {
              color: rgba(6, 182, 212, 0.7);
              mix-blend-mode: screen;
              animation: glitch-slice-2 2.5s steps(1, end) infinite;
              clip-path: inset(100% 0 0 0);
              transform: translate(2px, 0);
            }
            @keyframes glitch-slice-1 {
              0%, 85%, 100% { clip-path: inset(0 0 100% 0); transform: translate(-2px, 0); }
              87% { clip-path: inset(20% 0 55% 0); transform: translate(-5px, 0); }
              89% { clip-path: inset(60% 0 15% 0); transform: translate(-3px, 1px); }
              91% { clip-path: inset(10% 0 70% 0); transform: translate(-7px, 0); }
              93% { clip-path: inset(40% 0 40% 0); transform: translate(-2px, 0); }
              95% { clip-path: inset(0 0 100% 0); }
            }
            @keyframes glitch-slice-2 {
              0%, 78%, 100% { clip-path: inset(100% 0 0 0); transform: translate(2px, 0); }
              80% { clip-path: inset(55% 0 25% 0); transform: translate(4px, 0); }
              82% { clip-path: inset(15% 0 65% 0); transform: translate(6px, -1px); }
              84% { clip-path: inset(70% 0 5% 0); transform: translate(3px, 0); }
              86% { clip-path: inset(100% 0 0 0); }
            }

            @media (prefers-reduced-motion: reduce) {
              .error-glyph,
              .error-glyph-r,
              .error-glyph-c,
              .error-glyph-m,
              .error-scanlines,
              .signal-blink,
              .glitch-title::before,
              .glitch-title::after {
                animation: none !important;
              }
              .error-glyph { opacity: 0.05 !important; }
              .error-glyph-c, .error-glyph-m { opacity: 0 !important; }
              .glitch-title::before, .glitch-title::after { content: none !important; }
            }
          `,
        }}
      />
    </main>
  )
}
