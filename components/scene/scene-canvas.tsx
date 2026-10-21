"use client"

import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Sparkles } from "@react-three/drei"
import * as THREE from "three"
import { BOUNDS, SEGMENTS, ease, morph, writeShape } from "./shapes.mjs"
import type { ShapeKind } from "./shapes.mjs"
import { BASE_DOT, BASE_LINE, createHero } from "./hero.mjs"
import { sceneState } from "./state"
import { ShootingStars, TwinklingStars } from "./stars"
import { Ink } from "./ink"

/**
 * Escena persistente del sitio (B1 + B2). Vive en el layout, así que no se
 * desmonta al navegar: las 200 cuerdas del diamante se reacomodan en la
 * portada de cada página y, en el home, se pliegan sobre su onda al bajar
 * hacia la galería mientras la onda siembra la tinta.
 *
 * Frameloop "demand": el home anima siempre; en las demás páginas la escena
 * se detiene cuando la portada ya salió de pantalla y no hay morph, y
 * vuelve con el scroll, el mouse o un cambio de ruta.
 *
 * En el home, el diamante responde al mouse y al toque (hero.mjs).
 */

// Puntero global normalizado (-1..1), como globalMouse en el hero original.
const mouse = { x: 0, y: 0 }

// Puntero del hero, también en NDC: el mouse cuenta al pasar; el dedo,
// solo al tocar, para no pelear con el scroll. `hold`: segundos que el
// toque sigue marcando su lugar.
const touch = { inside: false, x: 0, y: 0, tap: false, hold: 0 }

const smooth = (a: number, b: number, x: number) => {
    const u = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return u * u * (3 - 2 * u)
}
const lerp = (a: number, b: number, x: number) => a + (b - a) * x

/** B1: avance del scroll del home hasta que la galería entra. */
function homeProgress(): number {
    const g = document.getElementById('gallery')
    if (!g) return 0
    const top = g.getBoundingClientRect().top + window.scrollY
    const end = Math.max(1, top - window.innerHeight * 0.25)
    return Math.min(1, Math.max(0, window.scrollY / end))
}

const tmp = new THREE.Vector3()
/** De coordenadas de pantalla (NDC) al plano z = 0 de la escena. */
function ndcToPlane(camera: THREE.Camera, x: number, y: number) {
    tmp.set(x, y, 0.5).unproject(camera)
    const p = camera.position
    const k = -p.z / (tmp.z - p.z)
    return { x: p.x + (tmp.x - p.x) * k, y: p.y + (tmp.y - p.y) * k }
}

type Placement = { x: number; y: number; s: number; alpha: number; rot: number; visible: boolean }

/**
 * Del puntero (NDC) al plano de la onda, que gira con el mouse. ndcToPlane
 * no sirve aquí: corta el z = 0 del mundo, y en los extremos de la onda el
 * giro la separa más de una unidad de ese plano. Se lleva el rayo de la
 * cámara al marco local (sin la traslación, se deshace el giro en X y luego
 * en Y) y se corta con z = 0.
 */
function toWave(camera: THREE.Camera, nx: number, ny: number, pl: Placement, cx: number, sx: number, cy: number, sy: number) {
    camera.updateMatrixWorld()
    tmp.set(nx, ny, 0.5).unproject(camera)
    const o = camera.position
    let ox = o.x - pl.x, oy = o.y - pl.y, oz = o.z
    let dx = tmp.x - o.x, dy = tmp.y - o.y, dz = tmp.z - o.z
    let r = oy * cx + oz * sx
    oz = -oy * sx + oz * cx
    oy = r
    r = dy * cx + dz * sx
    dz = -dy * sx + dz * cx
    dy = r
    r = ox * cy - oz * sy
    oz = ox * sy + oz * cy
    ox = r
    r = dx * cy - dz * sy
    dz = dx * sy + dz * cy
    dx = r
    if (Math.abs(dz) < 1e-6) return null
    const k = -oz / dz
    return { x: (ox + dx * k) / pl.s, y: (oy + dy * k) / pl.s }
}

/**
 * Caja de la portada que marca la página con [data-scene-cover], en NDC.
 * La página decide dónde va (a la derecha de su encabezado en escritorio,
 * detrás del título en celular; en Playground, el carrete del hilo), así
 * la escena acompaña al layout real en cualquier ancho y sube con el scroll.
 */
function coverBox() {
    const el = document.querySelector<HTMLElement>('[data-scene-cover]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return null
    const W = window.innerWidth, H = window.innerHeight
    return {
        cx: ((r.left + r.width / 2) / W) * 2 - 1,
        cy: 1 - ((r.top + r.height / 2) / H) * 2,
        w: r.width / W,
        h: r.height / H,
        visible: r.bottom > -40 && r.top < H + 40,
    }
}

/**
 * Dónde y de qué tamaño va cada forma. El home ocupa el centro, como el
 * hero original; las portadas, la caja que marca cada página.
 */
function placementFor(kind: ShapeKind, camera: THREE.Camera, vw: number, vh: number, wide: boolean): Placement {
    if (kind === 'home') return { x: 0, y: 0, s: 1, alpha: 1, rot: 1, visible: true }
    const box = kind === 'line' ? null : coverBox()
    if (!box) {
        // Legales y 404 (o una página que aún monta): una línea tranquila al centro.
        return { x: 0, y: 0, s: Math.min(1, (vw * 0.8) / BOUNDS.line.w), alpha: 0.35, rot: 0.3, visible: kind !== 'line' }
    }
    const b = BOUNDS[kind]
    // En Playground las cuerdas se enrollan en el carrete del que sale el hilo rojo.
    const spool = kind === 'playground'
    const s = Math.min((vw * box.w) / b.w, (vh * box.h) / b.h)
    const c = ndcToPlane(camera, box.cx, box.cy)
    // En celular la portada va detrás del título: presente, pero sin competir con la lectura.
    const alpha = spool ? (wide ? 0.9 : 0.75) : (wide ? 0.8 : 0.22)
    return { x: c.x, y: c.y, s, alpha, rot: spool ? 0.15 : 0.5, visible: box.visible }
}

function makeDotTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (ctx) {
        ctx.beginPath()
        ctx.arc(16, 16, 14, 0, Math.PI * 2)
        ctx.fillStyle = 'white'
        ctx.fill()
    }
    return new THREE.CanvasTexture(canvas)
}

/** Las 200 cuerdas y los 100 puntos de la onda, con su morph entre formas. */
function Strings() {
    const lines = useRef<THREE.LineSegments>(null)
    const dots = useRef<THREE.Points>(null)
    const buf = useMemo(() => {
        const b = {
            from: new Float32Array(SEGMENTS * 4),
            to: new Float32Array(SEGMENTS * 4),
            cur: new Float32Array(SEGMENTS * 4),
            linePos: new Float32Array(SEGMENTS * 2 * 3),
            dotPos: new Float32Array(100 * 3),
        }
        // Primera forma sin morph: la de la ruta con la que se abrió el sitio.
        writeShape(sceneState.kind, b.cur, { t: 0 })
        b.from.set(b.cur)
        return b
    }, [])
    const dotTex = useMemo(() => makeDotTexture(), [])
    useEffect(() => () => dotTex.dispose(), [dotTex])
    // A: la onda del home es una cuerda que se pulsa (hero.mjs).
    const hero = useMemo(() => createHero(), [])
    const st = useRef({ kind: sceneState.kind, u: 1, t: 0, mx: 0, my: 0, p: 0, mix: 0, from: null as Placement | null, place: null as Placement | null })

    useFrame((state, delta) => {
        const s = st.current
        const dt = Math.min(delta, 1 / 20)
        const reduce = sceneState.reduce
        const kind = sceneState.kind

        // Cambio de ruta: el morph parte de lo que se ve en este momento.
        if (kind !== s.kind) {
            buf.from.set(buf.cur)
            s.from = s.place
            s.kind = kind
            s.u = reduce ? 1 : 0
        }
        if (!reduce) s.t += dt
        s.u = Math.min(1, s.u + dt / 1.2)
        sceneState.morphing = s.u < 1

        // B1: en el home, el diamante se pliega sobre su onda al bajar.
        const target = kind === 'home' ? homeProgress() : 0
        s.p = reduce ? target : lerp(s.p, target, 1 - Math.exp(-dt * 7))
        sceneState.progress = s.p
        const fold = kind === 'home' ? smooth(0.06, 0.36, s.p) : 0

        // Lugar y tamaño, también con morph.
        const vp = state.viewport.getCurrentViewport(state.camera, [0, 0, 0])
        const goal = placementFor(kind, state.camera, vp.width, vp.height, state.size.width >= 768)
        const pf = s.from ?? goal
        const e = ease(s.u)
        const pl: Placement = {
            x: lerp(pf.x, goal.x, e),
            y: lerp(pf.y, goal.y, e),
            s: lerp(pf.s, goal.s, e),
            alpha: lerp(pf.alpha, goal.alpha, e),
            rot: lerp(pf.rot, goal.rot, e),
            visible: goal.visible,
        }
        s.place = pl
        sceneState.coverVisible = goal.visible

        // El diamante sigue al mouse (±14° horizontal, ±11° vertical), como antes.
        if (!reduce) {
            const k = 1 - Math.pow(0.95, dt * 60)
            s.mx += (mouse.x - s.mx) * k
            s.my += (mouse.y - s.my) * k
        }
        const ry = s.mx * Math.PI * 0.08 * pl.rot
        const rx = -s.my * Math.PI * 0.06 * pl.rot
        const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx)

        // A: en el home, el diamante responde al mouse y al toque mientras se
        // ve; al bajar deja de escuchar y lo que se movía se calma solo.
        const live = kind === 'home' && !reduce
        if (live) {
            const on = s.p < 0.3
            const tap = on && touch.tap
            const w = on && (touch.inside || touch.hold > 0 || tap) ? toWave(state.camera, touch.x, touch.y, pl, cx, sx, cy, sy) : null
            hero.step(dt, { active: !!w, hover: !!w && touch.inside, tap: !!w && tap, x: w ? w.x : 0, y: w ? w.y : 0 })
        }
        touch.tap = false
        touch.hold = Math.max(0, touch.hold - dt)
        const h = hero.out
        if (live) writeShape('home', buf.to, { t: h.t, amp: h.amp, apex: 3 * h.apex * (1 - fold), disp: h.disp })
        else writeShape(kind, buf.to, { t: s.t, apex: 3 * (1 - fold) })
        morph(buf.from, buf.to, s.u, buf.cur)

        const P = buf.linePos
        for (let i = 0; i < SEGMENTS; i++) {
            for (let end = 0; end < 2; end++) {
                const lx = buf.cur[i * 4 + end * 2] * pl.s
                const ly = buf.cur[i * 4 + end * 2 + 1] * pl.s
                // Euler XYZ del grupo original: primero Y, luego X.
                const x1 = lx * cy
                const z1 = -lx * sy
                const o = (i * 2 + end) * 3
                P[o] = x1 + pl.x
                P[o + 1] = ly * cx - z1 * sx + pl.y
                P[o + 2] = ly * sx + z1 * cx
            }
        }
        for (let i = 0; i < 100; i++) {
            buf.dotPos[i * 3] = P[i * 6]
            buf.dotPos[i * 3 + 1] = P[i * 6 + 1]
            buf.dotPos[i * 3 + 2] = P[i * 6 + 2]
        }
        sceneState.dots.set(buf.dotPos)

        const homeLines = kind === 'home' ? 1 - smooth(0.3, 0.5, s.p) : 1
        const homeDots = kind === 'home' ? 1 - smooth(0.45, 0.62, s.p) : 0.6
        // El rojo sigue al hero en el home y vuelve al de siempre en las demás páginas.
        s.mix = reduce ? 0 : lerp(s.mix, live ? 1 : 0, 1 - Math.exp(-dt * 4))
        if (lines.current) {
            const attr = lines.current.geometry.attributes.position as THREE.BufferAttribute
            attr.needsUpdate = true
            const mat = lines.current.material as THREE.LineBasicMaterial
            mat.opacity = 0.95 * pl.alpha * homeLines
            mat.color.setRGB(lerp(BASE_LINE[0], h.line[0], s.mix), lerp(BASE_LINE[1], h.line[1], s.mix), lerp(BASE_LINE[2], h.line[2], s.mix), THREE.SRGBColorSpace)
            lines.current.visible = mat.opacity > 0.005
        }
        if (dots.current) {
            const attr = dots.current.geometry.attributes.position as THREE.BufferAttribute
            attr.needsUpdate = true
            const mat = dots.current.material as THREE.PointsMaterial
            mat.opacity = pl.alpha * homeDots
            mat.size = 0.2 * pl.s
            mat.color.setRGB(lerp(BASE_DOT[0], h.dot[0], s.mix), lerp(BASE_DOT[1], h.dot[1], s.mix), lerp(BASE_DOT[2], h.dot[2], s.mix), THREE.SRGBColorSpace)
            dots.current.visible = mat.opacity > 0.005
        }
    })

    return (
        <>
            <lineSegments ref={lines} frustumCulled={false}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[buf.linePos, 3]} />
                </bufferGeometry>
                {/* `linewidth` no lo respetan los navegadores en WebGL (siempre 1px);
                    opacidad alta y rojo saturado para que se lea en retina. */}
                <lineBasicMaterial color="#ff2222" transparent opacity={0.95} />
            </lineSegments>
            <points ref={dots} frustumCulled={false}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[buf.dotPos, 3]} />
                </bufferGeometry>
                <pointsMaterial map={dotTex} size={0.2} sizeAttenuation color="red" transparent alphaTest={0.4} opacity={1} />
            </points>
        </>
    )
}

/** Paralaje sutil de cámara (±0.4 / ±0.25 unidades), igual que el hero original. */
function CameraParallax() {
    const camera = useThree((s) => s.camera)
    const smoothed = useRef({ x: 0, y: 0 })
    useFrame(() => {
        if (sceneState.reduce) return
        smoothed.current.x = lerp(smoothed.current.x, mouse.x, 0.04)
        smoothed.current.y = lerp(smoothed.current.y, mouse.y, 0.04)
        camera.position.x = smoothed.current.x * 0.4
        camera.position.y = 2 + smoothed.current.y * 0.25
        camera.lookAt(0, 0, 0)
    })
    return null
}

/** Las chispas rojas solo acompañan al diamante del home. */
function HomeSparkles({ animate }: { animate: boolean }) {
    const group = useRef<THREE.Group>(null)
    useFrame(() => {
        if (group.current) group.current.visible = sceneState.kind === 'home'
    })
    return (
        <group ref={group}>
            <Sparkles count={80} scale={10} size={2.5} speed={animate ? 0.4 : 0} opacity={0.45} color="#ff3333" />
        </group>
    )
}

/** Decide cuándo pedir el siguiente cuadro (frameloop "demand"). */
function Driver() {
    const invalidate = useThree((s) => s.invalidate)
    useEffect(() => {
        sceneState.invalidate = invalidate
        const kick = () => invalidate()
        const onMove = (e: MouseEvent) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
            invalidate()
        }
        const toNdc = (e: PointerEvent) => {
            touch.x = (e.clientX / window.innerWidth) * 2 - 1
            touch.y = -(e.clientY / window.innerHeight) * 2 + 1
        }
        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return
            toNdc(e)
            touch.inside = true
        }
        const onPointerDown = (e: PointerEvent) => {
            // Solo el home escucha: un toque en otra página no debe quedar
            // pendiente y jalar la onda al volver.
            if (sceneState.kind !== 'home') return
            if (e.pointerType === 'mouse' && e.button !== 0) return
            // Un clic en un enlace o un botón es para eso, no para el diamante.
            if (e.target instanceof Element && e.target.closest('a, button, input, select, textarea, label, [role="button"]')) return
            toNdc(e)
            touch.tap = true
            touch.hold = 0.9
            invalidate()
        }
        // Si el toque se vuelve scroll, el dedo ya no marca un lugar de la onda.
        const onPointerCancel = () => {
            touch.hold = 0
        }
        const onMouseOut = (e: MouseEvent) => {
            if (!e.relatedTarget) touch.inside = false
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('pointermove', onPointerMove, { passive: true })
        window.addEventListener('pointerdown', onPointerDown, { passive: true })
        window.addEventListener('pointercancel', onPointerCancel)
        window.addEventListener('mouseout', onMouseOut)
        window.addEventListener('scroll', kick, { passive: true })
        window.addEventListener('resize', kick)
        invalidate()
        return () => {
            sceneState.invalidate = null
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('pointercancel', onPointerCancel)
            window.removeEventListener('mouseout', onMouseOut)
            window.removeEventListener('scroll', kick)
            window.removeEventListener('resize', kick)
        }
    }, [invalidate])
    useFrame(() => {
        // Con «reducir movimiento» solo hay cuadros a demanda (scroll, ruta, resize).
        if (sceneState.reduce) return
        if (sceneState.kind === 'home' || sceneState.morphing || sceneState.coverVisible) invalidate()
    })
    return null
}

export function SceneCanvas({ reduce }: { reduce: boolean }) {
    const animate = !reduce
    return (
        <Canvas
            frameloop="demand"
            dpr={[1, 1.75]}
            camera={{ position: [0, 2, 12], fov: 45 }}
            gl={{ antialias: true, alpha: false, stencil: false, depth: true, powerPreference: 'high-performance' }}
        >
            <color attach="background" args={['black']} />
            <Driver />
            <CameraParallax />
            <Strings />
            <Ink />
            <TwinklingStars count={1000} animate={animate} />
            <ShootingStars animate={animate} />
            <HomeSparkles animate={animate} />
            <ambientLight intensity={0.5} />
        </Canvas>
    )
}
