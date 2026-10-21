import { BHUPALI, SA, bell, degree, degreeIn, isClean, pluck as pluckWave, room, tick } from '@/lib/playground/sound.mjs'
import { chimeDegree, createNoteGate, createPeg } from '@/lib/playground/harp-logic.mjs'
import { isRunning } from '@/lib/playground/motion'
import type { Piece } from './use-piece'

/**
 * Harp: las 200 cuerdas del diamante del home se vuelven un instrumento.
 * Cruzar las cuerdas con el puntero las rasguea; cada una vibra con su modo
 * según dónde la tocaste. El sonido se pide antes de sonar: sitar con tanpura
 * de fondo, en Malkauns. Un rasgueo suena como arpegio (harp-logic.mjs). Al
 * salir de pantalla, con la pestaña oculta o al salir de la página, se calla.
 *
 * Huevo de pascua, guiño a Monument Valley: una clavija en la punta de
 * arriba. Cada cuarto de vuelta suena una campana y el diamante gira sobre su
 * eje; con la vuelta completa el instrumento queda «afinado»: el diamante se
 * abre en una gema isométrica, suena una resolución y las cuerdas pasan a
 * campanas en Bhupali. Otra vuelta lo regresa.
 */

const K = {
  n: 100, // puntos de la onda; cada uno ata dos cuerdas (a cada ápice)
  amp: 0.6, apex: 3, // la geometría del hero
  maxPx: 12, // vibración máxima, en px CSS
  decay: [1.2, 3], // s de caída visual: cuerdas cortas → largas
  reach: 0.9, // parte de la cuerda que responde, desde la onda
  grid: 0.08, // s mínimo entre notas
  maxLag: 0.6, // s: una nota que tendría que esperar más que esto no suena
  repeat: 0.25, // s antes de que la misma nota vuelva a sonar
  quiet: 0.85, // con sonido, qué tan fuerte vibran las cuerdas que no sonaron
  selfEvery: 3.4, // s entre pulsos solos sin sonido
  melodyEvery: [4, 7], // s entre notas cuando se toca sola con sonido
  voices: 18, // polifonía máxima
  gain: 0.6, // volumen general
  drone: 0.07, // volumen de la tanpura (muy por debajo de las cuerdas)
  wet: 0.38, // reverberación
  bell: 0.45, // las campanas suenan más llenas que el sitar: van más bajas
  // Huevo de pascua
  pegR: 9, pegLift: 30, pegHit: 28, // clavija: radio, altura sobre el ápice y área de toque (px CSS)
  notchTurn: Math.PI / 8, // cada cuarto de vuelta gira el diamante 22.5°
  unwind: 7, // s sin tocar antes de que una vuelta a medias regrese
  wiggleEvery: 5, // s entre guiños de la clavija mientras nadie la ha girado
  gemTilt: 0.46, // rad: la cámara mira la gema desde arriba (vista isométrica)
  gemSpin: 0.22, // rad/s: la gema gira sola
}
const QUARTER = Math.PI / 2

// Las sílabas de cada escala, para el lector de notas (komal en minúscula).
const SARGAM = { malkauns: ['Sa', 'ga', 'Ma', 'dha', 'ni'], bhupali: ['Sa', 'Re', 'Ga', 'Pa', 'Dha'] }

type Voice = 'sitar' | 'tanpura' | 'campana' | 'tick'

type Str = {
  i: number; x: number; top: boolean; deg: number; f: number; fTuned: number; vis: number; tau: number
  env: number; amp: number; u: number; sgn: number; ph: number; ax: number; ay: number; bx: number; by: number; z: number
}

type Audio = {
  ac: AudioContext; master: GainNode; bus: GainNode; cache: Map<string, AudioBuffer | null>
  voices: AudioBufferSourceNode[]; droneNext: number; droneStep: number; timer: number
}

export type HarpPiece = Piece & {
  /** Con sonido o en silencio. Devuelve si quedó sonando (false si el navegador no tiene Web Audio). */
  setSound(on: boolean): boolean
}

export type HarpOptions = {
  /** La clavija para el teclado: un botón invisible encima (sin eventos de puntero). */
  peg: HTMLButtonElement
  /** Cada nota que suena, en sargam. */
  onNote?(sargam: string): void
  /** El visitante ya dijo que sí en esta sesión: el sonido arranca con su primer toque. */
  wantsSound?: boolean
}

export function createHarp(canvas: HTMLCanvasElement, { peg: pegButton, onNote, wantsSound = false }: HarpOptions): HarpPiece {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('This browser has no 2D canvas.')
  const g2 = ctx
  const st = {
    W: 2, H: 2, dpr: 1, s: 1, cx: 0, cy: 0, topY: 0, selfT: 1.6, idle: 99, melodyT: 2.5,
    last: null as { id: number; x: number; y: number; time: number } | null,
    audio: null as Audio | null, consent: wantsSound, muted: false, visible: true, tuned: false, disposed: false,
  }
  const pending = new Set<number>()
  // La gema: g = 0 diamante plano, 1 gema; theta = giro sobre el eje vertical.
  const gem = { g: 0, target: 0, theta: 0, thetaTarget: 0 }
  // La clavija: la lógica cuenta las muescas; aquí vive lo que se ve.
  const logic = createPeg({ hysteresis: 0.65 })
  const peg = { ang: 0, drag: null as { id: number; last: number; moved: number } | null, hover: false, touched: false, idleT: 0, wiggle: 0, wiggleT: 3 }
  const gate = createNoteGate({ grid: K.grid, maxLag: K.maxLag, repeat: K.repeat })

  const strings: Str[] = []
  for (let half = 0; half < 2; half++) {
    for (let i = 0; i < K.n; i++) {
      const x = (i / (K.n - 1)) * 10 - 5
      const len = Math.hypot(x, K.apex)
      const deg = Math.round((1 - (len - K.apex) / (Math.hypot(5, K.apex) - K.apex)) * 9)
      const base = half === 0 ? SA * 2 : SA // las de arriba, una octava más agudas
      strings.push({
        i, x, top: half === 0, deg,
        f: degree(base, deg),
        fTuned: degreeIn(BHUPALI, base, deg),
        vis: 3 + 0.5 * deg, // Hz de la vibración que se ve (la real no cabe en 60 cuadros)
        tau: K.decay[1] - ((K.decay[1] - K.decay[0]) * deg) / 9,
        env: 0, amp: 0, u: 0.5, sgn: 1, ph: 0, ax: 0, ay: 0, bx: 0, by: 0, z: 0,
      })
    }
  }

  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

  // La onda vive en el plano z = 0. Para la gema, cada punto se abre hacia
  // adelante o hacia atrás (alternados) hasta formar un anillo: una línea es
  // un anillo visto de canto. Luego se gira y se proyecta con la cámara inclinada.
  function geometry(t: number) {
    const g = ease(gem.g)
    const tilt = K.gemTilt * g
    const ct = Math.cos(gem.theta)
    const stt = Math.sin(gem.theta)
    const ca = Math.cos(tilt)
    const sa = Math.sin(tilt)
    const proj = (x: number, y: number, z: number) => {
      const xr = x * ct + z * stt
      const zr = -x * stt + z * ct
      return [st.cx + xr * st.s, st.cy - (y * ca - zr * sa) * st.s, zr]
    }
    const top = proj(0, K.apex, 0)
    const bot = proj(0, -K.apex, 0)
    st.topY = top[1]
    for (let i = 0; i < K.n; i++) {
      const x = (i / (K.n - 1)) * 10 - 5
      const z = (i % 2 ? -1 : 1) * Math.sqrt(Math.max(0, 25 - x * x)) * g
      const flat = Math.sin(x + t * 0.6) * K.amp
      const ring = Math.sin(3 * Math.atan2(z, x) + t * 0.6) * K.amp * 0.3
      const [px, py, pz] = proj(x, flat + (ring - flat) * g, z)
      for (const s of [strings[i], strings[K.n + i]]) {
        s.ax = px
        s.ay = py
        s.z = pz
        const b = s.top ? top : bot
        s.bx = b[0]
        s.by = b[1]
      }
    }
  }

  const audible = () => !!st.audio && st.consent && !st.muted && st.visible && !document.hidden
  const fOf = (s: Str) => (st.tuned ? s.fTuned : s.f)

  // Una nota a la vez: la compuerta le da su turno o la deja sin sonar.
  function requestNote(s: Str, vel: number, delay: number) {
    const A = st.audio
    if (!A) return false
    const now = A.ac.currentTime
    const f = fOf(s)
    const at = gate.request(f, now, delay)
    if (at === null) return false
    if (st.tuned) play(f, vel, s.x / 5, at - now, 'campana', (0.1 + 0.32 * vel) * K.bell)
    else play(f, vel, s.x / 5, at - now)
    // El lector de notas la muestra cuando suena, no cuando se pide.
    const name = (st.tuned ? SARGAM.bhupali : SARGAM.malkauns)[s.deg % 5]
    const id = window.setTimeout(() => {
      pending.delete(id)
      if (!st.disposed) onNote?.(name)
    }, Math.max(0, (at - now) * 1000))
    pending.add(id)
    return true
  }

  function pluck(s: Str, strength: number, u: number, sgn: number, delay = 0) {
    const sounded = audible() && requestNote(s, 0.2 + 0.3 * strength, delay)
    // Con sonido, las cuerdas que no suenan vibran un poco menos: se distingue la nota.
    const level = !audible() || sounded ? strength : strength * K.quiet
    const rest = s.amp * s.env
    s.env = 1
    s.amp = Math.max(rest * 0.6, level)
    s.u = u
    s.sgn = sgn || 1
    s.ph = 0
  }

  // Cruce de segmentos: el trazo del puntero (p1→p2) contra una cuerda (a→b).
  function cross(x1: number, y1: number, x2: number, y2: number, s: Str) {
    const dxp = x2 - x1
    const dyp = y2 - y1
    const dxs = s.bx - s.ax
    const dys = s.by - s.ay
    const d = dxp * dys - dyp * dxs
    if (Math.abs(d) < 1e-9) return null
    const ua = ((s.ax - x1) * dys - (s.ay - y1) * dxs) / d
    const ub = ((s.ax - x1) * dyp - (s.ay - y1) * dxp) / d
    if (ua < 0 || ua > 1 || ub < 0.03 || ub > K.reach) return null
    return { ua, u: ub, sgn: Math.sign(d) }
  }

  // --- La clavija ----------------------------------------------------------
  const pegCenter = () => [st.cx, st.topY - K.pegLift * st.dpr]
  const nearPeg = (p: { x: number; y: number }) => {
    const [x, y] = pegCenter()
    return Math.hypot(p.x - x, p.y - y) < K.pegHit * st.dpr
  }

  // En reposo («reducir movimiento») los cambios llegan sin animación.
  function settle() {
    if (isRunning()) return
    peg.ang = logic.state().ang
    gem.g = gem.target
    gem.theta = gem.thetaTarget
    piece.dirty = true
  }

  function chime(step: number) {
    if (!audible()) return
    play(0, 0, 0, 0, 'tick', 0.16)
    // Cada cuarto de vuelta, una campana más arriba: Sa, Re, Ga. De regreso al
    // punto de partida (paso 0) solo suena el clic.
    const d = chimeDegree(step)
    if (d !== null) play(degreeIn(BHUPALI, SA * 2, d), 0.5, 0, 0.01, 'campana', 0.14)
  }

  function resolve(toTuned: boolean) {
    if (!audible()) return
    if (toTuned) {
      // La resolución: la escala nueva hacia arriba y un Sa grave que la sostiene.
      ;[3, 4, 5, 6, 7, 8].forEach((d, k) => play(degreeIn(BHUPALI, SA * 2, d), 0.5, (k - 2.5) / 4, 0.05 + k * 0.1, 'campana', 0.16 - k * 0.012))
      play(SA, 0.5, 0, 0.05, 'campana', 0.12)
    } else {
      // De regreso: el raga de siempre hacia abajo, en sitar.
      ;[5, 4, 3, 2, 1, 0].forEach((d, k) => play(degree(SA * 2, d), 0.6, (2.5 - k) / 4, 0.05 + k * 0.12))
    }
  }

  type PegEvent = ReturnType<typeof logic.tap>[number]
  function apply(events: PegEvent[], sound = true) {
    for (const e of events) {
      peg.idleT = 0
      if (sound) peg.touched = true
      if (e.type === 'complete') {
        st.tuned = e.tuned
        gem.target = st.tuned ? 1 : 0
        if (st.tuned) gem.thetaTarget += e.dir * K.notchTurn
        else gem.thetaTarget = Math.ceil(gem.theta / Math.PI + 0.01) * Math.PI // de frente otra vez
        if (st.audio) st.audio.droneNext = 0
        if (sound && audible()) play(0, 0, 0, 0, 'tick', 0.16)
        if (sound) resolve(st.tuned)
      } else {
        if (!st.tuned) gem.thetaTarget += e.dir * K.notchTurn
        if (sound) chime(e.step)
      }
    }
    if (events.length) settle()
  }

  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
  const toCanvas = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (st.W / r.width), y: (e.clientY - r.top) * (st.H / r.height) }
  }
  const angleAt = (p: { x: number; y: number }) => {
    const [x, y] = pegCenter()
    return Math.atan2(p.y - y, p.x - x)
  }

  const onMove = (e: PointerEvent) => {
    const p = toCanvas(e)
    if (peg.drag && peg.drag.id === e.pointerId) {
      // Girar arrastrando alrededor de la clavija; cada cuarto de vuelta, un paso.
      const a = angleAt(p)
      const d = wrap(a - peg.drag.last)
      peg.drag.last = a
      peg.drag.moved += Math.abs(d)
      apply(logic.drag(d))
      peg.ang = logic.state().ang
      piece.dirty = true
      return
    }
    const hover = nearPeg(p)
    if (hover !== peg.hover) {
      peg.hover = hover
      canvas.style.cursor = hover ? 'grab' : ''
      piece.dirty = true
    }
    const q = st.last
    if (q && q.id === e.pointerId) {
      const dist = Math.hypot(p.x - q.x, p.y - q.y)
      if (dist > 0.5) {
        const secs = Math.max(0.004, (e.timeStamp - q.time) / 1000)
        const speed = dist / st.dpr / secs
        const strength = Math.min(1, Math.max(0.25, speed / 1200))
        const hits: [{ ua: number; u: number; sgn: number }, Str][] = []
        for (const s of strings) {
          const c = cross(q.x, q.y, p.x, p.y, s)
          if (c) hits.push([c, s])
        }
        // Un rasgueo suena como glissando: cada cuerda en el orden y el
        // momento en que el puntero la cruzó, no todas de golpe.
        hits.sort((a, b) => a[0].ua - b[0].ua)
        for (const [c, s] of hits) pluck(s, strength, c.u, c.sgn, c.ua * secs)
        if (hits.length) st.idle = 0
      }
    }
    st.last = { id: e.pointerId, x: p.x, y: p.y, time: e.timeStamp }
  }
  const onDown = (e: PointerEvent) => {
    unlock()
    const p = toCanvas(e)
    if (nearPeg(p)) {
      peg.drag = { id: e.pointerId, last: angleAt(p), moved: 0 }
      canvas.style.cursor = 'grabbing'
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        // Sin captura, el giro sigue.
      }
      return
    }
    st.last = { id: e.pointerId, x: p.x, y: p.y, time: e.timeStamp }
    // Un clic o un toque pulsa la cuerda más cercana.
    let best: { s: Str; u: number } | null = null
    let bd = 10 * st.dpr
    for (const s of strings) {
      const dx = s.bx - s.ax
      const dy = s.by - s.ay
      const l2 = dx * dx + dy * dy || 1
      const u = Math.min(K.reach, Math.max(0.03, ((p.x - s.ax) * dx + (p.y - s.ay) * dy) / l2))
      const d = Math.hypot(s.ax + dx * u - p.x, s.ay + dy * u - p.y)
      if (d < bd) {
        bd = d
        best = { s, u }
      }
    }
    if (best) {
      pluck(best.s, 0.55, best.u, 1)
      st.idle = 0
    }
  }
  const onUp = (e: PointerEvent) => {
    unlock()
    if (!peg.drag || peg.drag.id !== e.pointerId) return
    const tapped = peg.drag.moved < 0.25
    peg.drag = null
    canvas.style.cursor = peg.hover ? 'grab' : ''
    // Un toque es un cuarto de vuelta; al soltar un giro, la clavija se asienta en su muesca.
    if (tapped) apply(logic.tap())
    else logic.release()
    settle()
  }
  const onCancel = (e: PointerEvent) => {
    if (peg.drag && peg.drag.id === e.pointerId) {
      peg.drag = null
      logic.release()
    }
    st.last = null
  }
  const onLeave = () => {
    st.last = null
  }
  // Con el teclado, la clavija es un botón: cada Enter o Espacio, un cuarto de vuelta.
  const onPegClick = () => {
    unlock()
    apply(logic.tap())
  }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onCancel)
  canvas.addEventListener('pointerleave', onLeave)
  pegButton.addEventListener('click', onPegClick)

  // --- Audio ----------------------------------------------------------------
  // iOS calla Web Audio con el teléfono en silencio: la sesión de audio de una
  // página es «ambient» por omisión. Con el permiso del visitante el Harp es
  // reproducción, como un video (navigator.audioSession de Safari, iOS 17+);
  // sin sonido, la sesión regresa a la de siempre.
  let session = false
  function playbackSession(on: boolean) {
    const nav = navigator as Navigator & { audioSession?: { type: string } }
    if (on === session || !nav.audioSession) return
    session = on
    try {
      nav.audioSession.type = on ? 'playback' : 'auto'
    } catch {
      // Un tipo que este navegador no conoce: queda la sesión de siempre.
    }
  }

  function buffer(f: number, voice: Voice) {
    const A = st.audio as Audio
    const key = `${voice}:${Math.round(f * 10)}`
    if (A.cache.has(key)) return A.cache.get(key) ?? null
    const sr = A.ac.sampleRate
    const data = voice === 'campana' ? bell(sr, f) : voice === 'tick' ? tick(sr) : pluckWave(sr, f, voice)
    // Un solo NaN que llegue al compresor o a la reverberación los deja en
    // silencio para siempre: un sonido dañado no se toca.
    let buf: AudioBuffer | null = null
    if (isClean(data)) {
      buf = A.ac.createBuffer(1, data.length, sr)
      buf.copyToChannel(data, 0)
    }
    A.cache.set(key, buf)
    return buf
  }

  function play(f: number, vel: number, pan: number, delay: number, voice: Voice = 'sitar', gain = 0.1 + 0.32 * vel) {
    const A = st.audio
    if (!A) return
    const sound = buffer(f, voice)
    if (!sound) return
    const t0 = A.ac.currentTime + (delay || 0)
    const src = A.ac.createBufferSource()
    src.buffer = sound
    // El sitar entra con un leve deslizamiento hacia la nota (meend).
    if (voice === 'sitar') {
      src.playbackRate.setValueAtTime(0.985, t0)
      src.playbackRate.linearRampToValueAtTime(1, t0 + 0.08)
    }
    const g = A.ac.createGain()
    g.gain.value = gain
    src.connect(g)
    let out: AudioNode = g
    if (A.ac.createStereoPanner) {
      const p = A.ac.createStereoPanner()
      p.pan.value = Math.max(-0.75, Math.min(0.75, pan * 0.75))
      g.connect(p)
      out = p
    }
    out.connect(A.bus)
    src.start(t0)
    A.voices.push(src)
    src.onended = () => {
      const i = A.voices.indexOf(src)
      if (i >= 0) A.voices.splice(i, 1)
    }
    while (A.voices.length > K.voices) {
      const old = A.voices.shift()
      try {
        old?.stop()
      } catch {
        // Ya terminó.
      }
    }
  }

  // La tanpura: cuatro cuerdas graves en ciclo lento (Ma, Sa, Sa, Sa bajo;
  // afinada, Pa en lugar de Ma), programadas con anticipación.
  function droneTick() {
    const A = st.audio
    if (!A || !audible()) return
    const ahead = A.ac.currentTime + 0.35
    if (A.droneNext < A.ac.currentTime) A.droneNext = A.ac.currentTime + 0.05
    const first = (SA * Math.pow(2, (st.tuned ? 7 : 5) / 12)) / 2
    const DRONE = [first, SA, SA, SA / 2]
    while (A.droneNext < ahead) {
      const k = A.droneStep % 4
      play(DRONE[k], 0.5, [-0.4, 0.2, 0.35, -0.15][k], A.droneNext - A.ac.currentTime, 'tanpura', K.drone)
      A.droneNext += k === 3 ? 1.5 : 0.9
      A.droneStep++
    }
  }

  function makeAudio(): Audio | null {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    const ac = new AC()
    const master = ac.createGain()
    master.gain.value = 0
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 4
    master.connect(comp).connect(ac.destination)
    // Caja de resonancia: un poco de cuerpo en los graves medios.
    const body = ac.createBiquadFilter()
    body.type = 'peaking'
    body.frequency.value = 280
    body.gain.value = 3
    const bus = ac.createGain()
    const dry = ac.createGain()
    dry.gain.value = 0.8
    bus.connect(body).connect(dry).connect(master)
    const [L, R] = room(ac.sampleRate, 3.2)
    if (isClean(L) && isClean(R)) {
      const ir = ac.createBuffer(2, L.length, ac.sampleRate)
      ir.copyToChannel(L, 0)
      ir.copyToChannel(R, 1)
      const verb = ac.createConvolver()
      verb.buffer = ir
      const wet = ac.createGain()
      wet.gain.value = K.wet
      bus.connect(verb).connect(wet).connect(master)
    }
    const timer = window.setInterval(droneTick, 120)
    return { ac, master, bus, cache: new Map(), voices: [], droneNext: 0, droneStep: 0, timer }
  }

  // Volumen según el estado: suena solo con permiso, sin silenciar y en pantalla.
  function level() {
    const A = st.audio
    if (!A) return
    const on = audible()
    // 'suspended', o 'interrupted' en iOS tras una llamada o al bloquear el teléfono.
    if (on && A.ac.state !== 'running') A.ac.resume().catch(() => {})
    A.master.gain.setTargetAtTime(on ? K.gain : 0, A.ac.currentTime, on ? 0.25 : 0.12)
  }
  document.addEventListener('visibilitychange', level)

  // Con el permiso de antes (esta sesión), el audio nace en el primer toque, y
  // cada toque lo reanuda si quedó detenido: un AudioContext solo arranca dentro
  // de un gesto (en iOS el pointerdown de un dedo no cuenta; el pointerup sí).
  function unlock() {
    if (!st.consent || st.muted) return
    playbackSession(true)
    if (!st.audio) st.audio = makeAudio()
    if (!st.audio) {
      st.consent = false
      playbackSession(false)
    }
    level()
  }

  // --- Animación ------------------------------------------------------------
  function update(dt: number) {
    gem.g += (gem.target - gem.g) * (1 - Math.exp(-dt * 1.6))
    if (gem.target === 1) gem.thetaTarget += K.gemSpin * dt
    gem.theta += (gem.thetaTarget - gem.theta) * (1 - Math.exp(-dt * 4))
    const ps = logic.state()
    if (!peg.drag) peg.ang += (ps.ang - peg.ang) * (1 - Math.exp(-dt * 10))
    // Una vuelta a medias regresa sola, sin ruido.
    if (!peg.drag && ps.count !== ps.base) {
      peg.idleT += dt
      if (peg.idleT > K.unwind) apply(logic.unwind(), false)
    }
    // Mientras nadie la haya girado, la clavija hace un guiño de vez en cuando.
    peg.wiggle = Math.max(0, peg.wiggle - dt / 0.9)
    if (!peg.touched) {
      peg.wiggleT -= dt
      if (peg.wiggleT <= 0) {
        peg.wiggleT = K.wiggleEvery
        peg.wiggle = 1
      }
    }
  }

  function draw() {
    const { W, H, dpr } = st
    const g = ease(gem.g)
    const mix = (a: number, b: number) => Math.round(a + (b - a) * g)
    g2.setTransform(1, 0, 0, 1, 0, 0)
    g2.fillStyle = '#000'
    g2.fillRect(0, 0, W, H)
    // Afinada, el fondo se vuelve un crepúsculo tenue.
    if (g > 0.01) {
      const sky = g2.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, `rgba(12, 8, 22, ${g})`)
      sky.addColorStop(1, `rgba(46, 22, 44, ${g})`)
      g2.fillStyle = sky
      g2.fillRect(0, 0, W, H)
    }
    const glow = g2.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6)
    glow.addColorStop(0, `rgba(255, ${mix(0, 190)}, ${mix(0, 150)}, 0.06)`)
    glow.addColorStop(1, 'rgba(255, 0, 0, 0)')
    g2.fillStyle = glow
    g2.fillRect(0, 0, W, H)
    const G = mix(34, 222)
    const B = mix(34, 200)
    g2.lineWidth = Math.max(1, dpr * 0.85)
    // Las cuerdas quietas, en dos trazos: las de atrás más tenues que las de adelante.
    for (const back of [true, false]) {
      g2.strokeStyle = `rgba(255, ${G}, ${B}, ${back ? 0.8 - 0.45 * g : 0.8})`
      g2.beginPath()
      for (const s of strings) {
        if (s.env * s.amp > 0.01 || s.z < -0.01 !== back) continue
        g2.moveTo(s.ax, s.ay)
        g2.lineTo(s.bx, s.by)
      }
      g2.stroke()
    }
    // Las que vibran: una línea con su modo, más clara mientras más fuerte.
    const px = K.maxPx * dpr
    for (const s of strings) {
      const e = s.env * s.amp
      if (e <= 0.01) continue
      const dx = s.bx - s.ax
      const dy = s.by - s.ay
      const l = Math.hypot(dx, dy) || 1
      const nx = -dy / l
      const ny = dx / l
      const m1 = 0.35 + Math.sin(Math.PI * s.u)
      const m2 = 0.5 * Math.sin(2 * Math.PI * s.u)
      const c1 = Math.cos(s.ph)
      const c2 = Math.cos(2 * s.ph + 0.7)
      const k = Math.min(1, e * 1.2)
      g2.strokeStyle = `rgba(255, ${Math.round(G + (194 - G) * k)}, ${Math.round(B + (184 - B) * k)}, ${0.8 + 0.2 * k})`
      g2.beginPath()
      for (let j = 0; j <= 14; j++) {
        const v = j / 14
        const off = px * e * s.sgn * (Math.sin(Math.PI * v) * m1 * c1 + Math.sin(2 * Math.PI * v) * m2 * c2)
        const x = s.ax + dx * v + nx * off
        const y = s.ay + dy * v + ny * off
        if (j) g2.lineTo(x, y)
        else g2.moveTo(x, y)
      }
      g2.stroke()
    }
    // Los puntos de la onda.
    g2.fillStyle = `rgb(255, ${mix(26, 236)}, ${mix(26, 220)})`
    g2.beginPath()
    const r = Math.max(1.4, 1.9 * dpr)
    for (let i = 0; i < K.n; i++) {
      const s = strings[i]
      g2.moveTo(s.ax + r, s.ay)
      g2.arc(s.ax, s.ay, r, 0, Math.PI * 2)
    }
    g2.fill()
    drawPeg()
  }

  // La clavija: un aro con su manivela, en el color del papel. Las cuatro
  // muescas se encienden con cada cuarto de vuelta.
  function drawPeg() {
    const { dpr } = st
    const [x, y] = pegCenter()
    const lit = peg.hover || peg.drag || document.activeElement === pegButton
    const r = K.pegR * dpr * (lit ? 1.12 : 1)
    const a = peg.ang + Math.sin(peg.wiggle * Math.PI * 2) * 0.3 * peg.wiggle
    const alpha = lit ? 0.95 : 0.7
    g2.lineCap = 'round'
    g2.strokeStyle = `rgba(239, 232, 229, ${alpha * 0.55})`
    g2.lineWidth = Math.max(1, dpr)
    g2.beginPath()
    g2.moveTo(x, st.topY)
    g2.lineTo(x, y + r)
    g2.stroke()
    g2.fillStyle = 'rgba(239, 232, 229, 0.05)'
    g2.strokeStyle = `rgba(239, 232, 229, ${alpha})`
    g2.lineWidth = 1.5 * dpr
    g2.beginPath()
    g2.arc(x, y, r, 0, Math.PI * 2)
    g2.fill()
    g2.stroke()
    const ps = logic.state()
    const done = Math.abs(ps.count - ps.base)
    for (let k = 0; k < 4; k++) {
      const m = -Math.PI / 2 + k * QUARTER
      g2.fillStyle = k < done ? 'rgba(255, 214, 196, 0.95)' : `rgba(239, 232, 229, ${alpha * 0.35})`
      g2.beginPath()
      g2.arc(x + Math.cos(m) * r * 1.55, y + Math.sin(m) * r * 1.55, 1.3 * dpr, 0, Math.PI * 2)
      g2.fill()
    }
    g2.beginPath()
    g2.moveTo(x, y)
    g2.lineTo(x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9)
    g2.stroke()
    g2.fillStyle = `rgba(239, 232, 229, ${alpha})`
    g2.beginPath()
    g2.arc(x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9, r * 0.36, 0, Math.PI * 2)
    g2.fill()
    g2.beginPath()
    g2.arc(x, y, r * 0.22, 0, Math.PI * 2)
    g2.fill()
    g2.lineCap = 'butt'
    // El botón del teclado sigue a la clavija.
    const hit = K.pegHit
    pegButton.style.width = pegButton.style.height = `${2 * hit}px`
    pegButton.style.transform = `translate(${x / dpr - hit}px, ${y / dpr - hit}px)`
  }

  const piece: HarpPiece = {
    dirty: false,
    resize(w, h, dpr) {
      st.W = w
      st.H = h
      st.dpr = dpr
      // Deja lugar arriba para la clavija.
      st.s = Math.min((w * 0.88) / 10, (h * 0.8) / (2 * K.apex + 0.4))
      st.cx = w / 2
      st.cy = h / 2 + K.pegLift * dpr * 0.35
      geometry(0)
      piece.dirty = true
    },
    frame(t, dt) {
      if (dt > 0) update(dt)
      geometry(t)
      if (dt > 0) {
        st.idle += dt
        for (const s of strings) {
          if (s.env <= 0.001) continue
          s.env *= Math.exp(-dt / s.tau)
          s.ph += Math.PI * 2 * s.vis * dt
        }
        if (audible()) {
          // Con sonido y sin nadie tocando, se toca sola, despacio.
          st.melodyT -= dt
          if (st.idle > 4 && st.melodyT <= 0) {
            st.melodyT = K.melodyEvery[0] + Math.random() * (K.melodyEvery[1] - K.melodyEvery[0])
            pluck(strings[Math.floor(Math.random() * strings.length)], 0.3, 0.3 + Math.random() * 0.4, 1)
          }
        } else {
          // Sin sonido, de vez en cuando una cuerda vibra sola: el arpa respira.
          st.selfT -= dt
          if (st.selfT <= 0) {
            st.selfT = K.selfEvery * (0.7 + Math.random() * 0.6)
            pluck(strings[Math.floor(Math.random() * strings.length)], 0.32, 0.3 + Math.random() * 0.4, 1)
          }
        }
      }
      draw()
    },
    setSound(on) {
      if (on) {
        // La sesión se pide antes de crear o reanudar el audio.
        playbackSession(true)
        st.consent = true
        st.muted = false
        if (!st.audio) st.audio = makeAudio()
        if (!st.audio) st.consent = false
      } else st.muted = true
      const playing = !!st.audio && st.consent && !st.muted
      if (!playing) playbackSession(false)
      level()
      return playing
    },
    visibility(v) {
      st.visible = v
      level()
    },
    dispose() {
      st.disposed = true
      for (const id of pending) window.clearTimeout(id)
      pending.clear()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
      canvas.removeEventListener('pointerleave', onLeave)
      pegButton.removeEventListener('click', onPegClick)
      document.removeEventListener('visibilitychange', level)
      playbackSession(false)
      const A = st.audio
      st.audio = null
      if (A) {
        window.clearInterval(A.timer)
        for (const v of A.voices) {
          try {
            v.stop()
          } catch {
            // Ya terminó.
          }
        }
        A.ac.close().catch(() => {})
      }
    },
  }
  return piece
}
