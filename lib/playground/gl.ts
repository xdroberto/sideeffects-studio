/**
 * Utilidades WebGL2 de Playground: programas, el triángulo que cubre la
 * pantalla y texturas de ida y vuelta (ping-pong) para simulaciones. Todo lo
 * que se crea aquí se borra en `dispose()`, que además suelta el contexto.
 */

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`

/** Ruido y utilidades GLSL que comparten los shaders. */
export const GLSL = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
`

export type Program = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }

export type Target = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number; float: boolean; dispose(): void }

export type PingPong = { readonly read: Target; readonly write: Target; swap(): void; dispose(): void }

export type GLTools = {
  gl: WebGL2RenderingContext
  /** El navegador perdió el contexto: la pieza ya no puede dibujar. */
  readonly lost: boolean
  program(fs: string, vs?: string): Program
  tri: { draw(): void }
  pingpong(w: number, h: number, opts?: { float?: boolean }): PingPong
  /** Una textura lineal, sin repetir, que se borra con todo lo demás. */
  texture(): WebGLTexture
  dispose(): void
}

/** Crea el contexto WebGL2 del canvas; lanza un error si no hay WebGL2. */
export function createGL(canvas: HTMLCanvasElement): GLTools {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  })
  if (!gl) throw new Error('This browser has no WebGL2.')
  const ctx = gl
  // Render a textura de punto flotante: la reacción-difusión no cabe en 8 bits.
  const floatOK = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'))
  const programs = new Set<WebGLProgram>()
  const textures = new Set<WebGLTexture>()
  const framebuffers = new Set<WebGLFramebuffer>()
  const buffers = new Set<WebGLBuffer>()
  const vaos = new Set<WebGLVertexArrayObject>()
  let lost = false
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
  }
  canvas.addEventListener('webglcontextlost', onLost)

  function compile(type: number, src: string) {
    const s = ctx.createShader(type)
    if (!s) throw new Error('Could not create a shader.')
    ctx.shaderSource(s, src)
    ctx.compileShader(s)
    if (!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)) {
      const log = ctx.getShaderInfoLog(s)
      ctx.deleteShader(s)
      throw new Error(`${log}\n${src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n')}`)
    }
    return s
  }

  function program(fs: string, vs = VS): Program {
    const p = ctx.createProgram()
    if (!p) throw new Error('Could not create a program.')
    programs.add(p)
    const v = compile(ctx.VERTEX_SHADER, vs)
    const f = compile(ctx.FRAGMENT_SHADER, fs)
    ctx.attachShader(p, v)
    ctx.attachShader(p, f)
    ctx.bindAttribLocation(p, 0, 'p')
    ctx.linkProgram(p)
    // Enlazado, los shaders ya no hacen falta.
    ctx.detachShader(p, v)
    ctx.detachShader(p, f)
    ctx.deleteShader(v)
    ctx.deleteShader(f)
    if (!ctx.getProgramParameter(p, ctx.LINK_STATUS)) throw new Error(ctx.getProgramInfoLog(p) || 'Link failed.')
    const u: Program['u'] = {}
    const n = ctx.getProgramParameter(p, ctx.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < n; i++) {
      const info = ctx.getActiveUniform(p, i)
      if (info) u[info.name.replace(/\[0\]$/, '')] = ctx.getUniformLocation(p, info.name)
    }
    return { p, u }
  }

  function triangle() {
    const vao = ctx.createVertexArray()
    const b = ctx.createBuffer()
    if (!vao || !b) throw new Error('Could not create the vertex buffer.')
    vaos.add(vao)
    buffers.add(b)
    ctx.bindVertexArray(vao)
    ctx.bindBuffer(ctx.ARRAY_BUFFER, b)
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW)
    ctx.enableVertexAttribArray(0)
    ctx.vertexAttribPointer(0, 2, ctx.FLOAT, false, 0, 0)
    ctx.bindVertexArray(null)
    return {
      draw() {
        ctx.bindVertexArray(vao)
        ctx.drawArrays(ctx.TRIANGLES, 0, 3)
      },
    }
  }

  function texture() {
    const tex = ctx.createTexture()
    if (!tex) throw new Error('Could not create a texture.')
    textures.add(tex)
    ctx.bindTexture(ctx.TEXTURE_2D, tex)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE)
    return tex
  }

  function target(w: number, h: number, float: boolean): Target {
    const tex = texture()
    ctx.texImage2D(ctx.TEXTURE_2D, 0, float ? ctx.RGBA16F : ctx.RGBA8, w, h, 0, ctx.RGBA, float ? ctx.HALF_FLOAT : ctx.UNSIGNED_BYTE, null)
    const fb = ctx.createFramebuffer()
    if (!fb) throw new Error('Could not create a framebuffer.')
    framebuffers.add(fb)
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, fb)
    ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, tex, 0)
    ctx.clearColor(0, 0, 0, 1)
    ctx.clear(ctx.COLOR_BUFFER_BIT)
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, null)
    return {
      tex,
      fb,
      w,
      h,
      float,
      dispose() {
        ctx.deleteFramebuffer(fb)
        ctx.deleteTexture(tex)
        framebuffers.delete(fb)
        textures.delete(tex)
      },
    }
  }

  function pingpong(w: number, h: number, opts: { float?: boolean } = {}): PingPong {
    const float = !!opts.float && floatOK
    let a = target(w, h, float)
    let b = target(w, h, float)
    return {
      get read() {
        return a
      },
      get write() {
        return b
      },
      swap() {
        const t = a
        a = b
        b = t
      },
      dispose() {
        a.dispose()
        b.dispose()
      },
    }
  }

  return {
    gl,
    get lost() {
      return lost
    },
    program,
    tri: triangle(),
    pingpong,
    texture,
    dispose() {
      for (const fb of framebuffers) ctx.deleteFramebuffer(fb)
      for (const t of textures) ctx.deleteTexture(t)
      for (const b of buffers) ctx.deleteBuffer(b)
      for (const v of vaos) ctx.deleteVertexArray(v)
      for (const p of programs) ctx.deleteProgram(p)
      framebuffers.clear()
      textures.clear()
      buffers.clear()
      vaos.clear()
      programs.clear()
      // Soltar el contexto a propósito no es una falla.
      canvas.removeEventListener('webglcontextlost', onLost)
      ctx.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
