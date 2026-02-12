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
            groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.05
            groupRef.current.rotation.x = Math.cos(time * 0.5) * 0.05
        }
    })

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
            <Wave width={width} height={height} />
        </group>
    )
}

function Wave({ width, height }: { width: number, height: number }) {
    const pointsRef = useRef<THREE.Points>(null)
    const linesRef = useRef<any>(null) // Ref for the Line component to update geometry if needed

    // Initial Wave Points
    const numPoints = 100
    const { positions, linePositions } = useMemo(() => {
        const positions = new Float32Array(numPoints * 3)
        // We will update these in useFrame, just init here
        for (let i = 0; i < numPoints; i++) {
            const x = (i / (numPoints - 1)) * width * 2 - width
            positions[i * 3] = x
            positions[i * 3 + 1] = 0
            positions[i * 3 + 2] = 0
        }
        return { positions, linePositions: [] } // lines handle dynamically?
    }, [width])

    useFrame((state) => {
        if (!pointsRef.current) return

        const time = state.clock.getElapsedTime() * 0.5 // Speed matches original roughly
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array

        // Update sine wave points
        for (let i = 0; i < numPoints; i++) {
            const x = (i / (numPoints - 1)) * width * 2 - width
            const y = Math.sin(x * 1.0 + time * 5) * height * 0.2

            positions[i * 3] = x
            positions[i * 3 + 1] = y
            positions[i * 3 + 2] = 0
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true
    })

    // Connecting lines are tricky to update performantly via declarative <Line> props every frame without recreating array
    // However, we can use a custom BufferGeometry for lines if we want high perf.
    // For MVP, if we skip the connecting lines for the wave, it looks cleaner. 
    // Or we can implement them. The original had lines from wave points to top/bottom tips.
})

// Dot texture
const texture = useMemo(() => {
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
                count={numPoints}
                array={positions}
                itemSize={3}
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

export function DiamondScene() {
    return (
        <div className="fixed inset-0 z-0 bg-black">
            <Canvas camera={{ position: [0, 2, 12], fov: 45 }} gl={{ antialias: true, alpha: true }}>
                <Diamond />

                {/* Background Atmosphere */}
                <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                <Sparkles count={50} scale={10} size={2} speed={0.4} opacity={0.2} color="#ff0000" />

                {/* Ambient Light if needed, though lines/points are basic materials usually */}
                <ambientLight intensity={0.5} />
            </Canvas>

            {/* Radial Gradient Overlay to match original feel */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: "radial-gradient(circle at center, rgba(255,0,0,0.05) 0%, transparent 70%)",
                }}
            />
        </div>
    )
}
