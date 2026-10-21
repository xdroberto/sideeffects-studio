import { SOCRATES_SILHOUETTE, buildTarget, createWeaver } from '@/lib/playground/loom.mjs'
import { isRunning } from '@/lib/playground/motion'
import type { Piece } from './use-piece'

/**
 * Loom: un solo hilo rojo y 300 clavos en un aro tejen un retrato (string
 * art). En cada paso el hilo va al clavo cuya línea más acerca el tejido a la
 * imagen (loom.mjs). La construcción es el espectáculo: empieza hilo por hilo
 * con la aguja a la vista, los clavos destellan al recibir el hilo y el ritmo
 * acelera; mantener presionado teje más rápido.
 */

const K = {
  pins: 300, // clavos del aro
  size: 300, // resolución con la que el telar «ve» la imagen
  add: 0.03, // luz que suma cada hilo donde pasa
  light: 1.15, // qué tanto de la luz que el telar calcula llega a la pantalla
  // Ritmo: hilos por segundo según los segundos tejidos (arranca lento, acelera).
  speed: (t: number) => Math.min(300, 2.5 + 0.35 * t * t),
  showNeedle: 8, // por debajo de estos hilos/s, cada hilo se ve trazar
  hold: 6, // cuánto acelera mantener presionado
  trail: 24, // hilos recientes que brillan
  still: 150, // hilos por cuadro al tejer de golpe en reposo
}

// El grabado ya viene recortado a la cabeza y la barba (public/playground).
const SOCRATES_URL = '/playground/socrates-cunego-1783.jpg'

export type LoomSource = 'socrates' | File

export type LoomCount = {
  label: string
  done: number
  finished: boolean
  meters: number
  pins: number
  /** Mientras la aguja traza, va del clavo actual al siguiente; si no, el último hilo. */
  from: number
  to: number
}

export type LoomPiece = Piece & {
  weave(source: LoomSource): void
  restart(): void
}

export type LoomOptions = {
  onCount?(count: LoomCount): void
  /** La imagen no se pudo abrir (una foto en un formato que el navegador no lee). */
  onError?(): void
}

export function createLoom(canvas: HTMLCanvasElement, { onCount, onError }: LoomOptions = {}): LoomPiece {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('This browser has no 2D canvas.')
  const g2 = ctx
  const N = K.size
  const layer = document.createElement('canvas')
  const lctx = layer.getContext('2d')
  const scan = document.createElement('canvas')
  scan.width = scan.height = N
  const sctx = scan.getContext('2d', { willReadFrequently: true })
  if (!lctx || !sctx) throw new Error('This browser has no 2D canvas.')
  const heat = new Float32Array(K.pins)
  const st = {
    W: 2, H: 2, dpr: 1, cx: 0, cy: 0, R: 1,
    weaver: createWeaver({ pins: K.pins, size: N, add: K.add }),
    target: null as Float32Array<ArrayBuffer> | null, label: 'Socrates', ready: false, disposed: false, load: 0,
    elapsed: 0, acc: 0, drawn: 0, fast: false, instant: false,
    anim: null as { q: number; t: number; dur: number } | null,
    socrates: null as HTMLImageElement | null,
  }

  const pinsXY = () => st.weaver.pins
  const toDisp = (p: [number, number]) => [st.cx + ((p[0] - N / 2) / (N / 2)) * st.R, st.cy + ((p[1] - N / 2) / (N / 2)) * st.R]

  function clearLayer() {
    lctx!.setTransform(1, 0, 0, 1, 0, 0)
    lctx!.clearRect(0, 0, layer.width, layer.height)
  }

  // Empieza de cero con la imagen actual. En reposo («reducir movimiento») se
  // teje de golpe, en tandas por cuadro, y se muestra terminado.
  function reset() {
    if (!st.target) return
    st.weaver.setTarget(st.target)
    heat.fill(0)
    st.elapsed = 0
    st.acc = 0
    st.anim = null
    st.drawn = 0
    clearLayer()
    st.instant = !isRunning()
    piece.dirty = true
  }

  // La imagen se pasa a gris en N×N: el grabado entero (ya es cuadrado), una
  // foto recortada al cuadrado del centro.
  function scanImage(img: CanvasImageSource, iw: number, ih: number) {
    const c = sctx!
    c.fillStyle = '#000'
    c.fillRect(0, 0, N, N)
    const side = Math.min(iw, ih)
    c.drawImage(img, (iw - side) / 2, (ih - side) / 2, side, side, 0, 0, N, N)
    const d = c.getImageData(0, 0, N, N).data
    const lum = new Float32Array(N * N)
    for (let i = 0; i < N * N; i++) lum[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255
    return lum
  }

  function applySocrates(img: HTMLImageElement) {
    // La silueta trazada a mano separa la figura del papel; el contorno lo
    // dibuja la envolvente de los hilos y por dentro brilla la cara.
    const lum = scanImage(img, img.naturalWidth, img.naturalHeight)
    st.target = buildTarget(lum, N, { mask: SOCRATES_SILHOUETTE, outline: 1, tone: 0.3, soften: 1 })
    st.weaver = createWeaver({ pins: K.pins, size: N, add: K.add, minThreads: 2500 })
    st.label = 'Socrates'
    st.ready = true
    reset()
  }

  function weave(source: LoomSource) {
    const ticket = ++st.load
    if (source === 'socrates') {
      if (st.socrates) return applySocrates(st.socrates)
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        if (st.disposed || ticket !== st.load) return
        st.socrates = img
        applySocrates(img)
      }
      img.onerror = () => {
        if (!st.disposed && ticket === st.load) onError?.()
      }
      img.src = SOCRATES_URL
      return
    }
    // Una foto del visitante: se lee en el navegador, no se sube a ningún lado.
    // Decodificada ya reducida: el telar la ve a 300 px y una foto de 48 MP serían ~190 MB.
    createImageBitmap(source, { resizeWidth: 1200, resizeQuality: 'high' })
      .then((bmp) => {
        if (st.disposed || ticket !== st.load) return bmp.close()
        const lum = scanImage(bmp, bmp.width, bmp.height)
        bmp.close()
        st.target = buildTarget(lum, N, {})
        st.weaver = createWeaver({ pins: K.pins, size: N, add: K.add, minThreads: 3000 })
        st.label = 'your photo'
        st.ready = true
        reset()
      })
      .catch(() => {
        if (!st.disposed && ticket === st.load) onError?.()
      })
  }

  // El ritmo: lento con la aguja a la vista, luego cada vez más rápido.
  function advance(dt: number) {
    const w = st.weaver
    const mult = st.fast ? K.hold : 1
    st.elapsed += dt * mult
    const speed = K.speed(st.elapsed) * mult
    if (st.anim) {
      st.anim.t += dt
      if (st.anim.t >= st.anim.dur) {
        w.commit(st.anim.q)
        heat[st.anim.q] = 1
        st.anim = null
      }
      return
    }
    if (speed < K.showNeedle) {
      const q = w.next()
      if (q >= 0) st.anim = { q, t: 0, dur: 1 / speed }
      return
    }
    st.acc += speed * dt
    const n = Math.floor(st.acc)
    st.acc -= n
    weaveN(n)
  }

  function weaveN(count: number) {
    const w = st.weaver
    for (let c = 0; c < count; c++) {
      const q = w.next()
      if (q < 0) break
      w.commit(q)
      heat[q] = 1
    }
  }

  function paintNew() {
    // Cada hilo suma en pantalla la misma luz que el telar le sumó a su
    // imagen: un píxel del telar mide R/(N/2) píxeles en pantalla.
    const seq = st.weaver.seq
    const pins = pinsXY()
    const lw = Math.max(0.6, st.dpr * 0.6)
    const alpha = Math.min(0.3, Math.max(0.04, (K.light * K.add * (st.R / (N / 2))) / lw))
    const c = lctx!
    c.globalCompositeOperation = 'lighter'
    c.strokeStyle = `rgba(255, 42, 42, ${alpha.toFixed(3)})`
    c.lineWidth = lw
    c.beginPath()
    for (let k = Math.max(1, st.drawn); k < seq.length; k++) {
      const a = toDisp(pins[seq[k - 1]])
      const b = toDisp(pins[seq[k]])
      c.moveTo(a[0], a[1])
      c.lineTo(b[0], b[1])
    }
    c.stroke()
    st.drawn = seq.length
  }

  function draw(dt: number) {
    const { W, H, dpr } = st
    const w = st.weaver
    const seq = w.seq
    const pins = pinsXY()
    g2.setTransform(1, 0, 0, 1, 0, 0)
    g2.globalCompositeOperation = 'source-over'
    g2.fillStyle = '#000'
    g2.fillRect(0, 0, W, H)
    // El aro.
    g2.strokeStyle = 'rgba(239, 232, 229, 0.1)'
    g2.lineWidth = Math.max(1, dpr)
    g2.beginPath()
    g2.arc(st.cx, st.cy, st.R * 1.018, 0, Math.PI * 2)
    g2.stroke()
    if (st.ready) {
      paintNew()
      g2.drawImage(layer, 0, 0)
    }
    const weaving = st.ready && !w.finished
    // Los hilos más recientes brillan y se apagan al quedar atrás.
    if (weaving && seq.length > 1) {
      g2.globalCompositeOperation = 'lighter'
      g2.lineWidth = Math.max(0.8, dpr * 0.8)
      const from = Math.max(1, seq.length - K.trail)
      for (let k = from; k < seq.length; k++) {
        const age = (seq.length - k) / K.trail
        g2.strokeStyle = `rgba(255, 150, 140, ${0.5 * (1 - age)})`
        const a = toDisp(pins[seq[k - 1]])
        const b = toDisp(pins[seq[k]])
        g2.beginPath()
        g2.moveTo(a[0], a[1])
        g2.lineTo(b[0], b[1])
        g2.stroke()
      }
      g2.globalCompositeOperation = 'source-over'
    }
    // Los clavos: tenues, y encendidos un momento al recibir el hilo.
    const r = Math.max(0.8, 1.1 * dpr)
    g2.fillStyle = 'rgba(239, 232, 229, 0.28)'
    g2.beginPath()
    for (const p of pins) {
      const [x, y] = toDisp(p)
      g2.moveTo(x + r, y)
      g2.arc(x, y, r, 0, Math.PI * 2)
    }
    g2.fill()
    for (let k = 0; k < K.pins; k++) {
      if (heat[k] < 0.03) continue
      const [x, y] = toDisp(pins[k])
      g2.fillStyle = `rgba(255, 220, 210, ${heat[k]})`
      g2.beginPath()
      g2.arc(x, y, r * (1 + 1.6 * heat[k]), 0, Math.PI * 2)
      g2.fill()
      heat[k] *= Math.exp(-dt * 2.5)
    }
    // La aguja: traza el hilo en curso cuando el ritmo es lento.
    if (weaving) {
      const a = toDisp(pins[w.pin])
      let tip = a
      if (st.anim) {
        const b = toDisp(pins[st.anim.q])
        const u = Math.min(1, st.anim.t / st.anim.dur)
        const e = u * u * (3 - 2 * u)
        tip = [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e]
        g2.strokeStyle = 'rgba(255, 205, 195, 0.95)'
        g2.lineWidth = Math.max(1, dpr)
        g2.beginPath()
        g2.moveTo(a[0], a[1])
        g2.lineTo(tip[0], tip[1])
        g2.stroke()
      }
      g2.fillStyle = '#fff'
      g2.beginPath()
      g2.arc(tip[0], tip[1], 2.4 * dpr, 0, Math.PI * 2)
      g2.fill()
    }
    if (st.ready && onCount) {
      const n = seq.length
      onCount({
        label: st.label,
        done: w.done,
        finished: w.finished,
        meters: w.meters,
        pins: K.pins,
        from: st.anim ? w.pin : seq[Math.max(0, n - 2)],
        to: st.anim ? st.anim.q : seq[n - 1],
      })
    }
  }

  // Mantener presionado sobre el telar teje más rápido.
  const onDown = () => {
    st.fast = true
  }
  const slow = () => {
    st.fast = false
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', slow)
  canvas.addEventListener('pointercancel', slow)
  canvas.addEventListener('pointerleave', slow)

  const piece: LoomPiece = {
    dirty: false,
    resize(w, h, dpr) {
      st.W = w
      st.H = h
      st.dpr = dpr
      st.cx = w / 2
      st.cy = h / 2
      st.R = Math.min(w, h) * 0.45
      layer.width = w
      layer.height = h
      st.drawn = 0 // repinta todos los hilos a la nueva escala
      piece.dirty = true
    },
    frame(_t, dt) {
      const w = st.weaver
      if (st.ready && st.instant && !w.finished) {
        // De golpe, sin tareas largas: unas tandas por cuadro y se muestra al terminar.
        weaveN(K.still)
        if (w.finished) {
          heat.fill(0)
          st.instant = false
        } else {
          piece.dirty = true
          return
        }
      }
      if (st.ready && dt > 0 && !w.finished) advance(dt)
      draw(dt)
    },
    weave,
    restart() {
      reset()
    },
    dispose() {
      st.disposed = true
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', slow)
      canvas.removeEventListener('pointercancel', slow)
      canvas.removeEventListener('pointerleave', slow)
      layer.width = layer.height = 0
      scan.width = scan.height = 0
    },
  }
  return piece
}
