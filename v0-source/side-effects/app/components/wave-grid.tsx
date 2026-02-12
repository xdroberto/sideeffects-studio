'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function WaveGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // Setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.appendChild(renderer.domElement)

    // Create geometry
    const geometry = new THREE.PlaneGeometry(20, 20, 50, 50)
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    })
    const plane = new THREE.Mesh(geometry, material)
    scene.add(plane)

    // Position camera and plane
    camera.position.z = 8
    camera.position.y = -2
    camera.rotation.x = 0.5

    // Animation
    const animate = () => {
      requestAnimationFrame(animate)

      const time = Date.now() * 0.001
      const positions = geometry.attributes.position.array

      for (let i = 0; i < positions.length; i += 3) {
        const x = geometry.attributes.position.array[i]
        const y = geometry.attributes.position.array[i + 1]
        positions[i + 2] = Math.sin(x * 0.5 + time) * Math.cos(y * 0.5 + time) * 2
      }

      geometry.attributes.position.needsUpdate = true
      renderer.render(scene, camera)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      containerRef.current?.removeChild(renderer.domElement)
      geometry.dispose()
      material.dispose()
    }
  }, [])

  return <div ref={containerRef} className="fixed inset-0 z-0" />
}

