"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { Line2 } from "three/examples/jsm/lines/Line2"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial"
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry"

export function DiamondLogo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  const isWebGLAvailable = () => {
    try {
      const canvas = document.createElement("canvas")
      return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")))
    } catch (e) {
      return false
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    if (!isWebGLAvailable()) {
      setError("WebGL is not supported in your browser.")
      return
    }

    try {
      // Setup
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      })
      renderer.setSize(window.innerWidth, window.innerHeight)
      containerRef.current.appendChild(renderer.domElement)

      // Create diamond outline
      const diamondGeometry = new LineGeometry()
      const width = 5
      const height = 3
      const lines = 150 // Increased number of lines for smoother outline
      const positions = []

      // Create lines radiating from corners
      for (let i = 0; i <= lines; i++) {
        const t = i / lines
        // Top to right
        positions.push(0, height, 0, width * t, height * (1 - t), 0)
        // Right to bottom
        positions.push(width, 0, 0, width * (1 - t), -height * t, 0)
        // Bottom to left
        positions.push(0, -height, 0, -width * t, -height * (1 - t), 0)
        // Left to top
        positions.push(-width, 0, 0, -width * (1 - t), height * t, 0)
      }

      diamondGeometry.setPositions(positions)

      const lineMaterial = new LineMaterial({
        color: new THREE.Color(1, 0, 0),
        linewidth: 0.0, // Increased line width for better visibility
        transparent: true,
        opacity: 1,
      })

      const diamond = new Line2(diamondGeometry, lineMaterial)
      diamond.computeLineDistances()
      scene.add(diamond)

      // Create sine wave
      const waveGeometry = new THREE.BufferGeometry()
      const wavePoints = []
      const numPoints = 100 // NUMERO DE PUNTOS

      for (let i = 0; i < numPoints; i++) {
        const x = (i / (numPoints - 1)) * width * 2 - width
        wavePoints.push(x, Math.sin(x * 1.0) * height * 0.35, 0)
      }

      waveGeometry.setAttribute("position", new THREE.Float32BufferAttribute(wavePoints, 3))

      const pointsMaterial = new THREE.PointsMaterial({
        color: new THREE.Color(1, 0, 0),
        size: 0.15, // Reduced point size for clearer effect
        transparent: true,
        opacity: 1,
        sizeAttenuation: true,
        alphaTest: 0.5,
        map: new THREE.TextureLoader().load("/circle.png"), // Añade esta línea
      })

      const wave = new THREE.Points(waveGeometry, pointsMaterial)
      scene.add(wave)

      // Create lines from wave points to top and bottom vertices
      const linesGeometry = new LineGeometry()
      const linesPositions = []

      for (let i = 0; i < wavePoints.length; i += 3) {
        // Line to top vertex
        linesPositions.push(wavePoints[i], wavePoints[i + 1], wavePoints[i + 2])
        linesPositions.push(0, height, 0)

        // Line to bottom vertex
        linesPositions.push(wavePoints[i], wavePoints[i + 1], wavePoints[i + 2])
        linesPositions.push(0, -height, 0)
      }

      linesGeometry.setPositions(linesPositions)

      const linesMaterial = new LineMaterial({
        color: new THREE.Color(1, 0, 0),
        linewidth: 1.35, // Reduced line width for less visual clutter
        transparent: true,
        opacity: 1.0, // Reduced opacity for better visibility of overlapping lines
      })

      const waveLines = new Line2(linesGeometry, linesMaterial)
      waveLines.computeLineDistances()
      scene.add(waveLines)

      // Position camera for perfect isometric view
      camera.position.set(0, 2, 12)
      camera.lookAt(0, 0, 0)

      // Animation
      const animate = () => {
        requestAnimationFrame(animate)

        const time = Date.now() * 0.002 // Increased speed of animation

        // Update wave points
        const wavePositions = waveGeometry.attributes.position.array
        for (let i = 0; i < wavePositions.length; i += 3) {
          const x = wavePositions[i]
          const y = Math.sin(x * 1.0 + time) * height * 0.2
          wavePositions[i + 1] = y
        }
        waveGeometry.attributes.position.needsUpdate = true

        // Update wave lines
        const newLinePositions = []
        for (let i = 0; i < wavePositions.length; i += 3) {
          newLinePositions.push(wavePositions[i], wavePositions[i + 1], wavePositions[i + 2])
          newLinePositions.push(0, height, 0)
          newLinePositions.push(wavePositions[i], wavePositions[i + 1], wavePositions[i + 2])
          newLinePositions.push(0, -height, 0)
        }
        linesGeometry.setPositions(newLinePositions)

        // Subtle diamond animation
        diamond.rotation.y = Math.sin(time * 0.5) * 0.05
        diamond.rotation.x = Math.cos(time * 0.5) * 0.05

        lineMaterial.resolution.set(window.innerWidth, window.innerHeight)
        linesMaterial.resolution.set(window.innerWidth, window.innerHeight)

        renderer.render(scene, camera)
      }

      animate()

      // Handle resize
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
        lineMaterial.resolution.set(window.innerWidth, window.innerHeight)
        linesMaterial.resolution.set(window.innerWidth, window.innerHeight)
      }
      window.addEventListener("resize", handleResize)

      // Create circle texture for points
      const createCircleTexture = () => {
        const canvas = document.createElement("canvas")
        canvas.width = 64
        canvas.height = 64
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.beginPath()
          ctx.arc(32, 32, 30, 0, Math.PI * 2)
          ctx.fillStyle = "white"
          ctx.fill()
        }
        return canvas
      }

      // Use the created texture
      pointsMaterial.map = new THREE.CanvasTexture(createCircleTexture())

      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize)
        containerRef.current?.removeChild(renderer.domElement)
        diamondGeometry.dispose()
        waveGeometry.dispose()
        linesGeometry.dispose()
        lineMaterial.dispose()
        pointsMaterial.dispose()
        linesMaterial.dispose()
      }
    } catch (err) {
      console.error("Error initializing Three.js:", err)
      setError("Failed to initialize the logo. Please try refreshing the page.")
      return
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 flex items-center justify-center"
      style={{
        background: "radial-gradient(circle at center, rgba(255,0,0,0.05) 0%, transparent 70%)",
      }}
    >
      {error && (
        <div className="text-red-500 text-center">
          <p>{error}</p>
          <p>Please try using a different browser or device.</p>
        </div>
      )}
    </div>
  )
}

