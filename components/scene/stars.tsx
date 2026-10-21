"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

// Movidas tal cual desde el antiguo components/diamond-scene.tsx: la
// atmósfera del hero ahora vive en la escena persistente del layout.

export function TwinklingStars({ count = 1000, animate }: { count?: number, animate: boolean }) {
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
        if (!animate) return
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

// Longitud máxima del trail por shooting star. Define el tamaño del
// buffer pre-alocado para evitar dispose+new en cada frame.
const SHOOTING_STAR_TRAIL_LEN = 12

export function ShootingStars({ animate }: { animate: boolean }) {
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
            // Buffer reutilizable: pre-aloja TRAIL_LEN puntos.
            positionBuffer: new Float32Array(SHOOTING_STAR_TRAIL_LEN * 3),
        }))
    }, [])

    // Geometrías persistentes ligadas a cada line. Se crean una vez con
    // tamaño fijo y solo se marca needsUpdate cuando cambia el contenido.
    const lineGeometries = useMemo(() => {
        return stars.map(star => {
            const geo = new THREE.BufferGeometry()
            geo.setAttribute(
                'position',
                new THREE.BufferAttribute(star.positionBuffer, 3),
            )
            // drawRange controla cuántos vértices se dibujan sin tocar el buffer.
            geo.setDrawRange(0, 0)
            return geo
        })
    }, [stars])

    useEffect(() => {
        return () => {
            // Cleanup explícito al desmontar.
            lineGeometries.forEach(g => g.dispose())
        }
    }, [lineGeometries])

    useFrame((state, delta) => {
        if (!animate) return
        if (!meshRef.current) return
        // Con frameloop "demand" el primer cuadro tras una pausa trae un
        // delta grande; lo acotamos para que las estelas no salten.
        const dt = Math.min(delta, 1 / 20)

        stars.forEach((star) => {
            if (!star.active) {
                star.nextSpawn -= dt
                if (star.nextSpawn <= 0) {
                    // Spawn from random edge
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
            star.position.x += star.velocity.x * dt
            star.position.y += star.velocity.y * dt
            star.position.z += star.velocity.z * dt
            star.progress += dt

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
            const geo = lineGeometries[idx]
            if (!geo) return

            if (star.active) {
                star.trail.push(new THREE.Vector3(star.position.x, star.position.y, star.position.z))
                if (star.trail.length > SHOOTING_STAR_TRAIL_LEN) star.trail.shift()

                const buf = star.positionBuffer
                for (let i = 0; i < star.trail.length; i++) {
                    const p = star.trail[i]!
                    buf[i * 3] = p.x
                    buf[i * 3 + 1] = p.y
                    buf[i * 3 + 2] = p.z
                }
                const attr = geo.attributes.position as THREE.BufferAttribute
                attr.needsUpdate = true
                geo.setDrawRange(0, star.trail.length)
                line.visible = true
                ;(line.material as THREE.LineBasicMaterial).opacity =
                    1 - star.progress / 1.5
            } else {
                geo.setDrawRange(0, 0)
                line.visible = false
            }
        })
    })

    return (
        <group ref={meshRef}>
            {stars.map((_, i) => (
                <line key={i}>
                    {/* `attach="geometry"` re-usa la geometría pre-alocada
                        (con buffer fijo + drawRange) en vez de crear una
                        nueva por frame. */}
                    <primitive object={lineGeometries[i]} attach="geometry" />
                    <lineBasicMaterial color="white" transparent opacity={0.8} linewidth={1} />
                </line>
            ))}
        </group>
    )
}
