"use client"

import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Line, Sparkles, Stars } from "@react-three/drei"
import * as THREE from "three"

function Diamond() {
    const groupRef = useRef<THREE.Group>(null)
    const waveGeometryRef = useRef<THREE.BufferGeometry>(null)

    // Configuration
    const width = 5
    const height = 3
    const lines = 100 // Smoothness

    // Generate Static Diamond Lines (Segments)
    const diamondPoints = useMemo(() => {
        const pts = []
        for (let i = 0; i <= lines; i++) {
            const t = i / lines
            // Top to right
            pts.push([0, height, 0], [width * t, height * (1 - t), 0])
            // Right to bottom
            pts.push([width, 0, 0], [width * (1 - t), -height * t, 0])
            // Bottom to left
            pts.push([0, -height, 0], [-width * t, -height * (1 - t), 0])
            // Left to top
            pts.push([-width, 0, 0], [-width * (1 - t), height * t, 0])
        }
        return pts as [number, number, number][]
    }, [])

    useFrame((state) => {
        if (groupRef.current) {
            const time = state.clock.getElapsedTime()

            // Mouse interaction
            const mouseX = state.mouse.x * 0.5
            const mouseY = state.mouse.y * 0.5

            // Auto rotation + mouse influence
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, Math.sin(time * 0.5) * 0.1 + mouseX, 0.1)
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, Math.cos(time * 0.5) * 0.1 + mouseY, 0.1)
        }
    })

    // Shared positions for Wave and Lines
    const wavePositions = useMemo(() => new Float32Array(100 * 3), [])

    return (
        <group ref={groupRef}>
            {/* Diamond Structure */}
            <Line
                points={diamondPoints}
                color="red"
                lineWidth={1}
                segments
                transparent
                opacity={0.8}
            />

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

export function DiamondScene() {
    return (
        <div className="fixed inset-0 z-0 bg-black">
            <Canvas camera={{ position: [0, 2, 12], fov: 45 }} gl={{ antialias: false, alpha: false, stencil: false, depth: false }}>
                <color attach="background" args={['black']} />
                <Diamond />

                {/* Background Atmosphere */}
                <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
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
