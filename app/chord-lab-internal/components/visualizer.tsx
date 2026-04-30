'use client'

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  size: number
  life: number
}

type VisualEffect = 'particles' | 'toon'

const MAX_PARTICLES = 1000

const vertexShader = `
  attribute float size;
  attribute vec3 color;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
    gl_FragColor = vec4(vColor, vAlpha);
  }
`

interface VisualizerProps {
  currentEffect: 'particles' | 'toon'
  setCurrentEffect: (effect: 'particles' | 'toon') => void
  isPoweredOn: boolean
}

export const Visualizer = forwardRef<any, VisualizerProps>(({ currentEffect, setCurrentEffect, isPoweredOn }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const particleSystemRef = useRef<THREE.Points | null>(null)
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    addPattern: (note: string) => {
      if (sceneRef.current && isPoweredOn) {
        addNewParticles(note)
      }
    }
  }))

  const isWebGLAvailable = () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  const initThree = () => {
    if (!containerRef.current) return
    if (rendererRef.current && containerRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
      return
    }

    try {
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      const scene = new THREE.Scene()
      sceneRef.current = scene

      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
      camera.position.z = 50
      cameraRef.current = camera

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      if (!renderer.domElement) {
        throw new Error("Failed to create WebGL context")
      }
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio)
      containerRef.current.appendChild(renderer.domElement)
      rendererRef.current = renderer

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.enableZoom = false
      controlsRef.current = controls

      const composer = new EffectComposer(renderer)
      const renderPass = new RenderPass(scene, camera)
      composer.addPass(renderPass)

      const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85)
      composer.addPass(bloomPass)
      composerRef.current = composer

      const geometry = new THREE.BufferGeometry()
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })

      const particleSystem = new THREE.Points(geometry, material)
      scene.add(particleSystem)
      particleSystemRef.current = particleSystem

      for (let i = 0; i < MAX_PARTICLES; i++) {
        addNewParticles('C')
      }

      const animate = () => {
        requestAnimationFrame(animate)
        updateParticles()
        controls.update()
        composer.render()
      }
      animate()
    } catch (err) {
      console.error("Error initializing Three.js:", err)
      setError("Failed to initialize visualizer. Your browser may not support WebGL.")
      return
    }
  }

  const addNewParticles = (note: string) => {
    const frequency = note.charCodeAt(0) - 'A'.charCodeAt(0)
    const baseHue = frequency / 12
    const numParticles = 50 + Math.floor(Math.random() * 50)

    for (let i = 0; i < numParticles; i++) {
      const particle: Particle = {
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 40
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        ),
        color: new THREE.Color().setHSL((baseHue + Math.random() * 0.1) % 1, 0.7, 0.5),
        size: currentEffect === 'toon' ? 2 + Math.random() * 3 : 0.5 + Math.random() * 1.5,
        life: 1.0
      }
      if (particlesRef.current.length < MAX_PARTICLES) {
        particlesRef.current.push(particle)
      } else {
        particlesRef.current[Math.floor(Math.random() * MAX_PARTICLES)] = particle
      }
    }
  }

  const updateParticles = () => {
    const positions = new Float32Array(MAX_PARTICLES * 3)
    const colors = new Float32Array(MAX_PARTICLES * 3)
    const sizes = new Float32Array(MAX_PARTICLES)
    const alphas = new Float32Array(MAX_PARTICLES)

    particlesRef.current.forEach((particle, i) => {
      particle.position.add(particle.velocity)
      particle.life -= 0.01

      if (particle.life > 0) {
        positions[i * 3] = particle.position.x
        positions[i * 3 + 1] = particle.position.y
        positions[i * 3 + 2] = particle.position.z

        particle.color.toArray(colors, i * 3)
        sizes[i] = particle.size * (currentEffect === 'toon' ? particle.life : 1)
        alphas[i] = currentEffect === 'toon' ? particle.life : 1
      } else {
        particle.position.set(
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 40
        )
        particle.velocity.set(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        )
        particle.life = 1.0
        particle.color.setHSL(Math.random(), 0.7, 0.5)

        positions[i * 3] = particle.position.x
        positions[i * 3 + 1] = particle.position.y
        positions[i * 3 + 2] = particle.position.z
        particle.color.toArray(colors, i * 3)
        sizes[i] = particle.size
        alphas[i] = 1.0
      }
    })

    if (particleSystemRef.current) {
      const geometry = particleSystemRef.current.geometry as THREE.BufferGeometry
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.color.needsUpdate = true
      geometry.attributes.size.needsUpdate = true
      geometry.attributes.alpha.needsUpdate = true
    }
  }

  useEffect(() => {
    if (isPoweredOn) {
      if (!isWebGLAvailable()) {
        setError("WebGL is not supported in your browser.")
        return
      }
      initThree()
    }
    return () => {
      if (rendererRef.current) {
        if (rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement)
        }
        rendererRef.current.dispose()
      }
    }
  }, [isPoweredOn])

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && cameraRef.current && rendererRef.current && composerRef.current) {
        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight
        cameraRef.current.aspect = width / height
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(width, height)
        composerRef.current.setSize(width, height)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ aspectRatio: '16/9', position: 'relative', zIndex: 10, overflow: 'hidden' }}
    >
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-30">
          <span className="text-red-500 text-xl font-mono text-center px-4">{error}</span>
        </div>
      )}
      {!isPoweredOn && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-20">
          <span className="text-red-500 text-xl font-mono">Display Off</span>
        </div>
      )}
    </div>
  )
})

Visualizer.displayName = 'Visualizer'

export default Visualizer

