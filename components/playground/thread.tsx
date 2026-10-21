'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { lengthAtY, threadPath } from '@/lib/playground/thread.mjs'
import { isRunning, subscribe } from '@/lib/playground/motion'

/**
 * El hilo rojo de Playground: sale del carrete, entra a cada pieza por una
 * de sus anclas y sale por otra (la pieza misma es el tramo de en medio).
 * Las anclas son elementos `data-thread` dentro del <article>; el hilo se
 * dibuja con el scroll (el punto de lectura va al 62 % de la ventana) y cada
 * clavito se enciende cuando el hilo llega. Con «reducir movimiento», entero.
 */

const SEGMENTS = [
  ['spool', 'field-in'],
  ['field-out', 'harp-in'],
  ['harp-out', 'loom-in'],
] as const
const READ = 0.62

type Point = { x: number; y: number }
type Geometry = { w: number; h: number; paths: string[]; pins: (Point & { id: string })[] }
type Sample = { len: number; y: number }

export function Thread() {
  const svg = useRef<SVGSVGElement>(null)
  const [geo, setGeo] = useState<Geometry | null>(null)
  const samples = useRef<{ total: number; points: Sample[] }[]>([])

  // Las anclas, medidas respecto al <article>, cada vez que cambia su tamaño.
  useEffect(() => {
    const article = svg.current?.parentElement
    if (!article) return
    const measure = () => {
      const box = article.getBoundingClientRect()
      const at = (id: string): Point | null => {
        const el = article.querySelector<HTMLElement>(`[data-thread="${id}"]`)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }
      }
      const paths: string[] = []
      const pins: Geometry['pins'] = []
      for (const [a, b] of SEGMENTS) {
        const p = at(a)
        const q = at(b)
        if (!p || !q) continue
        paths.push(threadPath([p, q]))
        pins.push({ id: a, ...p }, { id: b, ...q })
      }
      setGeo({ w: box.width, h: box.height, paths, pins })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(article)
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure, () => {})
    measure()
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // Con los paths en pantalla: su largo y unas muestras (largo, altura) para el scroll.
  useLayoutEffect(() => {
    const el = svg.current
    if (!el || !geo) return
    samples.current = [...el.querySelectorAll<SVGPathElement>('path')].map((path) => {
      const total = path.getTotalLength()
      const points: Sample[] = []
      for (let k = 0; k <= 64; k++) {
        const len = (total * k) / 64
        points.push({ len, y: path.getPointAtLength(len).y })
      }
      path.style.strokeDasharray = `${total} ${total}`
      return { total, points }
    })
  }, [geo])

  // El dibujo con el scroll.
  useEffect(() => {
    const el = svg.current
    if (!el || !geo) return
    let raf = 0
    const draw = () => {
      raf = 0
      const article = el.parentElement
      if (!article) return
      const read = window.innerHeight * READ - article.getBoundingClientRect().top
      const whole = !isRunning()
      el.querySelectorAll<SVGPathElement>('path').forEach((path, i) => {
        const s = samples.current[i]
        if (!s) return
        const drawn = whole ? s.total : lengthAtY(s.points, read)
        path.style.strokeDashoffset = `${s.total - drawn}`
      })
      el.querySelectorAll<SVGGElement>('[data-pin]').forEach((pin) => {
        const lit = whole || read >= Number(pin.dataset.y)
        if (lit !== (pin.dataset.lit === 'true')) pin.dataset.lit = String(lit)
      })
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const unsubscribe = subscribe(schedule)
    draw()
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      unsubscribe()
      cancelAnimationFrame(raf)
    }
  }, [geo])

  return (
    <svg
      ref={svg}
      aria-hidden
      width={geo?.w ?? 0}
      height={geo?.h ?? 0}
      viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : undefined}
      className="pointer-events-none absolute left-0 top-0 z-[3] overflow-visible text-signal"
    >
      {geo?.paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      ))}
      {geo?.pins.map((p) => (
        <g key={p.id} data-pin data-y={p.y} data-lit="false" className="group" transform={`translate(${p.x} ${p.y})`}>
          {/* El clavito: un aro tenue que, al llegar el hilo, se vuelve punta roja con su halo. */}
          <circle r={3.5} className="fill-canvas stroke-white/30 transition-[stroke] duration-300 group-data-[lit=true]:stroke-signal" strokeWidth={1.25} />
          <circle
            r={3.5}
            className="origin-center scale-0 [transform-box:fill-box] fill-signal transition-transform duration-300 ease-out group-data-[lit=true]:scale-100"
          />
          <circle
            r={9}
            className="origin-center scale-0 [transform-box:fill-box] fill-signal/20 transition-transform duration-500 ease-out group-data-[lit=true]:scale-100"
          />
        </g>
      ))}
    </svg>
  )
}
