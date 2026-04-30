'use client'

import { useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { voronoi } from '@/app/sf01-internal/lib/shaders/voronoi'
import { fullscreenVertex } from '@/app/sf01-internal/lib/shaders/common/vertex'

/**
 * Preview público del shader Voronoi de SF-01.
 *
 * Reusa el mismo shader GLSL que el SF-01 interno completo, pero
 * expone solo 4 controles (Density, Motion, Hue Drift, Edge) en lugar
 * de los 10+ uniforms originales. Sin audio reactivity, sin overlays,
 * sin mix de decks — solo el efecto base.
 */

export interface VoronoiControls {
  density: number
  motion: number
  hueDrift: number
  edge: number
  /** Color A — vec3 normalizado [r, g, b] en 0..1. */
  colorA: [number, number, number]
  /** Color B — vec3 normalizado. */
  colorB: [number, number, number]
  /** Color del borde — vec3 normalizado. */
  edgeColor: [number, number, number]
}

interface VoronoiPreviewProps {
  controls: VoronoiControls
  className?: string
}

function VoronoiMesh({ controls }: { controls: VoronoiControls }) {
  const { size } = useThree()

  const material = useMemo(() => {
    const uniforms: Record<string, { value: any }> = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(size.width, size.height) },
      u_audio: { value: new THREE.Vector4(0, 0, 0, 0) },
    }
    for (const u of voronoi.uniforms) {
      if (u.type === 'vec3') {
        const d = u.default as [number, number, number]
        uniforms[u.name] = { value: new THREE.Vector3(d[0], d[1], d[2]) }
      } else {
        uniforms[u.name] = { value: u.default as number }
      }
    }
    return new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: voronoi.fragment!,
      uniforms,
      depthTest: false,
      depthWrite: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    material.uniforms.u_time.value = state.clock.getElapsedTime()
    ;(material.uniforms.u_resolution.value as THREE.Vector2).set(size.width, size.height)
    material.uniforms.u_density.value = controls.density
    material.uniforms.u_motion.value = controls.motion
    material.uniforms.u_hueDrift.value = controls.hueDrift
    material.uniforms.u_edgeIntensity.value = controls.edge
    ;(material.uniforms.u_colorA.value as THREE.Vector3).fromArray(controls.colorA)
    ;(material.uniforms.u_colorB.value as THREE.Vector3).fromArray(controls.colorB)
    ;(material.uniforms.u_edgeColor.value as THREE.Vector3).fromArray(controls.edgeColor)
    // Audio fijo en cero — sin micrófono en el preview público.
    ;(material.uniforms.u_audio.value as THREE.Vector4).set(0, 0, 0, 0)
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

export function VoronoiPreview({ controls, className }: VoronoiPreviewProps) {
  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        orthographic
        camera={{ position: [0, 0, 1], near: 0, far: 2 }}
      >
        <VoronoiMesh controls={controls} />
      </Canvas>
    </div>
  )
}
