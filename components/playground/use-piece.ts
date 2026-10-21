import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react'
import { isRunning, subscribe } from '@/lib/playground/motion'

/**
 * Una pieza de Playground: un canvas con su motor. `resize` recibe el tamaño
 * interno (px de dispositivo) y el de CSS; `frame(t, dt)` dibuja (dt = 0:
 * solo redibujar, sin avanzar); `dirty` pide un cuadro aunque no haya
 * movimiento; `visibility` avisa si salió o volvió a pantalla.
 */
export type Piece = {
  resize(w: number, h: number, dpr: number, cssW: number, cssH: number): void
  frame(t: number, dt: number): void
  dispose(): void
  dirty: boolean
  visibility?(visible: boolean): void
}

type Entry = { piece: Piece; visible: boolean; failed: boolean; fail(): void }

// Un solo requestAnimationFrame para todas las piezas, con un reloj común
// que avanza solo mientras hay movimiento. Se apaga con la última pieza.
const entries = new Set<Entry>()
let raf = 0
let last = 0
let clock = 0

function run(e: Entry, dt: number) {
  try {
    // Se consume antes del cuadro: la pieza puede pedir otro desde frame().
    e.piece.dirty = false
    e.piece.frame(clock, dt)
  } catch (err) {
    console.error(err)
    e.failed = true
    e.fail()
  }
}

function loop(now: number) {
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
  last = now
  const running = isRunning()
  if (running) clock += dt
  for (const e of entries) {
    if (e.failed) continue
    if (running && e.visible) run(e, dt)
    else if (e.piece.dirty) run(e, 0)
  }
  raf = entries.size ? requestAnimationFrame(loop) : 0
}

function add(e: Entry) {
  entries.add(e)
  if (!raf) {
    last = performance.now()
    raf = requestAnimationFrame(loop)
  }
}

function remove(e: Entry) {
  entries.delete(e)
  if (!entries.size && raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
}

/**
 * Monta una pieza dentro de `host`: crea su canvas (uno nuevo en cada
 * montaje, así el contexto anterior se suelta de verdad), lo dimensiona con
 * `devicePixelRatio` (tope `maxDpr`), lo anima solo si está en pantalla
 * (margen de 120 px) y lo limpia todo al desmontar. `label` describe la
 * imagen para lectores de pantalla.
 */
export function usePiece(
  host: RefObject<HTMLElement>,
  make: (canvas: HTMLCanvasElement) => Piece,
  {
    maxDpr = 2,
    className = 'absolute inset-0 block h-full w-full',
    label,
  }: { maxDpr?: number; className?: string; label?: string } = {},
): { piece: MutableRefObject<Piece | null>; failed: boolean } {
  const piece = useRef<Piece | null>(null)
  const [failed, setFailed] = useState(false)
  const makeRef = useRef(make)
  makeRef.current = make

  useEffect(() => {
    const el = host.current
    if (!el) return
    const canvas = document.createElement('canvas')
    canvas.className = className
    if (label) {
      canvas.setAttribute('role', 'img')
      canvas.setAttribute('aria-label', label)
    }
    el.prepend(canvas)
    let p: Piece
    try {
      p = makeRef.current(canvas)
    } catch (err) {
      console.error(err)
      canvas.remove()
      setFailed(true)
      return
    }
    piece.current = p
    const entry: Entry = { piece: p, visible: true, failed: false, fail: () => setFailed(true) }

    let w = 0
    let h = 0
    const fit = () => {
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height || entry.failed) return
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
      const cw = Math.max(2, Math.round(r.width * dpr))
      const ch = Math.max(2, Math.round(r.height * dpr))
      if (cw === w && ch === h) return
      w = canvas.width = cw
      h = canvas.height = ch
      try {
        p.resize(cw, ch, dpr, r.width, r.height)
        p.dirty = true
      } catch (err) {
        console.error(err)
        entry.failed = true
        setFailed(true)
      }
    }
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)
    const io = new IntersectionObserver(
      (es) => {
        const v = es[es.length - 1].isIntersecting
        if (v === entry.visible) return
        entry.visible = v
        p.visibility?.(v)
      },
      { rootMargin: '120px' },
    )
    io.observe(canvas)
    fit()
    add(entry)
    // Si cambia el movimiento (el sistema o «Play the pieces»), un cuadro nuevo.
    const unsubscribe = subscribe(() => {
      p.dirty = true
    })

    return () => {
      remove(entry)
      unsubscribe()
      ro.disconnect()
      io.disconnect()
      try {
        p.dispose()
      } catch (err) {
        console.error(err)
      }
      piece.current = null
      canvas.width = canvas.height = 0
      canvas.remove()
    }
  }, [host, maxDpr, className, label])

  return { piece, failed }
}
