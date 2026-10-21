import { CAVE, wrapLines } from '@/lib/playground/cave.mjs'
import { cssFamily, loadFont } from '@/lib/playground/fonts'
import type { Piece } from './use-piece'

/**
 * Field: un texto largo como limaduras de hierro y un imán rojo. Cada letra
 * gira para seguir las líneas del campo de un dipolo, se aparta del imán y
 * vuelve a su renglón cuando el imán se va. Canvas 2D con un atlas de glifos
 * (drawImage por letra, sin fillText por cuadro).
 */

const K = {
  reach: 4.6, // alcance del campo, en radios del imán
  hole: 1.3, // radio del hueco que abre el imán, en radios
  drift: 0.22, // corrimiento de las letras a lo largo de las líneas del campo
  stretch: 0.75, // cuánto se alarga una letra alineada (limadura)
  stiff: 55, damp: 11, // resorte de posición
  turn: 70, turnDamp: 13, // resorte de giro
  idleWander: 3, // s sin tocar antes de que el imán vuelva a pasear
  colMin: 720, // px CSS a partir de los cuales el texto va en dos columnas
  maxGlyphs: 3600, // tope de letras (rendimiento en celular)
}

const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

type Glyph = { ch: string; hx: number; hy: number; x: number; y: number; vx: number; vy: number; a: number; va: number; w: number }
type Atlas = { canvas: HTMLCanvasElement; map: Map<string, { x: number; y: number }>; cw: number; ch: number; redY: number }

export type FieldOptions = {
  /** El imán: un botón encima del canvas que se arrastra o se mueve con las flechas. */
  magnet: HTMLButtonElement
  /** Cuántas letras quedaron en la página (cambia con el tamaño). */
  onGlyphs?(count: number): void
}

export function createField(canvas: HTMLCanvasElement, { magnet, onGlyphs }: FieldOptions): Piece {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('This browser has no 2D canvas.')
  const g2 = ctx
  const family = cssFamily('--font-mono', 'ui-monospace, monospace')
  const st = {
    W: 2, H: 2, dpr: 1, cssW: 1, ready: false, placed: false, disposed: false,
    fs: 12, adv: 7, lh: 20, glyphs: [] as Glyph[], atlas: null as Atlas | null,
    orb: { x: 0, y: 0, tx: 0, ty: 0, r: 40, mx: 0, my: -1 },
    drag: null as { id: number; dx: number; dy: number } | null, idle: 99,
  }

  const toCanvas = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (st.W / r.width), y: (e.clientY - r.top) * (st.H / r.height) }
  }
  const clampOrb = () => {
    const o = st.orb
    const m = o.r * 0.6
    o.tx = Math.min(st.W - m, Math.max(m, o.tx))
    o.ty = Math.min(st.H - m, Math.max(m, o.ty))
  }
  const onDown = (e: PointerEvent) => {
    e.preventDefault()
    try {
      magnet.setPointerCapture(e.pointerId)
    } catch {
      // Sin captura, el arrastre sigue.
    }
    const p = toCanvas(e)
    st.drag = { id: e.pointerId, dx: st.orb.x - p.x, dy: st.orb.y - p.y }
    magnet.dataset.grabbing = ''
  }
  const onMove = (e: PointerEvent) => {
    if (!st.drag || e.pointerId !== st.drag.id) return
    const p = toCanvas(e)
    st.orb.tx = p.x + st.drag.dx
    st.orb.ty = p.y + st.drag.dy
    clampOrb()
  }
  const onUp = (e: PointerEvent) => {
    if (!st.drag || e.pointerId !== st.drag.id) return
    st.drag = null
    st.idle = 0
    delete magnet.dataset.grabbing
  }
  const onKey = (e: KeyboardEvent) => {
    const step = st.W * 0.04
    const d = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key]
    if (!d) return
    e.preventDefault()
    st.orb.tx += d[0]
    st.orb.ty += d[1]
    st.idle = 0
    clampOrb()
  }
  // Hasta que el imán tenga lugar en la página, el botón no se ve ni se enfoca.
  magnet.style.visibility = 'hidden'
  magnet.addEventListener('pointerdown', onDown)
  magnet.addEventListener('pointermove', onMove)
  magnet.addEventListener('pointerup', onUp)
  magnet.addEventListener('pointercancel', onUp)
  magnet.addEventListener('keydown', onKey)

  // Como una página de libro: el diálogo renglón por renglón, en una columna
  // en celular y en dos cuando hay ancho, hasta el último párrafo que cabe.
  function layout() {
    const { W, H, dpr } = st
    const two = st.cssW >= K.colMin
    st.fs = Math.round((two ? Math.max(11, Math.min(14, st.cssW / 88)) : Math.max(9.5, Math.min(12, st.cssW / 34))) * dpr)
    g2.font = `${st.fs}px ${family}`
    st.adv = g2.measureText('M').width
    st.lh = Math.round(st.fs * 1.7)
    const margin = Math.round(Math.max(14, st.cssW * 0.045) * dpr)
    const gutter = two ? Math.round(st.cssW * 0.05 * dpr) : 0
    const ncol = two ? 2 : 1
    const colW = (W - 2 * margin - gutter * (ncol - 1)) / ncol
    const cols = Math.max(12, Math.floor(colW / st.adv))
    const rows = Math.max(1, Math.floor((H - 2 * margin) / st.lh))
    const used: string[] = []
    for (const para of CAVE) {
      const lines = wrapLines([para], cols)
      if (used.length + lines.length > rows * ncol) break
      used.push(...lines)
    }
    // Una página diminuta: al menos el principio del primer párrafo.
    if (!used.length) used.push(...wrapLines([CAVE[0]], cols).slice(0, rows * ncol))
    const perCol = Math.ceil(used.length / ncol)
    const y0 = Math.max(margin, (H - Math.min(rows, perCol) * st.lh) / 2) + st.lh / 2
    const glyphs: Glyph[] = []
    used.forEach((ln, k) => {
      const c = Math.floor(k / perCol)
      const row = k % perCol
      const x0 = margin + c * (colW + gutter)
      for (let i = 0; i < ln.length && glyphs.length < K.maxGlyphs; i++) {
        if (ln[i] === ' ') continue
        const hx = x0 + (i + 0.5) * st.adv
        const hy = y0 + row * st.lh
        glyphs.push({ ch: ln[i], hx, hy, x: hx, y: hy, vx: 0, vy: 0, a: 0, va: 0, w: 0 })
      }
    })
    st.glyphs = glyphs
    buildAtlas()
    st.orb.r = Math.round(Math.max(26, Math.min(64, st.cssW * 0.07)) * dpr)
    onGlyphs?.(glyphs.length)
  }

  // Un atlas con dos bandas: las letras en papel y las mismas en rojo.
  function buildAtlas() {
    const chars = [...new Set(st.glyphs.map((g) => g.ch))]
    const cw = Math.ceil(st.adv * 1.5)
    const ch = Math.ceil(st.lh)
    const cols = 16
    const rows = Math.ceil(chars.length / cols)
    if (st.atlas) st.atlas.canvas.width = st.atlas.canvas.height = 0
    const c = document.createElement('canvas')
    c.width = cols * cw
    c.height = rows * ch * 2
    const g = c.getContext('2d')
    if (!g) throw new Error('This browser has no 2D canvas.')
    g.font = `${st.fs}px ${family}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const map = new Map<string, { x: number; y: number }>()
    chars.forEach((chr, k) => {
      const x = (k % cols) * cw
      const y = Math.floor(k / cols) * ch
      map.set(chr, { x, y })
      g.fillStyle = '#d9d2cf'
      g.fillText(chr, x + cw / 2, y + ch / 2)
      g.fillStyle = '#ff3b3b'
      g.fillText(chr, x + cw / 2, y + ch / 2 + rows * ch)
    })
    st.atlas = { canvas: c, map, cw, ch, redY: rows * ch }
  }

  function moveOrb(dt: number, t: number) {
    const o = st.orb
    if (!st.drag) {
      st.idle += dt
      if (st.idle > K.idleWander) {
        // Paseo lento por el texto (Lissajous), para que se vea vivo sin tocarlo.
        const k = 1 - Math.exp(-dt * 0.5)
        o.tx += (st.W * (0.5 + 0.3 * Math.sin(t * 0.11)) - o.tx) * k
        o.ty += (st.H * (0.5 + 0.26 * Math.sin(t * 0.17 + 1.3)) - o.ty) * k
      }
    }
    const k = 1 - Math.exp(-dt * (st.drag ? 24 : 4))
    const nx = o.x + (o.tx - o.x) * k
    const ny = o.y + (o.ty - o.y) * k
    if (dt > 0) {
      const vx = (nx - o.x) / dt
      const vy = (ny - o.y) / dt
      const sp = Math.hypot(vx, vy)
      // El campo gira hacia donde se mueve el imán.
      if (sp > o.r * 0.5) {
        const kk = 1 - Math.exp(-dt * 3.5)
        o.mx += (vx / sp - o.mx) * kk
        o.my += (vy / sp - o.my) * kk
        const ml = Math.hypot(o.mx, o.my) || 1
        o.mx /= ml
        o.my /= ml
      }
    }
    o.x = nx
    o.y = ny
    magnet.style.visibility = ''
    const r = o.r / st.dpr
    magnet.style.width = magnet.style.height = `${2 * r}px`
    magnet.style.transform = `translate(${o.x / st.dpr - r}px, ${o.y / st.dpr - r}px)`
  }

  function physics(dt: number) {
    const o = st.orb
    const R = o.r
    const reach = R * K.reach
    const hole = R * K.hole
    for (const g of st.glyphs) {
      const rx = g.hx - o.x
      const ry = g.hy - o.y
      const d = Math.hypot(rx, ry) || 1e-3
      const ux = rx / d
      const uy = ry / d
      const w = 1 - smooth(hole, reach, d)
      let tx = g.hx
      let ty = g.hy
      let ta = 0
      if (d < reach) {
        // El imán abre un hueco y empuja las letras (r → √(r² + hueco²)
        // conserva la densidad); lejos del campo el texto queda intacto.
        const push = (Math.sqrt(d * d + hole * hole) - d) * (1 - smooth(hole * 1.1, reach, d))
        tx += ux * push
        ty += uy * push
      }
      if (w > 0.002) {
        // Campo de un dipolo: B ∝ 3(m·û)û − m.
        const mu = o.mx * ux + o.my * uy
        let bx = 3 * mu * ux - o.mx
        let by = 3 * mu * uy - o.my
        const bl = Math.hypot(bx, by) || 1
        bx /= bl
        by /= bl
        tx += bx * w * R * K.drift
        ty += by * w * R * K.drift
        // Una limadura no tiene derecho ni revés: de los dos ángulos posibles,
        // el más cercano al actual.
        let a = Math.atan2(by, bx)
        a += Math.PI * Math.round((g.a - a) / Math.PI)
        ta = a * w
      }
      g.vx += ((tx - g.x) * K.stiff - g.vx * K.damp) * dt
      g.vy += ((ty - g.y) * K.stiff - g.vy * K.damp) * dt
      g.x += g.vx * dt
      g.y += g.vy * dt
      g.va += ((ta - g.a) * K.turn - g.va * K.turnDamp) * dt
      g.a += g.va * dt
      g.w += (w - g.w) * Math.min(1, dt * 9)
    }
  }

  function settle() {
    for (let i = 0; i < 150; i++) physics(1 / 60)
  }

  function draw() {
    g2.setTransform(1, 0, 0, 1, 0, 0)
    g2.globalAlpha = 1
    g2.fillStyle = '#000'
    g2.fillRect(0, 0, st.W, st.H)
    if (!st.placed) return
    const A = st.atlas
    if (A) {
      const hw = A.cw / 2
      const hh = A.ch / 2
      for (const g of st.glyphs) {
        const cell = A.map.get(g.ch)
        if (!cell) continue
        const c = Math.cos(g.a)
        const s = Math.sin(g.a)
        const sx = 1 + K.stretch * g.w
        const sy = 1 - 0.3 * g.w
        g2.setTransform(c * sx, s * sx, -s * sy, c * sy, g.x, g.y)
        if (g.w < 0.97) {
          g2.globalAlpha = 1 - g.w
          g2.drawImage(A.canvas, cell.x, cell.y, A.cw, A.ch, -hw, -hh, A.cw, A.ch)
        }
        if (g.w > 0.03) {
          g2.globalAlpha = g.w
          g2.drawImage(A.canvas, cell.x, cell.y + A.redY, A.cw, A.ch, -hw, -hh, A.cw, A.ch)
        }
      }
      g2.setTransform(1, 0, 0, 1, 0, 0)
      g2.globalAlpha = 1
    }
    const o = st.orb
    const r = o.r
    const grad = g2.createRadialGradient(o.x - r * 0.4, o.y - r * 0.44, r * 0.08, o.x, o.y, r)
    grad.addColorStop(0, '#ea5a5a')
    grad.addColorStop(0.55, '#dc2626')
    grad.addColorStop(1, '#6f1212')
    g2.fillStyle = grad
    g2.beginPath()
    g2.arc(o.x, o.y, r, 0, Math.PI * 2)
    g2.fill()
    g2.strokeStyle = 'rgba(255, 255, 255, 0.14)'
    g2.lineWidth = st.dpr
    g2.stroke()
    // El eje del imán: hacia dónde apunta el campo en este momento.
    g2.strokeStyle = 'rgba(255, 255, 255, 0.38)'
    g2.lineWidth = 1.4 * st.dpr
    g2.beginPath()
    g2.moveTo(o.x - o.mx * r * 0.62, o.y - o.my * r * 0.62)
    g2.lineTo(o.x + o.mx * r * 0.62, o.y + o.my * r * 0.62)
    g2.stroke()
    g2.fillStyle = 'rgba(255, 255, 255, 0.7)'
    g2.beginPath()
    g2.arc(o.x + o.mx * r * 0.62, o.y + o.my * r * 0.62, 2.2 * st.dpr, 0, Math.PI * 2)
    g2.fill()
  }

  const piece: Piece = {
    dirty: false,
    resize(w, h, dpr, cssW) {
      const sx = st.W > 2 ? w / st.W : 1
      const sy = st.H > 2 ? h / st.H : 1
      st.W = w
      st.H = h
      st.dpr = dpr
      st.cssW = cssW
      if (st.placed) {
        st.orb.x *= sx
        st.orb.tx *= sx
        st.orb.y *= sy
        st.orb.ty *= sy
      }
      if (!st.ready) return
      layout()
      if (!st.placed) {
        st.orb.x = st.orb.tx = w * 0.62
        st.orb.y = st.orb.ty = h * 0.46
        st.placed = true
      }
      clampOrb()
      moveOrb(0, 0)
      settle()
      piece.dirty = true
    },
    frame(t, dt) {
      if (st.ready && dt > 0) {
        moveOrb(dt, t)
        const n = dt > 1 / 45 ? 2 : 1
        for (let i = 0; i < n; i++) physics(dt / n)
      }
      draw()
    },
    dispose() {
      st.disposed = true
      magnet.removeEventListener('pointerdown', onDown)
      magnet.removeEventListener('pointermove', onMove)
      magnet.removeEventListener('pointerup', onUp)
      magnet.removeEventListener('pointercancel', onUp)
      magnet.removeEventListener('keydown', onKey)
      if (st.atlas) st.atlas.canvas.width = st.atlas.canvas.height = 0
      st.glyphs = []
    },
  }

  loadFont(`16px ${family}`).then(() => {
    if (st.disposed) return
    st.ready = true
    if (st.W > 2) piece.resize(st.W, st.H, st.dpr, st.cssW, 0)
  })
  return piece
}
