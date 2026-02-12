'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function AnimatedGeometry() {
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
    const geometry = new THREE.PlaneGeometry(5, 5, 32, 32)
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    })
    const plane = new THREE.Mesh(geometry, material)
    scene.add(plane)

    // Position camera
    camera.position.z = 5

    // Animation
    const animate = () => {
      requestAnimationFrame(animate)

      // Update vertices for wave effect
      const time = Date.now() * 0.001
      const positions = geometry.attributes.position.array
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i]
        const y = positions[i + 1]
        positions[i + 2] = Math.sin(x + time) * 0.5 + Math.cos(y + time) * 0.5
      }
      geometry.attributes.position.needsUpdate = true

      // Rotate slowly
      plane.rotation.x = Math.PI * 0.25
      plane.rotation.y = Math.sin(time * 0.5) * 0.1

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

  return <div ref={containerRef} className="fixed inset-0 -z-10" />
}

