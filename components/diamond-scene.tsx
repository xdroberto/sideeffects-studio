"use client"

import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Sparkles } from "@react-three/drei"
import * as THREE from "three"

// Global mouse state updated via window listener (bypasses z-index blocking)
const globalMouse = { x: 0, y: 0 }

function Diamond() {
    const groupRef = useRef<THREE.Group>(null)
    const width = 5
    const height = 3

    const smoothMouse = useRef({ x: 0, y: 0 })

    useFrame(() => {
        if (groupRef.current) {
            // Smooth the global mouse input
            smoothMouse.current.x = THREE.MathUtils.lerp(smoothMouse.current.x, globalMouse.x, 0.05)
            smoothMouse.current.y = THREE.MathUtils.lerp(smoothMouse.current.y, globalMouse.y, 0.05)

            // Diamond subtly follows cursor
            const targetRotY = smoothMouse.current.x * Math.PI * 0.08  // ±14° horizontal
            const targetRotX = -smoothMouse.current.y * Math.PI * 0.06  // ±11° vertical

            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.05)
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.05)
        }
    })

    // Shared positions for Wave and Lines
    const wavePositions = useMemo(() => new Float32Array(100 * 3), [])

    return (
        <group ref={groupRef}>
            <Wave width={width} height={height} positions={wavePositions} />
            <ConnectingLines width={width} height={height} wavePositions={wavePositions} />
        </group>
    )
}

function Wave({ width, height, positions }: { width: number, height: number, positions: Float32Array }) {
    const pointsRef = useRef<THREE.Points>(null)
    const numPoints = 100 // Match shared size

    useFrame((state) => {
        if (!pointsRef.current) return

        const time = state.clock.getElapsedTime() * 0.2 // Reduced speed from 0.5 to 0.2
        const pts = pointsRef.current.geometry.attributes.position.array as Float32Array

        // Update sine wave points
        for (let i = 0; i < numPoints; i++) {
            const x = (i / (numPoints - 1)) * width * 2 - width
            const y = Math.sin(x * 1.0 + time * 5) * height * 0.2

            pts[i * 3] = x
            pts[i * 3 + 1] = y
            pts[i * 3 + 2] = 0

            // Update shared positions for lines
            positions[i * 3] = x
            positions[i * 3 + 1] = y
            positions[i * 3 + 2] = 0
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true
    })

    // Dot texture
    const texture = useMemo(() => {
        if (typeof document === 'undefined') return null
        const canvas = document.createElement("canvas")
        canvas.width = 32
        canvas.height = 32
        const ctx = canvas.getContext("2d")
        if (ctx) {
            ctx.beginPath()
            ctx.arc(16, 16, 14, 0, Math.PI * 2)
            ctx.fillStyle = "white"
            ctx.fill()
        }
        return new THREE.CanvasTexture(canvas)
    }, [])

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                map={texture}
                size={0.15}
                sizeAttenuation={true}
                color="red"
                transparent
                alphaTest={0.5}
                opacity={0.8}
            />
        </points>
    )
}

// Connecting Lines Component
function ConnectingLines({ width, height, wavePositions }: { width: number, height: number, wavePositions: Float32Array }) {
    const linesRef = useRef<THREE.LineSegments>(null)
    const numPoints = 100 // Must match Wave numPoints

    // Initial Geometry
    const lineGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry()
        // 2 lines per wave point (up and down) => 4 vertices per wave point
        const totalVertices = numPoints * 4
        const positions = new Float32Array(totalVertices * 3)
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        return geo
    }, [])

    useFrame(() => {
        if (!linesRef.current || !wavePositions) return

        const positions = linesRef.current.geometry.attributes.position.array as Float32Array

        for (let i = 0; i < numPoints; i++) {
            const waveIdx = i * 3
            const lineIdx = i * 4 * 3 // 4 vertices * 3 coords

            const x = wavePositions[waveIdx]
            const y = wavePositions[waveIdx + 1]
            const z = wavePositions[waveIdx + 2]

            // Line to Top (0, height, 0)
            positions[lineIdx] = x
            positions[lineIdx + 1] = y
            positions[lineIdx + 2] = z

            positions[lineIdx + 3] = 0
            positions[lineIdx + 4] = height
            positions[lineIdx + 5] = 0

            // Line to Bottom (0, -height, 0)
            positions[lineIdx + 6] = x
            positions[lineIdx + 7] = y
            positions[lineIdx + 8] = z

            positions[lineIdx + 9] = 0
            positions[lineIdx + 10] = -height
            positions[lineIdx + 11] = 0
        }
        linesRef.current.geometry.attributes.position.needsUpdate = true
    })

    return (
        <lineSegments ref={linesRef} geometry={lineGeo}>
            <lineBasicMaterial color="red" transparent opacity={0.6} linewidth={2} />
        </lineSegments>
    )
}

function TwinklingStars({ count = 1000 }: { count?: number }) {
    const meshRef = useRef<THREE.Points>(null)

    const { positions, speeds, phases, baseSizes } = useMemo(() => {
        const positions = new Float32Array(count * 3)
        const speeds = new Float32Array(count)
        const phases = new Float32Array(count)
        const baseSizes = new Float32Array(count)

        for (let i = 0; i < count; i++) {
            const r = 30 + Math.random() * 50
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
            positions[i * 3 + 2] = r * Math.cos(phi)

            speeds[i] = 0.2 + Math.random() * 1.0
            phases[i] = Math.random() * Math.PI * 2
            baseSizes[i] = 0.05 + Math.random() * 0.15 // Tiny stars
        }
        return { positions, speeds, phases, baseSizes }
    }, [count])

    const sizeBuffer = useMemo(() => new Float32Array(baseSizes), [baseSizes])

    useFrame((state) => {
        if (!meshRef.current) return
        const time = state.clock.getElapsedTime()
        const sizeAttr = meshRef.current.geometry.attributes.size as THREE.BufferAttribute
        const arr = sizeAttr.array as Float32Array

        for (let i = 0; i < count; i++) {
            const twinkle = (Math.sin(time * speeds[i] + phases[i]) + 1) * 0.5
            arr[i] = baseSizes[i] * (0.2 + twinkle * 0.8)
        }
        sizeAttr.needsUpdate = true
    })

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-size" args={[sizeBuffer, 1]} />
            </bufferGeometry>
            <pointsMaterial
                color="white"
                size={0.1}
                sizeAttenuation
                transparent
                opacity={0.8}
            />
        </points>
    )
}

function ShootingStars() {
    const maxStars = 5
    const meshRef = useRef<THREE.Group>(null)

    const stars = useMemo(() => {
        return Array.from({ length: maxStars }, () => ({
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            progress: 0,
            active: false,
            nextSpawn: Math.random() * 5 + 3, // 3-8 seconds until first spawn
            trail: [] as THREE.Vector3[],
        }))
    }, [])

    useFrame((state, delta) => {
        if (!meshRef.current) return
        const time = state.clock.getElapsedTime()

        stars.forEach((star, idx) => {
            if (!star.active) {
                star.nextSpawn -= delta
                if (star.nextSpawn <= 0) {
                    // Spawn from random edge
                    const side = Math.random()
                    const startX = (Math.random() - 0.5) * 40
                    const startY = 10 + Math.random() * 15
                    const startZ = -5 + Math.random() * -20

                    star.position.set(startX, startY, startZ)
                    // Shoot downward-diagonal
                    const angle = -0.3 - Math.random() * 0.5
                    const speed = 15 + Math.random() * 20
                    star.velocity.set(
                        (Math.random() > 0.5 ? 1 : -1) * speed * 0.6,
                        speed * angle,
                        0
                    )
                    star.progress = 0
                    star.active = true
                    star.trail = []
                }
                return
            }

            // Move
            star.position.add(star.velocity.clone().multiplyScalar(delta))
            star.progress += delta

            // Deactivate after 1.5s
            if (star.progress > 1.5) {
                star.active = false
                star.nextSpawn = 4 + Math.random() * 8 // 4-12s until next
            }
        })

        // Update line children
        const children = meshRef.current.children
        stars.forEach((star, idx) => {
            const line = children[idx] as THREE.Line
            if (!line) return

            if (star.active) {
                // Build trail
                star.trail.push(star.position.clone())
                if (star.trail.length > 12) star.trail.shift()

                const positions = new Float32Array(star.trail.length * 3)
                star.trail.forEach((p, i) => {
                    positions[i * 3] = p.x
                    positions[i * 3 + 1] = p.y
                    positions[i * 3 + 2] = p.z
                })
                line.geometry.dispose()
                line.geometry = new THREE.BufferGeometry()
                line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
                line.visible = true;
                (line.material as THREE.LineBasicMaterial).opacity = 1 - star.progress / 1.5
            } else {
                line.visible = false
            }
        })
    })

    return (
        <group ref={meshRef}>
            {Array.from({ length: maxStars }, (_, i) => (
                <line key={i}>
                    <bufferGeometry />
                    <lineBasicMaterial color="white" transparent opacity={0.8} linewidth={1} />
                </line>
            ))}
        </group>
    )
}

export function DiamondScene() {
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Normalize to -1 to 1 range (same as R3F state.mouse)
            globalMouse.x = (e.clientX / window.innerWidth) * 2 - 1
            globalMouse.y = -(e.clientY / window.innerHeight) * 2 + 1
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    return (
        <div className="fixed inset-0 z-0 bg-black">
            <Canvas camera={{ position: [0, 2, 12], fov: 45 }} gl={{ antialias: true, alpha: false, stencil: false, depth: true }}>
                <color attach="background" args={['black']} />
                <Diamond />

                {/* Background Atmosphere */}
                <TwinklingStars count={1000} />
                <ShootingStars />
                <Sparkles count={50} scale={10} size={2} speed={0.4} opacity={0.2} color="#ff0000" />

                {/* Subtle ambient glow via emissive lighting */}
                <ambientLight intensity={0.5} />
            </Canvas>

            {/* Radial Gradient Overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: "radial-gradient(circle at center, rgba(255,0,0,0.05) 0%, transparent 70%)",
                }}
            />
        </div>
    )
}
