/** Lo que queda en el marco si el navegador no puede iniciar una pieza. */
export function PieceFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-canvas p-6 text-center">
      <p className="font-mono text-caption-mono uppercase text-ink-subtle">This browser couldn&apos;t start this piece.</p>
    </div>
  )
}
