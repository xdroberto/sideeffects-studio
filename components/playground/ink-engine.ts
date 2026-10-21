import { createGL, GLSL, type PingPong } from '@/lib/playground/gl'
import { cssFamily, loadFont } from '@/lib/playground/fonts'
import { isRunning } from '@/lib/playground/motion'
import { MOTTO, createWordCycle } from '@/lib/playground/words.mjs'
import type { Piece } from './use-piece'

/**
 * Ink: la portada de Playground. Las letras son muros para la
 * reacción-difusión (Gray-Scott): la tinta nace de sus contornos y crece en
 * laberinto alrededor de ellas. La palabra recita el lema del estudio; cada
 * cambio se reescribe con un barrido y la tinta se reacomoda, sin borrarse.
 */

const K = {
  FK: [0.029, 0.057], // régimen de laberinto (el de la transición del home)
  FKfar: [0.03, 0.0675], // lejos de la palabra la tinta se apaga: queda un aura
  aura: [0.16, 0.3], // margen del aura alrededor de la palabra (fracción del ancho y del alto)
  flow: 0.022, // deriva del laberinto, en px de simulación por paso
  simScale: 0.6, // resolución de la simulación respecto al canvas
  simMax: 720, // tope de ancho de la simulación
  steps: 22, // pasos por cuadro a 60 fps
  pre: 1200, // pasos de arranque con movimiento
  preStill: 4000, // en reposo, la tinta ya crecida (lo que lleva con movimiento a los pocos segundos)
  chunk: 200, // tope de pasos de arranque por cuadro (un equipo lento no se traba)
  seedSteps: 14, // pasos sembrando el contorno después de cada palabra
  brush: 0.022, // radio del pincel (fracción del alto)
}

// Donde pasa el pincel, el régimen se vuelve laberinto un momento (canal z
// del estado): el trazo crece como una línea de tinta y, al apagarse la marca
// (con la deriva, en cosa de un segundo), se rompe en las motas del fondo.
const PAINT_FADE = '0.9998' // por paso

const SIM = `#version 300 es
precision highp float;
uniform sampler2D S;
uniform sampler2D M; // r: letras (muros), g: cercanía a la palabra
uniform vec2 px, FK, FKfar;
uniform float aspect, init, contour, seedBand, seedT, t, flow;
uniform vec4 brush; // xy en uv, z radio, w fuerza
in vec2 uv; out vec4 o;
${GLSL}
float wall(vec2 q){ return texture(M, q).r; }
void main(){
  // Dentro de las letras no hay reacción: U = 1, V = 0.
  if (init > 0.5 || wall(uv) > 0.5) { o = vec4(1.0, 0.0, 0.0, 1.0); return; }
  // Deriva lenta: el laberinto nunca se queda quieto.
  vec2 q = (uv - 0.5) * vec2(aspect, 1.0);
  vec2 s = uv - vec2(sin(q.y * 4.0 + t * 0.3), cos(q.x * 3.5 - t * 0.23)) * px * flow;
  vec4 cell = texture(S, s);
  vec2 c = cell.xy;
  float paint = cell.z * ${PAINT_FADE};
  vec2 l = -c
    + 0.2 * (texture(S, s + vec2(px.x, 0.0)).xy + texture(S, s - vec2(px.x, 0.0)).xy
           + texture(S, s + vec2(0.0, px.y)).xy + texture(S, s - vec2(0.0, px.y)).xy)
    + 0.05 * (texture(S, s + px).xy + texture(S, s - px).xy
            + texture(S, s + vec2(px.x, -px.y)).xy + texture(S, s - vec2(px.x, -px.y)).xy);
  float r = c.x * c.y * c.y;
  // El aura respira: su borde avanza y retrocede despacio.
  float edge = 0.05 + 0.05 * sin(t * 0.35);
  vec2 fk = mix(FKfar, FK, smoothstep(edge, 0.6, max(texture(M, uv).g, paint)));
  c += vec2(l.x - r + fk.x * (1.0 - c.x), 0.5 * l.y + r - (fk.x + fk.y) * c.y);
  // Semilla salpicada justo afuera del contorno de las letras: en la franja
  // de la pluma mientras escribe, en toda la palabra al terminar.
  if (contour > 0.5 && (seedBand < 0.0 || abs(uv.x - seedBand) < 0.04)) {
    float ring = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853982;
      ring = max(ring, wall(uv + vec2(cos(a), sin(a)) * px * 3.0));
    }
    float sp = ring * step(0.55, hash12(floor(uv / px) + seedT));
    c.y = max(c.y, 0.9 * sp);
    c.x = min(c.x, 1.0 - 0.5 * sp);
  }
  vec2 d = (uv - brush.xy) * vec2(aspect, 1.0);
  float b = (1.0 - smoothstep(brush.z * 0.5, brush.z, length(d))) * brush.w;
  // Motas, como la siembra del contorno: un disco lleno agota el sustrato y se
  // apaga en un cuadro; las motas sueltas crecen en laberinto.
  float bs = b * step(0.55, hash12(floor(uv / px) + seedT + fract(t * 7.0) * 97.0));
  c.y = max(c.y, 0.9 * bs);
  c.x = min(c.x, 1.0 - 0.5 * bs);
  paint = max(paint, (1.0 - smoothstep(brush.z * 1.1, brush.z * 2.2, length(d))) * brush.w);
  o = vec4(clamp(c, 0.0, 1.0), paint, 1.0);
}`

// Grabado: curvas de nivel rojas, el núcleo en blanco con registro
// imperfecto y la palabra como hueco limpio con un filo apenas visible.
const SHOW = `#version 300 es
precision highp float;
uniform sampler2D S;
uniform sampler2D M;
uniform vec2 res;
uniform float t, sweep; // sweep: x del barrido (−1 = sin barrido)
in vec2 uv; out vec4 o;
${GLSL}
float iso(float x, float w){ return 1.0 - smoothstep(0.0, w, abs(fract(x - 0.5) - 0.5)); }
void main(){
  float v = texture(S, uv).y;
  float vw = texture(S, uv - vec2(0.0011, -0.0008)).y;
  float m = texture(M, uv).r;
  float x = v * 30.0;
  float red = iso(x, fwidth(x) * 0.7 + 1e-4) * smoothstep(0.03, 0.07, v);
  float w = fwidth(vw) * 1.1 + 1e-4;
  float core = 1.0 - smoothstep(0.0, w, abs(vw - 0.21));
  vec3 RED = vec3(1.0, 0.17, 0.17);
  vec3 col = RED * 0.1 * smoothstep(0.12, 0.3, v);
  col += RED * red * 0.85;
  col = mix(col, vec3(1.0, 0.97, 0.94), core * 0.9);
  float edge = fwidth(m) * 1.5 + 1e-4;
  col = mix(col, vec3(0.02, 0.0, 0.0), smoothstep(0.4, 0.6, m));
  col += vec3(0.55, 0.07, 0.07) * (1.0 - smoothstep(0.0, edge, abs(m - 0.5)));
  // La pluma del barrido: una línea tenue que reescribe la palabra.
  if (sweep >= 0.0) {
    float d = abs(uv.x - sweep) * res.x;
    col += vec3(1.0, 0.55, 0.5) * 0.35 * (1.0 - smoothstep(0.0, 1.6, d)) * smoothstep(0.0, 0.25, texture(M, uv).g);
  }
  col += (hash12(uv * res + fract(t * 7.0) * 311.0) - 0.5) * 0.05;
  vec2 q = (uv - 0.5) * vec2(1.15, 0.85);
  col *= 1.0 - 0.55 * dot(q, q);
  o = vec4(max(col, 0.0), 1.0);
}`

export type InkPiece = Piece & {
  /** La palabra del visitante: se queda 25 s; vacía, vuelve el lema. */
  setWord(word: string): void
}

export function createInk(canvas: HTMLCanvasElement): InkPiece {
  const T = createGL(canvas)
  const { gl } = T
  const sim = T.program(SIM)
  const show = T.program(SHOW)
  const words = createWordCycle({ words: MOTTO })
  const family = cssFamily('--font-display', '"Arial Black", sans-serif')
  const st = {
    W: 2, H: 2, sw: 2, sh: 2, pp: null as PingPong | null, fontReady: false, disposed: false,
    word: { cur: MOTTO[0], next: '', sweep: -1 },
    fresh: true, pending: 0, contour: 0, seedBand: -1, seedT: 0,
    brushN: 0, bx: 0.5, by: 0.5, down: false,
  }

  const maskCv = document.createElement('canvas')
  const mctx = maskCv.getContext('2d')
  if (!mctx) throw new Error('This browser has no 2D canvas.')
  const maskTex = T.texture()
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))

  // Una palabra en Michroma, ajustada al ancho (en dos renglones si queda muy
  // chica y tiene espacios), recortada a la franja [x0, x1). Verde: el aura,
  // una elipse suave alrededor (ahí vive el laberinto; afuera la tinta se
  // apaga). Rojo: las letras nítidas, que son muros.
  function paintWord(c: CanvasRenderingContext2D, text: string, x0: number, x1: number) {
    const w = st.sw
    const h = st.sh
    const word = text.trim() || MOTTO[0]
    const font = (px: number) => `${px}px ${family}`
    c.font = font(100)
    let lines = [word]
    let size = Math.min(h * 0.3, (w * 0.84 * 100) / c.measureText(word).width)
    const cut = word.indexOf(' ', Math.floor(word.length / 2) - 3)
    if (size < h * 0.13 && cut > 0) {
      lines = [word.slice(0, cut), word.slice(cut + 1)]
      const widest = Math.max(...lines.map((l) => c.measureText(l).width))
      size = Math.min(h * 0.24, (w * 0.84 * 100) / widest)
    }
    c.save()
    c.beginPath()
    c.rect(x0, 0, x1 - x0, h)
    c.clip()
    c.font = font(Math.floor(size))
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const lh = size * 1.3
    const textW = Math.max(...lines.map((l) => c.measureText(l).width))
    const rx = Math.min(w * 0.5, textW / 2 + K.aura[0] * w)
    const ry = Math.min(h * 0.5, (lines.length * lh) / 2 + K.aura[1] * h)
    c.save()
    c.translate(w / 2, h / 2)
    c.scale(rx / ry, 1)
    const aura = c.createRadialGradient(0, 0, ry * 0.45, 0, 0, ry)
    aura.addColorStop(0, '#0f0')
    aura.addColorStop(1, '#000')
    c.fillStyle = aura
    c.fillRect(-1e4, -1e4, 2e4, 2e4)
    c.restore()
    c.globalCompositeOperation = 'lighter'
    c.fillStyle = '#f00'
    lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh))
    c.restore()
  }

  // La máscara: la palabra actual o, durante el barrido, la nueva a la
  // izquierda de la pluma y la anterior a la derecha.
  function drawMask() {
    const c = mctx as CanvasRenderingContext2D
    const w = st.sw
    const h = st.sh
    if (maskCv.width !== w || maskCv.height !== h) {
      maskCv.width = w
      maskCv.height = h
    }
    c.globalCompositeOperation = 'source-over'
    c.fillStyle = '#000'
    c.fillRect(0, 0, w, h)
    const { cur, next, sweep } = st.word
    if (sweep >= 0) {
      const x = Math.round(sweep * w)
      paintWord(c, next, 0, x)
      paintWord(c, cur, x, w)
    } else paintWord(c, cur, 0, w)
    gl.bindTexture(gl.TEXTURE_2D, maskTex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCv)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  }

  // Siembra en el contorno: en la franja de la pluma mientras escribe, y en
  // toda la palabra al terminar.
  function seed(band: number) {
    st.contour = K.seedSteps
    st.seedBand = band
    st.seedT = Math.random() * 100
  }

  // La palabra ya crecida: al cargar, al cambiar de tamaño y en reposo.
  function regrow() {
    drawMask()
    seed(-1)
    st.pending = isRunning() ? K.pre : K.preStill
    piece.dirty = true
  }

  const toUV = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]
  }
  const onDown = (e: PointerEvent) => {
    st.down = true
    ;[st.bx, st.by] = toUV(e)
    st.brushN = 4
  }
  const onMove = (e: PointerEvent) => {
    if (!st.down) return
    ;[st.bx, st.by] = toUV(e)
    st.brushN = 4
  }
  const onUp = () => {
    st.down = false
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointercancel', onUp)
  window.addEventListener('pointerup', onUp)

  function step(t: number, brushOn: boolean) {
    const pp = st.pp as PingPong
    gl.useProgram(sim.p)
    gl.uniform2f(sim.u.px, 1 / st.sw, 1 / st.sh)
    gl.uniform2f(sim.u.FK, K.FK[0], K.FK[1])
    gl.uniform2f(sim.u.FKfar, K.FKfar[0], K.FKfar[1])
    gl.uniform1f(sim.u.aspect, st.sw / st.sh)
    gl.uniform1f(sim.u.init, st.fresh ? 1 : 0)
    gl.uniform1f(sim.u.contour, st.contour > 0 ? 1 : 0)
    gl.uniform1f(sim.u.seedBand, st.seedBand)
    gl.uniform1f(sim.u.seedT, st.seedT)
    gl.uniform1f(sim.u.t, t)
    gl.uniform1f(sim.u.flow, K.flow)
    gl.uniform4f(sim.u.brush, st.bx, st.by, K.brush, brushOn ? 1 : 0)
    gl.uniform1i(sim.u.S, 0)
    gl.uniform1i(sim.u.M, 1)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, maskTex)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, pp.read.tex)
    gl.bindFramebuffer(gl.FRAMEBUFFER, pp.write.fb)
    T.tri.draw()
    pp.swap()
    st.fresh = false
    if (st.contour > 0) st.contour--
  }

  // El reloj de las palabras (solo corre cuando hay movimiento).
  function clock(dt: number) {
    const s = words.step(dt)
    if (!s.changed) return
    st.word = s
    drawMask()
    seed(s.sweep >= 0 ? s.sweep : -1)
  }

  const piece: InkPiece = {
    dirty: false,
    resize(w, h) {
      st.W = w
      st.H = h
      st.sw = Math.max(64, Math.min(K.simMax, Math.round(w * K.simScale)))
      st.sh = Math.max(64, Math.round((st.sw * h) / w))
      st.pp?.dispose()
      st.pp = T.pingpong(st.sw, st.sh, { float: true })
      st.fresh = true
      if (st.fontReady) regrow()
      piece.dirty = true
    },
    setWord(word) {
      if (isRunning()) {
        words.pin(word)
        return
      }
      // En reposo («reducir movimiento») no hay reloj: la palabra aparece ya
      // escrita y crecida; vacía, regresa el lema.
      st.word = words.pinNow(word)
      if (st.fontReady && st.pp) regrow()
    },
    frame(t, dt) {
      if (T.lost) throw new Error('The WebGL context was lost.')
      if (!st.pp || !st.fontReady) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, st.W, st.H)
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        return
      }
      if (dt > 0) clock(dt)
      gl.viewport(0, 0, st.sw, st.sh)
      let n = dt > 0 ? Math.round(Math.min(36, Math.max(8, K.steps * dt * 60))) : 0
      if (st.pending) {
        // Los pasos de arranque van en tandas: con movimiento la tinta se ve crecer
        // unos cuadros; en reposo crece sin mostrarse a medias.
        const take = Math.min(st.pending, K.chunk)
        n += take
        st.pending -= take
      }
      for (let i = 0; i < n; i++) step(t, st.brushN > 0 && i < 3)
      if (n > 0 && st.brushN > 0) st.brushN--
      if (st.pending > 0) piece.dirty = true
      if (st.pending > 0 && dt === 0) return

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, st.W, st.H)
      gl.useProgram(show.p)
      gl.uniform2f(show.u.res, st.W, st.H)
      gl.uniform1f(show.u.t, t)
      gl.uniform1f(show.u.sweep, st.word.sweep)
      gl.uniform1i(show.u.S, 0)
      gl.uniform1i(show.u.M, 1)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, maskTex)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, st.pp.read.tex)
      T.tri.draw()
    },
    dispose() {
      st.disposed = true
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointercancel', onUp)
      window.removeEventListener('pointerup', onUp)
      maskCv.width = maskCv.height = 0
      T.dispose()
    },
  }

  loadFont(`80px ${family}`).then(() => {
    if (st.disposed) return
    st.fontReady = true
    if (st.pp) regrow()
  })
  return piece
}
