'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import type { Effect, PatchValues } from '../lib/types'
import { fullscreenVertex } from '../lib/shaders/common/vertex'
import { blendFragment } from '../lib/shaders/blend'
import { BLEND_MODE_INDEX, type BlendMode } from '../lib/blend'
import { ZERO_BANDS, type AudioBands } from '../hooks/useAudioSource'
import { DeckSimpleRenderer } from './DeckSimpleRenderer'
import { DeckFeedbackRenderer } from './DeckFeedbackRenderer'

export type DeckState = {
  effect: Effect
  values: PatchValues
  resetKey: number
}

type MixCanvasProps = {
  deckA: DeckState
  deckB: DeckState
  crossfade: number
  blendMode: BlendMode
  gainA: number
  gainB: number
  audioRef?: RefObject<AudioBands>
}

function MixScene({
  deckA,
  deckB,
  crossfade,
  blendMode,
  gainA,
  gainB,
  audioRef,
}: MixCanvasProps) {
  const { size } = useThree()

  const fboA = useFBO({
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
  })
  const fboB = useFBO({
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
  })

  useEffect(() => {
    fboA.setSize(size.width, size.height)
    fboB.setSize(size.width, size.height)
  }, [size.width, size.height, fboA, fboB])

  const blendMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: blendFragment,
      uniforms: {
        u_texA: { value: null },
        u_texB: { value: null },
        u_crossfade: { value: 0.5 },
        u_gainA: { value: 1 },
        u_gainB: { value: 1 },
        u_blendMode: { value: 0 },
        u_audio: { value: new THREE.Vector4(0, 0, 0, 0) },
      },
      depthTest: false,
      depthWrite: false,
    })
  }, [])

  useEffect(() => {
    return () => {
      blendMat.dispose()
    }
  }, [blendMat])

  useFrame(() => {
    blendMat.uniforms.u_texA.value = fboA.texture
    blendMat.uniforms.u_texB.value = fboB.texture
    blendMat.uniforms.u_crossfade.value = crossfade
    blendMat.uniforms.u_gainA.value = gainA
    blendMat.uniforms.u_gainB.value = gainB
    blendMat.uniforms.u_blendMode.value = BLEND_MODE_INDEX[blendMode]
    const a = audioRef?.current ?? ZERO_BANDS
    ;(blendMat.uniforms.u_audio.value as THREE.Vector4).set(a.low, a.mid, a.high, a.level)
  })

  return (
    <>
      {deckA.effect.feedback ? (
        <DeckFeedbackRenderer
          key={`A-${deckA.effect.id}`}
          effect={deckA.effect}
          values={deckA.values}
          resetKey={deckA.resetKey}
          audioRef={audioRef}
          target={fboA}
        />
      ) : (
        <DeckSimpleRenderer
          key={`A-${deckA.effect.id}`}
          effect={deckA.effect}
          values={deckA.values}
          audioRef={audioRef}
          target={fboA}
        />
      )}
      {deckB.effect.feedback ? (
        <DeckFeedbackRenderer
          key={`B-${deckB.effect.id}`}
          effect={deckB.effect}
          values={deckB.values}
          resetKey={deckB.resetKey}
          audioRef={audioRef}
          target={fboB}
        />
      ) : (
        <DeckSimpleRenderer
          key={`B-${deckB.effect.id}`}
          effect={deckB.effect}
          values={deckB.values}
          audioRef={audioRef}
          target={fboB}
        />
      )}
      <mesh>
        <planeGeometry args={[2, 2]} />
        <primitive attach="material" object={blendMat} />
      </mesh>
    </>
  )
}

export function MixCanvas(props: MixCanvasProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      frameloop="always"
    >
      <MixScene {...props} />
    </Canvas>
  )
}
