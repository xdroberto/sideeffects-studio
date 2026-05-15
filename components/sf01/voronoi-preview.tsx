'use client'

import { useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { voronoi } from '@/lib/shaders/sf01/voronoi'
import { fullscreenVertex } from '@/lib/shaders/sf01/common/vertex'
import { hexToRgb01 } from '@/lib/sf01/preview-config'

/**
 * Preview público del shader Voronoi de SF-01.
 *
 * Reusa el mismo shader GLSL que el SF-01 interno completo. Sin audio
 * reactivity, sin overlays, sin mix de decks — solo el efecto base.
 *
 * Toma `values` como un mapeo genérico de uniform name → number, así
 * el demo unificado puede pasar el state del slider directo. Y `palette`
 * con tres colores hex que se mapean a los uniforms u_colorA/B/edge.
 */

export interface ShaderPalette {
  a: string
  b: string
  edge: string
}

export interface VoronoiMeshProps {
  values: Record<string, number>
  palette: ShaderPalette
}

/**
 * Mesh únicamente — sin Canvas wrapper. Usado por el DemoCanvas
 * unificado que comparte el contexto WebGL entre shaders.
 */
export function VoronoiMesh({ values, palette }: VoronoiMeshProps) {
  const { size } = useThree()

  const material = useMemo(() => {
    const uniforms: Record<string, { value: unknown }> = {
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
      uniforms: uniforms as Record<string, THREE.IUniform>,
      depthTest: false,
      depthWrite: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    material.uniforms.u_time.value = state.clock.getElapsedTime()
    ;(material.uniforms.u_resolution.value as THREE.Vector2).set(size.width, size.height)
    // Apply slider values to uniforms — only those that exist.
    for (const [key, value] of Object.entries(values)) {
      const slot = material.uniforms[key]
      if (slot) slot.value = value as number
    }
    const colorA = hexToRgb01(palette.a)
    const colorB = hexToRgb01(palette.b)
    const colorEdge = hexToRgb01(palette.edge)
    ;(material.uniforms.u_colorA.value as THREE.Vector3).fromArray(colorA)
    ;(material.uniforms.u_colorB.value as THREE.Vector3).fromArray(colorB)
    ;(material.uniforms.u_edgeColor.value as THREE.Vector3).fromArray(colorEdge)
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

/**
 * Wrapper standalone con su propio Canvas. Mantenido por si alguien
 * lo usa fuera del DemoCanvas unificado, pero `sf01-client.tsx` ya
 * no lo usa.
 */
export function VoronoiPreview({ values, palette, className }: VoronoiMeshProps & { className?: string }) {
  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        orthographic
        camera={{ position: [0, 0, 1], near: 0, far: 2 }}
      >
        <VoronoiMesh values={values} palette={palette} />
      </Canvas>
    </div>
  )
}
