"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { sceneState } from "./state"

/**
 * Tinta del home (B1): al bajar, la onda del diamante siembra una
 * reacción-difusión Gray-Scott (la del boceto Turing de los reels) que
 * crece como laberinto detrás de la galería. Al volver arriba, el régimen
 * cambia a uno que se apaga y la simulación se reinicia.
 *
 * La semilla son los 100 puntos de la onda, dibujados con la cámara
 * principal en un render target: así la tinta nace exactamente de la
 * onda visible, con su perspectiva y su parallax. La simulación corre en
 * un par ping-pong HalfFloat (RGBA8 si el equipo no puede renderizar a
 * flotante) y se muestra con un quad que escribe en clip space, detrás de
 * todo lo demás.
 */

const smooth = (a: number, b: number, x: number) => {
    const u = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return u * u * (3 - 2 * u)
}

const QUAD_VS = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}`

const SIM_FS = /* glsl */ `
uniform sampler2D S;
uniform sampler2D seed;
uniform vec2 px;
uniform vec2 FK;
uniform float seedW;
uniform float init;
varying vec2 vUv;
void main() {
    if (init > 0.5) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }
    vec2 c = texture2D(S, vUv).xy;
    vec2 l = -c
        + 0.2 * (texture2D(S, vUv + vec2(px.x, 0.0)).xy + texture2D(S, vUv - vec2(px.x, 0.0)).xy
               + texture2D(S, vUv + vec2(0.0, px.y)).xy + texture2D(S, vUv - vec2(0.0, px.y)).xy)
        + 0.05 * (texture2D(S, vUv + px).xy + texture2D(S, vUv - px).xy
                + texture2D(S, vUv + vec2(px.x, -px.y)).xy + texture2D(S, vUv - vec2(px.x, -px.y)).xy);
    float r = c.x * c.y * c.y;
    c += vec2(l.x - r + FK.x * (1.0 - c.x), 0.5 * l.y + r - (FK.x + FK.y) * c.y);
    float m = texture2D(seed, vUv).r * seedW;
    c.y = max(c.y, 0.85 * m);
    c.x = min(c.x, 1.0 - 0.5 * m);
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 0.0, 1.0);
}`

// Curvas de nivel rojas con el núcleo en contorno blanco, como el boceto Turing.
const SHOW_FS = /* glsl */ `
uniform sampler2D S;
uniform vec2 res;
uniform float t;
uniform float vis;
varying vec2 vUv;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float V(vec2 q) { return texture2D(S, q).y; }
float iso(float x, float w) { return 1.0 - smoothstep(0.0, w, abs(fract(x - 0.5) - 0.5)); }
void main() {
    vec2 off = vec2(0.0012, -0.0008);
    float vr = V(vUv + off);
    float vw = V(vUv - off * 0.7);
    float x = vr * 30.0;
    float red = iso(x, fwidth(x) * 0.7 + 1e-4) * smoothstep(0.03, 0.07, vr);
    float w = fwidth(vw) * 1.1 + 1e-4;
    float core = 1.0 - smoothstep(0.0, w, abs(vw - 0.21));
    vec3 RED = vec3(0.937, 0.267, 0.267);
    vec3 col = RED * 0.1 * smoothstep(0.12, 0.3, vr);
    col += RED * red * 0.8;
    col = mix(col, vec3(1.0, 0.97, 0.94), core);
    col *= vis;
    col += (hash12(vUv * res + fract(t * 7.0) * 311.0) - 0.5) * 0.05 * vis;
    vec2 q = (vUv - 0.5) * vec2(1.15, 0.85);
    col *= 1.0 - 0.6 * dot(q, q);
    gl_FragColor = vec4(max(col, 0.0), 1.0);
}`

export function Ink() {
    const gl = useThree((s) => s.gl)
    const camera = useThree((s) => s.camera)
    const width = useThree((s) => s.size.width)
    const height = useThree((s) => s.size.height)
    const mesh = useRef<THREE.Mesh>(null)

    // Resolución de la simulación: más baja en celular, donde además se dan menos pasos.
    const res = useMemo(() => {
        const narrow = width < 768
        const scale = narrow ? 0.4 : 0.55
        return {
            w: Math.max(64, Math.round(width * scale)),
            h: Math.max(64, Math.round(height * scale)),
            steps: narrow ? 8 : 14,
        }
    }, [width, height])

    const sim = useMemo(() => {
        const canFloat = gl.capabilities.isWebGL2 &&
            (gl.extensions.has('EXT_color_buffer_float') || gl.extensions.has('EXT_color_buffer_half_float'))
        const opts = {
            type: canFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: false,
            stencilBuffer: false,
        }
        const seed = new THREE.WebGLRenderTarget(res.w, res.h, { depthBuffer: false, stencilBuffer: false })
        const simMat = new THREE.ShaderMaterial({
            vertexShader: QUAD_VS,
            fragmentShader: SIM_FS,
            uniforms: {
                S: { value: null },
                seed: { value: seed.texture },
                px: { value: new THREE.Vector2(1 / res.w, 1 / res.h) },
                FK: { value: new THREE.Vector2(0.03, 0.0675) },
                seedW: { value: 0 },
                init: { value: 1 },
            },
            depthTest: false,
            depthWrite: false,
        })
        const quadGeo = new THREE.PlaneGeometry(2, 2)
        const quad = new THREE.Mesh(quadGeo, simMat)
        quad.frustumCulled = false
        const simScene = new THREE.Scene()
        simScene.add(quad)

        const seedGeo = new THREE.BufferGeometry()
        seedGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(300), 3))
        const seedMat = new THREE.PointsMaterial({ color: 'white', size: Math.max(3, res.w / 260), sizeAttenuation: false })
        const seedPts = new THREE.Points(seedGeo, seedMat)
        seedPts.frustumCulled = false
        const seedScene = new THREE.Scene()
        seedScene.add(seedPts)

        return {
            read: new THREE.WebGLRenderTarget(res.w, res.h, opts),
            write: new THREE.WebGLRenderTarget(res.w, res.h, opts),
            seed, simMat, quadGeo, simScene,
            simCam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
            seedGeo, seedMat, seedScene,
            fresh: true,
        }
    }, [gl, res])

    useEffect(() => () => {
        sim.read.dispose(); sim.write.dispose(); sim.seed.dispose()
        sim.simMat.dispose(); sim.quadGeo.dispose(); sim.seedGeo.dispose(); sim.seedMat.dispose()
    }, [sim])

    const showMat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: QUAD_VS,
        fragmentShader: SHOW_FS,
        uniforms: {
            S: { value: null },
            res: { value: new THREE.Vector2(1, 1) },
            t: { value: 0 },
            vis: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
    }), [])
    useEffect(() => () => showMat.dispose(), [showMat])

    useFrame((state) => {
        const m = mesh.current
        if (!m) return
        const p = sceneState.kind === 'home' && !sceneState.reduce ? sceneState.progress : 0
        const vis = smooth(0.22, 0.42, p) * (1 - 0.6 * smooth(0.6, 0.9, p))

        // Arriba del todo no hay tinta: se reinicia para la próxima bajada.
        if (vis < 0.002 && p < 0.2) {
            sim.fresh = true
            m.visible = false
            return
        }

        const seeding = p > 0.28 && p < 0.62
        if (seeding) {
            const attr = sim.seedGeo.attributes.position as THREE.BufferAttribute
            ;(attr.array as Float32Array).set(sceneState.dots)
            attr.needsUpdate = true
            gl.setRenderTarget(sim.seed)
            gl.setClearColor(0x000000, 1)
            gl.clear()
            gl.render(sim.seedScene, camera)
        }

        const u = sim.simMat.uniforms
        // Régimen de Gray-Scott: cerca de la cima se apaga; al bajar crece como laberinto.
        if (p < 0.2) u.FK.value.set(0.03, 0.0675)
        else u.FK.value.set(0.029, 0.057)
        u.seedW.value = seeding ? 1 : 0
        for (let i = 0; i < res.steps; i++) {
            u.init.value = sim.fresh ? 1 : 0
            u.S.value = sim.read.texture
            gl.setRenderTarget(sim.write)
            gl.render(sim.simScene, sim.simCam)
            const tmp = sim.read
            sim.read = sim.write
            sim.write = tmp
            sim.fresh = false
        }
        gl.setRenderTarget(null)

        m.visible = vis > 0.002
        showMat.uniforms.S.value = sim.read.texture
        showMat.uniforms.res.value.set(state.size.width, state.size.height)
        showMat.uniforms.t.value = state.clock.elapsedTime
        showMat.uniforms.vis.value = vis
    })

    return (
        <mesh ref={mesh} frustumCulled={false} renderOrder={-1} material={showMat} visible={false}>
            <planeGeometry args={[2, 2]} />
        </mesh>
    )
}
