'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import type { Effect, PatchValues } from '../lib/types'
import { fullscreenVertex } from '../lib/shaders/common/vertex'
import { ZERO_BANDS, type AudioBands } from '../hooks/useAudioSource'

type Props = {
  effect: Effect
  values: PatchValues
  audioRef?: RefObject<AudioBands>
  target: THREE.WebGLRenderTarget
}

export function DeckSimpleRenderer({ effect, values, audioRef, target }: Props) {
  const { gl, size } = useThree()

  const material = useMemo(() => {
    const uniforms: Record<string, { value: any }> = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(size.width, size.height) },
      u_audio: { value: new THREE.Vector4(0, 0, 0, 0) },
    }
    for (const u of effect.uniforms) {
      if (u.type === 'vec3') {
        const d = u.default as [number, number, number]
        uniforms[u.name] = { value: new THREE.Vector3(d[0], d[1], d[2]) }
      } else {
        uniforms[u.name] = { value: u.default as number }
      }
    }
    return new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: effect.fragment!,
      uniforms,
      depthTest: false,
      depthWrite: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect.id])

  const offscreen = useMemo(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.Camera()
    const geo = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geo, material)
    scene.add(mesh)
    return { scene, camera, geo }
  }, [material])

  useEffect(() => {
    return () => {
      material.dispose()
      offscreen.geo.dispose()
    }
  }, [material, offscreen])

  useFrame((state) => {
    material.uniforms.u_time.value = state.clock.getElapsedTime()
    ;(material.uniforms.u_resolution.value as THREE.Vector2).set(target.width, target.height)
    const a = audioRef?.current ?? ZERO_BANDS
    ;(material.uniforms.u_audio.value as THREE.Vector4).set(a.low, a.mid, a.high, a.level)
    for (const u of effect.uniforms) {
      const v = values[u.name]
      if (v === undefined) continue
      const slot = material.uniforms[u.name]
      if (!slot) continue
      if (u.type === 'vec3' && Array.isArray(v)) {
        ;(slot.value as THREE.Vector3).set(v[0], v[1], v[2])
      } else {
        slot.value = v as number
      }
    }

    const prev = gl.getRenderTarget()
    gl.setRenderTarget(target)
    gl.render(offscreen.scene, offscreen.camera)
    gl.setRenderTarget(prev)
  })

  return null
}
