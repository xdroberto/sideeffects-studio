'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import type { Effect, PatchValues } from '../lib/types'
import { fullscreenVertex } from '../lib/shaders/common/vertex'
import { FeedbackQuad } from './FeedbackQuad'
import { ZERO_BANDS, type AudioBands } from '../hooks/useAudioSource'

type AudioRef = RefObject<AudioBands>

function SimpleQuad({
  effect,
  values,
  audioRef,
}: {
  effect: Effect
  values: PatchValues
  audioRef?: AudioRef
}) {
  const { size } = useThree()

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

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  useEffect(() => {
    const res = material.uniforms.u_resolution
    if (res && res.value instanceof THREE.Vector2) {
      res.value.set(size.width, size.height)
    }
  }, [size.width, size.height, material])

  useFrame((state) => {
    material.uniforms.u_time.value = state.clock.getElapsedTime()
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
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <primitive attach="material" object={material} />
    </mesh>
  )
}

type SynthCanvasProps = {
  effect: Effect
  values: PatchValues
  resetKey?: number
  audioRef?: AudioRef
}

export function SynthCanvas({ effect, values, resetKey, audioRef }: SynthCanvasProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      frameloop="always"
    >
      {effect.feedback ? (
        <FeedbackQuad
          key={effect.id}
          effect={effect}
          values={values}
          resetKey={resetKey}
          audioRef={audioRef}
        />
      ) : (
        <SimpleQuad key={effect.id} effect={effect} values={values} audioRef={audioRef} />
      )}
    </Canvas>
  )
}
