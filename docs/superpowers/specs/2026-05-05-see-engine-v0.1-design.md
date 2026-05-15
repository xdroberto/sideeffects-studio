# SEE — Side Effects Engine · v0.1 — Diseño

- **Fecha:** 2026-05-05
- **Autor del diseño:** Roberto Becerril (con apoyo de Claude)
- **Estado:** Aprobado por Roberto — pendiente de plan de implementación
- **Sub-proyecto:** A (Engine). Sub-proyectos B (Installation Mode) y C (Cosmos / Espacio) quedan fuera de este diseño.

---

## 1. Visión y alcance

### 1.1 ¿Qué es SEE?

SEE (Side Effects Engine) es un **engine generativo web** standalone que sirve como herramienta autoral de Roberto para construir, exhibir y operar piezas visuales generativas. Sustituye y supera al mixer SF-01 que vive embebido en el portfolio `side_effects.art`, y se construye en un repo nuevo, privado, hermano del portfolio.

Filosofía:

- **Pragmático-purista.** Web-first, libre uso de toda librería existente (three.js, p5, Tone.js, etc). La diferenciación está en la **voz autoral** — shaders, curaduría de piezas, estética del UI, modos de uso — no en haber escrito el renderer desde cero.
- **Artesanal y opinionada.** Vehículo de expresión para piezas curadas, no swiss-army-knife industrial. La frontera es donde la herramienta dejaría de ser autoral para volverse infraestructura de producción industrial (estadios, mapping de fachadas con edge-blending de 6+ proyectores, sincronización SMPTE entre máquinas) — esa escala no es SEE.
- **Hecho a su medida.** Cada decisión de UX y estética debe sentirse hecha para Roberto, no para un usuario genérico.

### 1.2 Sub-proyectos relacionados (futuros, fuera de este diseño)

- **Sub-proyecto B — Installation Mode.** Encima del engine: kiosk autorun, recovery automático, secuencias de escenas, mapping de proyector con homografía. Lo que se necesita para dejar la pieza corriendo en una galería sin supervisión.
- **Sub-proyecto C — Cosmos / track educativo.** Encima del engine: piezas con narrativa científica espacial (n-body, gravitational lensing, sistema solar generativo, nebulae procedurales, ondas gravitacionales), modo "explora" con tooltips de física.

Cada sub-proyecto tendrá su propio ciclo de spec → plan → implementación.

### 1.3 No-goals para v0.1

- Installation Mode (kiosk, recovery, secuencias)
- Cosmos / track educativo
- App empacada `.exe` (Tauri/Electron)
- Mapping homográfico / edge-blending de proyectores
- Editor visual de patches o grafos de nodos (el código *es* el editor)
- Soporte de iframe legacy (toda pieza se porta a SDK nativo)
- Modelos 3D pesados importados de DCC (las piezas pueden generar geometría en código, pero no el flujo Blender/Maya → SEE)
- Multiusuario / colaborativo
- Presets / save state de pieza
- Crossfade entre piezas (queda para Performance avanzado, v0.2+)

---

## 2. Hardware target del MVP

| Hardware | Disponibilidad | Rol en v0.1 |
|---|---|---|
| Laptop de Roberto | Tiene | Máquina de desarrollo y operación |
| Webcam | Tiene | Input visual (textura, posible tracking) |
| Arduino | Tiene | Sensores físicos custom vía WebSerial |
| Proyector | Tiene | Output secundario, full-screen |
| Monitor externo | Tiene | Multi-window: control en uno, visual en otro |
| MIDI Novation | Tiene | Control surface físico (modelo a confirmar) |

Hardware fuera de v0.1: Kinect, LIDAR, NDI nativo, DMX, sensores Bluetooth LE. Requerirían bridges nativos cuando lleguen.

---

## 3. Arquitectura de alto nivel

```
┌─────────────────────────────────────────────────────────┐
│                       SEE Engine                         │
│                                                          │
│  ┌──────────────┐   ┌─────────────┐   ┌──────────────┐  │
│  │   Pieces     │   │  Control    │   │   Render     │  │
│  │  Registry    │──▶│   Surface   │   │   Pipeline   │  │
│  │              │   │   (UI/UX)   │   │  (Three+GL)  │  │
│  └──────┬───────┘   └─────┬───────┘   └──────▲───────┘  │
│         │                  │                  │          │
│         └────────┬─────────┘                  │          │
│                  ▼                            │          │
│   ┌───────────────────────────────────────────┴───┐     │
│   │           Active Piece Runtime                 │     │
│   │   init() ─▶ update(dt) ─▶ render() ─▶ dispose │     │
│   └─────────────────▲─────────────────────────────┘     │
│                     │                                    │
│   ┌─────────────────┴─────────────────────────────┐     │
│   │                Input Bus                        │     │
│   │  ┌─────┐ ┌─────┐ ┌─────┐ ┌──────┐ ┌────────┐  │     │
│   │  │Audio│ │MIDI │ │Cam  │ │Serial│ │WebSock │  │     │
│   │  └─────┘ └─────┘ └─────┘ └──────┘ └────────┘  │     │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │    Output Manager    │
              │  ┌──────────────┐    │
              │  │  Window 1    │    │  ← Control panel + monitor
              │  ├──────────────┤    │
              │  │  Window 2    │    │  ← Visual output (proyector)
              │  └──────────────┘    │
              └──────────────────────┘
```

### 3.1 Componentes

1. **Pieces Registry.** Catálogo declarativo de piezas instaladas. Una pieza se "instala" agregando su módulo al registry. El registry expone metadata (id, título, autor, thumbnail, requirements) sin cargar la pieza completa hasta que se activa.
2. **Active Piece Runtime.** Gestiona el ciclo de vida de UNA pieza activa a la vez. Llama `init` al cargar, `update(dt, state)` cada frame, `render(target)` al pintar, `dispose` al cambiar de pieza.
3. **Input Bus.** Capa de abstracción sobre hardware. Cada input source (audio, MIDI, cámara, serial, websocket) es un *adapter* con interfaz común. Las piezas declaran qué quieren consumir; el bus las cablea sin que la pieza conozca el dispositivo concreto.
4. **Control Surface.** UI del operador. Auto-generado del contrato `params` de la pieza activa. Mismo control surface escucha al MIDI Novation y mapea knobs/pads a esos params (con remapeo persistente por pieza).
5. **Render Pipeline.** Three.js como base. La pieza puede usar la `Scene/Camera/Renderer` que SEE le pasa, o crear los propios. Soporta render targets para post-FX y output multi-window.
6. **Output Manager.** Multi-window con Window Management API. Detecta segunda pantalla y permite mandar el visual a esa ventana en full-screen, dejando el control en la principal.

### 3.2 Separación core / UI

`engine/` no importa nada de `ui/`. El engine es **headless-capable** — puede correr sin React. Esto deja abierta la puerta a:

- Empaque Tauri (mismo engine, UI nativa) en v0.2+
- Tests headless de piezas
- Modo "render to file" futuro (offline a video)

---

## 4. Modelo de pieza (SDK contractual)

### 4.1 Filosofía

Una **pieza** es un módulo TypeScript que cumple el contrato `SEEPiece`. Dentro de la pieza, Roberto tiene libertad total: shader puro, escena three.js, sistema de partículas, integración con APIs, lo que sea. Lo único uniforme es la interfaz hacia el engine.

Esta decisión deja fuera dos alternativas evaluadas:

- **Pieza = solo fragment shader sobre quad.** Demasiado restrictivo para lo que Roberto quiere (partículas, three.js, texto reactivo, APIs).
- **Pieza = grafo visual de nodos tipo TouchDesigner.** Reinventaría TD; meses de trabajo en algo que no es la diferenciación.

### 4.2 Contrato

```ts
// see/src/sdk/types.ts

export interface SEEPiece {
  // Identidad
  id: string                     // 'koch3d', único en el registry
  title: string                  // 'Koch · 3D'
  author: string                 // 'Roberto Becerril'
  version: string                // semver
  thumbnail?: string             // path a imagen estática
  description?: string           // markdown corto

  // Requerimientos del Input Bus
  inputs: InputRequirements

  // Parámetros expuestos al control surface
  params: ParamSchema

  // Ciclo de vida
  init(ctx: SEEContext): Promise<void> | void
  update(dt: number, state: PieceState): void
  render(target: RenderTarget): void
  dispose(): void
}

export interface SEEContext {
  scene: THREE.Scene             // pieza puede usarla o crear la propia
  camera: THREE.Camera           // pieza puede reemplazarla
  renderer: THREE.WebGLRenderer  // compartido por engine
  canvas: HTMLCanvasElement
  audio: AudioContext            // Web Audio compartido
  assets: AssetLoader            // helpers para texturas, modelos
}

export interface PieceState {
  params: Record<string, ParamValue>
  inputs: {
    audio?: AudioFrame
    midi?: MidiFrame
    camera?: VideoFrame
    serial?: SerialFrame
  }
  time: number                   // segundos desde init
  frame: number                  // frame count
}
```

### 4.3 ParamSchema

Tipos soportados: `int`, `float`, `bool`, `enum`, `color`, `vec2`, `trigger` (botón).

Cada param declara:
- `min/max/default` (para numéricos)
- `options` (para enum)
- `label` opcional (display name)
- `group` opcional (para agrupar en el UI)
- `midi` opcional (mapping default sugerido a CC# o nota)

### 4.4 InputRequirements

```ts
{
  audio: 'required' | 'optional' | 'no'
  midi: { knobs: number, pads: number } | 'no'
  camera: 'required' | 'optional' | 'no'
  serial: { baudRate?: number } | 'no'
}
```

Si la pieza dice `audio: 'required'` y no hay audio source disponible, el engine no la deja cargar (UI explica qué falta).

### 4.5 Validaciones del SDK

- `id` debe ser único en el registry (validación al cargar el registry)
- `params` no puede declarar dos params con el mismo key
- `version` debe ser semver válido
- `init` debe completar (sync o async) antes de `update`/`render`
- Cualquier excepción no-atrapada en ciclo de vida es manejada por el engine (ver §8)

---

## 5. Sistema de inputs (Input Bus)

### 5.1 Adapters

| Adapter | API web | Output |
|---|---|---|
| `audio` | Web Audio + getUserMedia | `AudioFrame { fft: Float32Array, rms: number, beat: boolean, peak: number }` |
| `midi` | Web MIDI | `MidiFrame { knobs: Map<cc, value>, pads: Map<note, velocity>, last: MidiEvent }` |
| `camera` | getUserMedia (video) | `VideoFrame { texture: THREE.VideoTexture, width, height }` |
| `serial` | WebSerial (Arduino) | `SerialFrame { values: Record<string, number>, lastReadAt: number }` |
| `websocket` | WebSocket | Reservado para bridges futuros (Kinect, NDI). NO en v0.1. |

### 5.2 Cableado pieza ↔ bus

1. Pieza declara qué necesita en `inputs`
2. Al `init`, el engine inicializa solo los adapters solicitados y los pasa via `ctx`
3. Cada frame, `update(dt, state)` recibe `state.inputs` como **snapshot inmutable** del último valor de cada adapter
4. Inputs son **compartidos**: una sola sesión de mic sirve a la pieza activa; al cambiar de pieza no se reabre el dispositivo

### 5.3 Protocolo serial Arduino (recomendado)

Documentado en `docs/input-protocols.md`:

```
// Sketch Arduino: una línea por frame, JSON minificado
{"a0":512,"a1":1023,"d2":1}
```

SEE parsea cada línea como JSON, expone los keys como `state.inputs.serial.values["a0"]`. Parser CSV alternativo disponible para sketches que no usan JSON.

### 5.4 MIDI mapping

- Primer launch: SEE detecta el Novation, asigna knobs 1..N a los primeros params (en orden declarado) de la pieza activa
- UI permite **drag-to-remap**: arrastrar un knob físico al param que se quiera (UI muestra "wiggle a knob to assign")
- Mapping persiste en `localStorage`, scoped por pieza

---

## 6. Modos de uso

### 6.1 Solo Mode (default)

Exploración. Visual y control en la misma ventana. Para iterar en una pieza.

### 6.2 Performance Mode

Visual full-screen en proyector / segunda pantalla; control en la laptop. MIDI Novation activo. Sincronizadas vía `BroadcastChannel` o `postMessage`.

**No incluye** kiosk autorun, recovery automático ni secuencias — eso es Installation Mode (sub-proyecto B).

---

## 7. Stack técnico

```
Build           Vite (HMR rápido, plugin nativo de GLSL)
Lang            TypeScript estricto (strict, noUncheckedIndexedAccess)
UI              React 18 + Tailwind v3 (mismo stack que portfolio)
Render          three.js (WebGL2 default; WebGPU detrás de feature flag)
Shaders         GLSL en .glsl, importados con vite-plugin-glsl
Audio           Tone.js (musical) + Web Audio API crudo (análisis)
State           Zustand
Persistencia    localStorage (MIDI mapping, prefs); IndexedDB (presets v0.2+)
Testing         Vitest + Playwright
Lint/format     ESLint + Prettier
CI              GitHub Actions
```

Decisiones explícitas:

- **Vite, no Next.js.** SEE no necesita SSR/routing. Vite arranca en <1s y el HMR de shaders es excelente.
- **Tailwind v3 (no v4 alpha).** Estabilidad sobre features.
- **Zustand, no Redux.** State modesto, sin boilerplate.
- **WebGL2 default, WebGPU feature-flagged.** WebGPU está cerca de estable pero todavía con quirks; las piezas que se beneficien (compute shaders para partículas masivas) pueden optar.

---

## 8. Estructura del repo

```
see/
├── src/
│   ├── engine/                  # Core engine, sin UI
│   │   ├── index.ts             # class SEEEngine
│   │   ├── piece-runtime.ts     # init/update/render lifecycle
│   │   ├── pieces-registry.ts   # catálogo + lazy loading
│   │   ├── render-pipeline.ts   # Three setup, render targets, post-FX
│   │   ├── output-manager.ts    # multi-window, second-screen
│   │   └── input-bus/
│   │       ├── index.ts
│   │       ├── types.ts
│   │       └── adapters/
│   │           ├── audio.ts
│   │           ├── midi.ts
│   │           ├── camera.ts
│   │           └── serial.ts
│   ├── sdk/                     # SDK público para escribir piezas
│   │   ├── types.ts             # SEEPiece, ParamSchema, SEEContext
│   │   ├── helpers.ts
│   │   └── index.ts             # barrel export
│   ├── ui/                      # Control surface (React)
│   │   ├── App.tsx
│   │   ├── ControlSurface.tsx
│   │   ├── ParamControls.tsx
│   │   ├── PieceLibrary.tsx
│   │   ├── InputMonitor.tsx     # debug en vivo del bus
│   │   ├── OutputWindow.tsx     # ventana secundaria
│   │   └── styles/
│   ├── pieces/                  # Piezas instaladas
│   │   ├── koch3d/
│   │   │   ├── index.ts
│   │   │   ├── piece.ts
│   │   │   ├── shaders/
│   │   │   └── piece.test.ts
│   │   ├── voronoi/             # portada de SF-01
│   │   ├── particles-lab/       # nueva, prueba del SDK
│   │   └── ...
│   ├── lib/
│   ├── state/                   # zustand stores
│   ├── styles/
│   └── main.tsx
├── public/
├── tests/
│   ├── unit/
│   └── e2e/
├── docs/
│   ├── piece-sdk.md             # cómo escribir tu primera pieza
│   ├── input-protocols.md       # Arduino, MIDI mapping
│   └── architecture.md
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

Disco local: `Generative/My custom projects/see/` — hermano de `sideeffects_robertobh/`, **no anidado**.

GitHub: repo privado nuevo. Reversible a público si en el futuro Roberto decide "build in public".

---

## 9. Definición de "SEE v0.1 existe" (criterios de aceptación)

Criterios observables, sin ambigüedad:

1. Repo `see/` privado en GitHub, hermano del portfolio en disco
2. `npm run dev` levanta SEE en `localhost:5173`, abre Chrome sin errores en consola
3. Biblioteca con **3 piezas funcionales**:
   - `koch3d` — la que Roberto ya tiene como HTML standalone, portada al SDK
   - `voronoi` — portada de `sf01-internal` (mantiene el palette picker custom)
   - `particles-lab` — pieza nueva escrita desde cero, prueba del SDK
4. Click en pieza → se carga, control surface se autogenera con sus params
5. Sliders del UI manipulan params en tiempo real, visual responde
6. Conectar Novation → engine la detecta, knobs se mapean a los primeros N params automáticamente, drag-to-remap funciona, mapping persiste tras reload
7. Botón **"Send to projector"** → si hay segunda pantalla, abre window 2 full-screen con el visual; control queda en window 1; sincronizadas
8. Una pieza usa **audio-reactivo** real (mic → FFT → driver de visual)
9. Una pieza usa **cámara** como textura
10. Una pieza usa **Arduino** (potenciómetro físico → param). Protocolo serial documentado
11. Tests: cada adapter tiene unit tests; cada pieza tiene smoke test (init → 10 frames → dispose, sin throws); CI verde
12. README con quickstart "cómo escribir tu primera pieza" (5 minutos del clone al primer canvas)

---

## 10. Errores y resiliencia

| Falla | Comportamiento |
|---|---|
| Pieza tira en `init` | Marca como "rota", error en UI, mantiene pieza anterior activa |
| Pieza tira en `update`/`render` | Atrapa, hace `dispose`, regresa a pieza anterior, log con stack |
| Hardware desconectado mid-session | Adapter emite `disconnected`, sigue con valores neutros (audio=silencio, midi=last value, cámara=frame negro). UI muestra status |
| WebGL context lost | Handler estándar three.js, reintenta `init` de pieza activa |
| Input no soportado por pieza | Si pieza dice `serial: 'no'`, engine no abre el puerto |
| Permission denied (mic/cámara) | UI muestra botón explícito "Pedir permiso" en lugar de error genérico |
| Pieza con `audio: 'required'` y sin mic | No se deja cargar; UI explica qué falta |

Logging: console + ring buffer en memoria, visible desde el `InputMonitor` panel (toggle con `~`).

---

## 11. Testing

- **Unit (Vitest)** — SDK helpers, ParamSchema validators, MIDI mapping logic, audio analysis utilities
- **Integration (Vitest + jsdom + WebGL mock)** — Active Piece Runtime con piezas mock; verifica ciclo init/update/render/dispose, manejo de excepciones, transiciones
- **Smoke tests por pieza** — cada pieza tiene `piece.test.ts` que la inicializa y renderiza 10 frames con params default. Si falla, falla el CI
- **E2E (Playwright)** — Chromium headed con flags `--enable-features=...` para WebSerial/WebMIDI; navega biblioteca, carga pieza, verifica que el canvas tiene contenido vía screenshot regression
- **Manual checklist hardware** — doc con pasos para validar Novation/Arduino/proyector antes de cada release

CI ejecuta unit + integration + smoke + e2e en cada push. E2E corre en Chromium headed con xvfb.

---

## 12. Decisiones aprobadas en brainstorming

1. ✅ **Pivot del mixer SF-01 a engine generativo robusto.** El SF-01 público se queda como teaser; SEE es la herramienta nueva.
2. ✅ **Filosofía pragmático-purista.** Web-first, libre uso de toda librería. Diferenciación en voz autoral, no en escribir el renderer desde cero.
3. ✅ **Repo privado nuevo.** Hermano del portfolio en disco. GitHub privado al inicio (reversible a público).
4. ✅ **Modelo de pieza = módulo TypeScript con contrato uniforme.** No fragment-shader-only, no graph visual.
5. ✅ **Portar todas las piezas a SDK nativo.** No soporte de iframe legacy.
6. ✅ **Stack web (Vite + React + Three.js).** Empaque Tauri queda para v0.2+.
7. ✅ **Sub-proyectos B y C diferidos.** Cada uno con su propio ciclo de spec/plan.

---

## 13. Decisiones pendientes para fase de plan

Estas no bloquean el spec, pero hay que cerrarlas durante o antes de implementación:

1. **Modelo Novation exacto.** Cambia el diseño del control surface (pads vs knobs vs faders).
2. **Nombre del paquete npm / repo en GitHub.** "see" puede chocar con paquetes existentes; alternativas: `see-engine`, `sideeffects-engine`, `see-rb`.
3. **Manejo de assets pesados.** Piezas con texturas grandes — ¿cargar inline, lazy, desde CDN?
4. **Rate-limit de updates de UI.** Si MIDI mueve un knob a 1kHz, ¿cómo evitamos re-renders excesivos de React?
5. **Política de versionado del SDK.** Cuando cambie `SEEPiece`, ¿cómo marcamos breaking changes a piezas existentes?

---

## 14. Timeline orientativo

Estimación en sesiones de Claude Code (~2-3 horas reales cada una). Asumiendo trabajo en paralelo entre sesiones por parte de Roberto:

| Sesión | Hito | Lo que se ve en UI |
|---|---|---|
| 1 | Bootstrap (Vite + React + TS + Tailwind + folders + CI básico) | App vacía corriendo en `localhost`, "Hello SEE" |
| 2 | SDK base + engine core + render pipeline + pieza dummy | **Primer canvas pintando** algo desde una pieza |
| 3-4 | ParamControls auto-generado + ciclo completo de una pieza | **UI manipulable**: sliders/dropdowns mueven el visual |
| 5 | Input Bus + adapters audio + cámara | **Reactividad a hardware** (mic, webcam) |
| 6 | Adapter MIDI + mapping persistente + adapter serial Arduino | **Novation y Arduino conectados** al visual |
| 7-9 | Portar koch3d, voronoi, escribir particles-lab | **3 piezas terminadas** y curadas |
| 10 | Output Manager (multi-window, send-to-projector) | **Visual a proyector** |
| 11 | Tests, polish, README, docs | CI verde, doc usable |

Total estimado: ~10-12 sesiones. Algo manipulable en pantalla a partir de la sesión 2-3.

Esta tabla es orientativa — el plan formal saldrá del skill `writing-plans` y puede reordenar o paralelizar tareas.

---

## 15. Próximos pasos

1. Roberto revisa este spec
2. Si aprueba, se invoca el skill `writing-plans` para producir el plan de implementación detallado
3. El plan será ejecutado en sesiones subsecuentes (probablemente con `executing-plans` o subagent-driven development)
