'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import type { Effect, PatchValues, UniformSpec } from '../lib/types'
import { fullscreenVertex } from '../lib/shaders/common/vertex'
import { ZERO_BANDS, type AudioBands } from '../hooks/useAudioSource'

type Props = {
  effect: Effect
  values: PatchValues
  resetKey?: number
  audioRef?: RefObject<AudioBands>
}

function buildUniformSlots(uniforms: UniformSpec[]) {
  const slots: Record<string, { value: any }> = {}
  for (const u of uniforms) {
    if (u.type === 'vec3') {
      const d = u.default as [number, number, number]
      slots[u.name] = { value: new THREE.Vector3(d[0], d[1], d[2]) }
    } else {
      slots[u.name] = { value: u.default as number }
    }
  }
  return slots
}

function syncUniforms(
  mat: THREE.ShaderMaterial,
  specs: UniformSpec[],
  values: PatchValues
) {
  for (const u of specs) {
    const v = values[u.name]
    if (v === undefined) continue
    const slot = mat.uniforms[u.name]
    if (!slot) continue
    if (u.type === 'vec3' && Array.isArray(v)) {
      ;(slot.value as THREE.Vector3).set(v[0], v[1], v[2])
    } else {
      slot.value = v as number
    }
  }
}

export function FeedbackQuad({ effect, values, resetKey = 0, audioRef }: Props) {
  const { gl } = useThree()
  const spec = effect.feedback!
  const res = spec.resolution

  const fboA = useFBO(res, res, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
  const fboB = useFBO(res, res, {
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
    const slots = buildUniformSlots(effect.uniforms)
    slots.u_prev = { value: null }
    slots.u_texelSize = { value: new THREE.Vector2(1 / res, 1 / res) }
    slots.u_audio = { value: new THREE.Vector4(0, 0, 0, 0) }
    return new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: spec.compute,
      uniforms: slots,
      depthTest: false,
      depthWrite: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect.id])

  const seedMat = useMemo(() => {
    if (!spec.seed) return null
    const slots = buildUniformSlots(effect.uniforms)
    slots.u_time = { value: 0 }
    return new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: spec.seed,
      uniforms: slots,
      depthTest: false,
      depthWrite: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect.id])

  const displayMat = useMemo(() => {
    const slots = buildUniformSlots(effect.uniforms)
    slots.u_state = { value: null }
    slots.u_time = { value: 0 }
    slots.u_stateRes = { value: new THREE.Vector2(res, res) }
    slots.u_audio = { value: new THREE.Vector4(0, 0, 0, 0) }
    return new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: spec.display,
      uniforms: slots,
      depthTest: false,
      depthWrite: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect.id])

  const offscreen = useMemo(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.Camera()
    const geo = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geo, computeMat)
    scene.add(mesh)
    return { scene, camera, mesh, geo }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computeMat])

  useEffect(() => {
    seededRef.current = false
    pingRef.current = 0
  }, [effect.id, resetKey])

  useEffect(() => {
    return () => {
      computeMat.dispose()
      seedMat?.dispose()
      displayMat.dispose()
      offscreen.geo.dispose()
    }
  }, [computeMat, seedMat, displayMat, offscreen])

  useFrame((state) => {
    syncUniforms(computeMat, effect.uniforms, values)
    syncUniforms(displayMat, effect.uniforms, values)
    if (seedMat) syncUniforms(seedMat, effect.uniforms, values)
    displayMat.uniforms.u_time.value = state.clock.getElapsedTime()

    const a = audioRef?.current ?? ZERO_BANDS
    ;(computeMat.uniforms.u_audio.value as THREE.Vector4).set(a.low, a.mid, a.high, a.level)
    ;(displayMat.uniforms.u_audio.value as THREE.Vector4).set(a.low, a.mid, a.high, a.level)

    const prevRenderTarget = gl.getRenderTarget()

    if (!seededRef.current) {
      const target = pingRef.current === 0 ? fboA : fboB
      if (seedMat) {
        seedMat.uniforms.u_time.value = state.clock.getElapsedTime()
        offscreen.mesh.material = seedMat
      } else {
        offscreen.mesh.material = computeMat
      }
      gl.setRenderTarget(target)
      gl.clear()
      gl.render(offscreen.scene, offscreen.camera)
      seededRef.current = true
    }

    offscreen.mesh.material = computeMat
    for (let i = 0; i < spec.iterations; i++) {
      const src = pingRef.current === 0 ? fboA : fboB
      const dst = pingRef.current === 0 ? fboB : fboA
      computeMat.uniforms.u_prev.value = src.texture
      gl.setRenderTarget(dst)
      gl.render(offscreen.scene, offscreen.camera)
      pingRef.current = 1 - pingRef.current
    }

    const latest = pingRef.current === 0 ? fboA : fboB
    displayMat.uniforms.u_state.value = latest.texture

    gl.setRenderTarget(prevRenderTarget)
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <primitive attach="material" object={displayMat} />
    </mesh>
  )
}
