'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { reactionDiffusion } from '@/lib/shaders/sf01/reactionDiffusion'
import { fullscreenVertex } from '@/lib/shaders/sf01/common/vertex'
import { hexToRgb01, type ShaderId } from '@/lib/sf01/preview-config'
import type { ShaderPalette } from './voronoi-preview'

/**
 * Preview público del shader Reaction-Diffusion (Gray-Scott) de SF-01.
 *
 * Implementado con ping-pong de dos `WebGLRenderTarget`s en aspect ratio
 * 16:10 (matchea el canvas del demo). Esto resuelve el problema de "blur"
 * cuando el FBO era cuadrado y se estiraba al canvas wide — ahora la
 * relación es 1:1 y la resolución sim cubre el display sin upscale agresivo.
 *
 * Touch / pointer:
 * - `seedQueueRef` es una queue compartida con el padre. Cuando el user
 *   tap/drag sobre el canvas, el padre empuja {x, y} en coords UV (0..1).
 * - En cada frame consumimos la queue ANTES de las compute iterations:
 *   por cada seed, un pase `seedAddMat` reescribe el FBO con un blob de
 *   B=1 en ese punto. La siguiente compute iteration evoluciona desde ahí.
 *
 * `useFrame((s) => {...}, 1)` con priority positivo deshabilita el render
 * automático de R3F — todo se dispatcha manualmente desde el callback.
 */

const SIM_WIDTH = 512
const SIM_HEIGHT = 320 // 16:10 aspect, matchea el canvas demo
const ITERATIONS_PER_FRAME = 8
const SEED_RADIUS_UV = 0.04 // ~20px en el FBO

// Seed-add shader: lee el estado anterior, agrega un blob circular de
// B (especie activa) en u_seedPoint. Aspect-correct: la distancia se
// computa en coords proporcionales para que el blob sea círculo y no
// elipse en el FBO 16:10.
const seedAddFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D u_prev;
  uniform vec2 u_seedPoint;
  uniform float u_seedRadius;
  uniform float u_aspect; // width / height del FBO
  void main() {
    vec2 c = texture2D(u_prev, vUv).rg;
    vec2 d_uv = vUv - u_seedPoint;
    d_uv.x *= u_aspect;
    float d = length(d_uv);
    if (d < u_seedRadius) {
      // Smooth falloff: el borde de la seed se diluye para evitar
      // discontinuidades duras que el Gray-Scott amplifica como
      // artifacts visuales.
      float falloff = smoothstep(u_seedRadius, u_seedRadius * 0.5, d);
      c.g = mix(c.g, 1.0, falloff);
      c.r = mix(c.r, 0.0, falloff * 0.6);
    }
    gl_FragColor = vec4(c, 0.0, 1.0);
  }
`

export interface SeedPoint {
  x: number // 0..1 en UV (left to right)
  y: number // 0..1 en UV (bottom to top, GL convention)
}

export interface ReactionDiffusionMeshProps {
  values: Record<string, number>
  palette: ShaderPalette
  /**
   * Queue compartida — el padre push'ea seeds desde pointer events,
   * el mesh las consume en useFrame. Mutable ref para no causar
   * re-renders del componente cada vez que se agrega un seed.
   */
  seedQueueRef: MutableRefObject<SeedPoint[]>
  /**
   * Increment este número para forzar re-seed (clean reset de la sim).
   * El user puede hacer "clear" desde un botón externo.
   */
  resetKey?: number
}

function buildSlots(values: Record<string, number>, palette: ShaderPalette) {
  const slots: Record<string, { value: unknown }> = {}
  for (const u of reactionDiffusion.uniforms) {
    if (u.type === 'vec3') {
      // Map vec3 uniforms a la palette del demo
      if (u.name === 'u_colorA') {
        const c = hexToRgb01(palette.a)
        slots[u.name] = { value: new THREE.Vector3(c[0], c[1], c[2]) }
      } else if (u.name === 'u_colorB') {
        const c = hexToRgb01(palette.b)
        slots[u.name] = { value: new THREE.Vector3(c[0], c[1], c[2]) }
      } else if (u.name === 'u_edgeColor') {
        const c = hexToRgb01(palette.edge)
        slots[u.name] = { value: new THREE.Vector3(c[0], c[1], c[2]) }
      } else {
        const d = u.default as [number, number, number]
        slots[u.name] = { value: new THREE.Vector3(d[0], d[1], d[2]) }
      }
    } else {
      // Si el slider tiene un valor, usarlo; si no, default. Audio
      // reactivity desactivada en el preview público.
      const v = u.name === 'u_audioReact'
        ? 0
        : (values[u.name] ?? (u.default as number))
      slots[u.name] = { value: v }
    }
  }
  return slots
}

export function ReactionDiffusionMesh({
  values,
  palette,
  seedQueueRef,
  resetKey = 0,
}: ReactionDiffusionMeshProps) {
  const { gl } = useThree()
  const spec = reactionDiffusion.feedback!

  const fboA = useFBO(SIM_WIDTH, SIM_HEIGHT, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
  const fboB = useFBO(SIM_WIDTH, SIM_HEIGHT, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })

  const pingRef = useRef(0)
  const seededRef = useRef(false)

  const computeMat = useMemo(() => {
    const slots = buildSlots(values, palette)
    slots.u_prev = { value: null }
    slots.u_texelSize = { value: new THREE.Vector2(1 / SIM_WIDTH, 1 / SIM_HEIGHT) }
    slots.u_audio = { value: new THREE.Vector4(0, 0, 0, 0) }
    return new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: spec.compute,
      uniforms: slots as Record<string, THREE.IUniform>,
      depthTest: false,
      depthWrite: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.compute])

  const seedMat = useMemo(() => {
    if (!spec.seed) return null
    const slots = buildSlots(values, palette)
    slots.u_time = { value: 0 }
    return new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: spec.seed,
      uniforms: slots as Record<string, THREE.IUniform>,
      depthTest: false,
      depthWrite: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.seed])

  const seedAddMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: seedAddFragment,
      uniforms: {
        u_prev: { value: null },
        u_seedPoint: { value: new THREE.Vector2(0.5, 0.5) },
        u_seedRadius: { value: SEED_RADIUS_UV },
        u_aspect: { value: SIM_WIDTH / SIM_HEIGHT },
      } as Record<string, THREE.IUniform>,
      depthTest: false,
      depthWrite: false,
    })
  }, [])

  const displayMat = useMemo(() => {
    const slots = buildSlots(values, palette)
    slots.u_state = { value: null }
    slots.u_time = { value: 0 }
    slots.u_stateRes = { value: new THREE.Vector2(SIM_WIDTH, SIM_HEIGHT) }
    slots.u_audio = { value: new THREE.Vector4(0, 0, 0, 0) }
    return new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: spec.display,
      uniforms: slots as Record<string, THREE.IUniform>,
      depthTest: false,
      depthWrite: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.display])

  // Escena offscreen para los 3+ passes (seed, compute, seed-add, display).
  const offscreen = useMemo(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.Camera()
    const geo = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geo, computeMat)
    scene.add(mesh)
    return { scene, camera, mesh, geo }
  }, [computeMat])

  // Reset on key change.
  useEffect(() => {
    seededRef.current = false
  }, [resetKey])

  useEffect(() => {
    return () => {
      computeMat.dispose()
      seedMat?.dispose()
      seedAddMat.dispose()
      displayMat.dispose()
      offscreen.geo.dispose()
    }
  }, [computeMat, seedMat, seedAddMat, displayMat, offscreen])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    displayMat.uniforms.u_time.value = time
    if (seedMat) seedMat.uniforms.u_time.value = time

    // Sync valores del slider a uniforms en cada frame — esto permite
    // que el user mueva sliders en vivo y la sim reaccione sin remount.
    for (const [key, value] of Object.entries(values)) {
      if (computeMat.uniforms[key]) computeMat.uniforms[key].value = value
      if (displayMat.uniforms[key]) displayMat.uniforms[key].value = value
    }
    // Sync colors from palette.
    const colorA = hexToRgb01(palette.a)
    const colorB = hexToRgb01(palette.b)
    const colorEdge = hexToRgb01(palette.edge)
    ;(displayMat.uniforms.u_colorA.value as THREE.Vector3).fromArray(colorA)
    ;(displayMat.uniforms.u_colorB.value as THREE.Vector3).fromArray(colorB)
    ;(displayMat.uniforms.u_edgeColor.value as THREE.Vector3).fromArray(colorEdge)

    // Seed pass — la primera vez, o tras un reset.
    if (!seededRef.current) {
      offscreen.mesh.material = seedMat ?? computeMat
      gl.setRenderTarget(fboA)
      gl.clear()
      gl.render(offscreen.scene, offscreen.camera)
      seededRef.current = true
      pingRef.current = 0
    }

    // Procesar seeds pendientes del pointer ANTES de las iterations.
    // Cada seed lee del FBO actual y escribe el modificado al opuesto.
    const seedQueue = seedQueueRef.current
    if (seedQueue.length > 0) {
      offscreen.mesh.material = seedAddMat
      for (const seed of seedQueue) {
        const src = pingRef.current === 0 ? fboA : fboB
        const dst = pingRef.current === 0 ? fboB : fboA
        seedAddMat.uniforms.u_prev.value = src.texture
        ;(seedAddMat.uniforms.u_seedPoint.value as THREE.Vector2).set(seed.x, seed.y)
        gl.setRenderTarget(dst)
        gl.render(offscreen.scene, offscreen.camera)
        pingRef.current = 1 - pingRef.current
      }
      seedQueue.length = 0 // drain in place
    }

    // Compute iterations: ping-pong N veces.
    offscreen.mesh.material = computeMat
    for (let i = 0; i < ITERATIONS_PER_FRAME; i++) {
      const src = pingRef.current === 0 ? fboA : fboB
      const dst = pingRef.current === 0 ? fboB : fboA
      computeMat.uniforms.u_prev.value = src.texture
      gl.setRenderTarget(dst)
      gl.render(offscreen.scene, offscreen.camera)
      pingRef.current = 1 - pingRef.current
    }

    // Display pass: render el último FBO hacia el screen.
    const latest = pingRef.current === 0 ? fboA : fboB
    displayMat.uniforms.u_state.value = latest.texture
    offscreen.mesh.material = displayMat
    gl.setRenderTarget(null)
    gl.render(offscreen.scene, offscreen.camera)
  }, 1)

  return null
}

interface ReactionDiffusionPreviewProps {
  values: Record<string, number>
  palette: ShaderPalette
  seedQueueRef: MutableRefObject<SeedPoint[]>
  className?: string
}

/** Wrapper standalone (con Canvas). Mantenido por compat; sf01-client.tsx usa el DemoCanvas unificado ahora. */
export function ReactionDiffusionPreview({
  values,
  palette,
  seedQueueRef,
  className,
}: ReactionDiffusionPreviewProps) {
  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        orthographic
        camera={{ position: [0, 0, 1], near: 0, far: 2 }}
      >
        <ReactionDiffusionMesh values={values} palette={palette} seedQueueRef={seedQueueRef} />
      </Canvas>
    </div>
  )
}

// Re-export for callers that need this type.
export type { ShaderId }
