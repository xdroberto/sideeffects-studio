# Playground «Un hilo» — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (o superpowers:subagent-driven-development). Los pasos usan casillas (`- [ ]`).

**Meta:** reemplazar el Playground actual por la disposición B («Un hilo») con las cuatro piezas del laboratorio (Ink, Field, Harp, Loom) llevadas al sitio con más detalle y calidad que la maqueta.

**Arquitectura:** la lógica sin DOM vive en módulos `.mjs` probados con `node --test` (como `components/scene/shapes.mjs`). Cada pieza es un componente cliente con su motor (`*-engine.ts`) montado por un hook común (`usePiece`) que reparte un solo `requestAnimationFrame`, anima solo lo visible, respeta «reducir movimiento» y limpia todo al salir de la página. Un hilo SVG, medido sobre anclas del DOM, une las piezas y se dibuja con el scroll; nace de un carrete de cuerdas de la escena persistente.

**Stack:** Next.js 14 (export estático), React 18, TypeScript, Tailwind, Canvas 2D, WebGL2, Web Audio. Sin dependencias nuevas.

**Spec:** el laboratorio aprobado, https://claude.ai/artifact/1zjhdwzeMeG5x9bDoSKUzP (piezas: versión 8; disposición B: ronda 3), y la sección «Diseño» de este plan. Fuente de las piezas (código a portar): `C:\Users\xdrob\AppData\Local\Temp\claude\C--Users-xdrob-Desktop-Generative-Source-Code-side-effects\1ac86322-935f-4239-8806-688c022699bd\scratchpad\lab-pg\` (`p-tinta.js`, `p-campo.js` — su `TEXT` es la caverna verificada de 17 párrafos —, `p-arpa.js`, `p-arpa-sound.js`, `p-telar.js`, `gl.js`, `host2d.js`, `mocks.js`, `index.html`). Si esa carpeta temporal ya no existe, recuperar cada archivo con la herramienta Artifact (`action: "read"`, `url` del laboratorio, `path` = nombre del archivo). El grabado de 960 px está en `...\scratchpad\dl-cunego\socrates-cunego-960.jpg` y publicado en el laboratorio como `img/socrates-cunego.jpg`. Pruebas de QA reutilizables en `...\scratchpad\` (`qa-arpa-silence.cjs`, `qa-arpa-egg.cjs`, `qa-lab-pg2.cjs`, `serve-lab.cjs`).

## Diseño (decisiones de Roberto y mías)

- **Orden:** Ink hasta arriba (portada), luego Field, Harp y Loom al final. Una sola página que se recorre hacia abajo.
- **Disposición B:** cada pieza con la forma de su material sobre una retícula de 12 columnas (contenedor de 1280 px). Ink a todo lo ancho; Field como página de libro 2:3 en las columnas 2–6 con su texto en 8–11; Harp 16:9 desde la columna 4 hasta el borde derecho de la ventana, con su texto en 1–3; Loom cuadrado en 2–7 con su texto en 8–11. En celular, una columna con Field al 82 % de ancho, Harp 4:5 pegado al borde derecho y el hilo en el margen izquierdo.
- **El hilo:** un solo hilo rojo (SVG) sale de un **carrete** (la escena persistente: las 200 cuerdas del diamante se enrollan en el círculo de `kind: 'playground'`) bajo la portada, entra a Field por su esquina superior derecha, sale por la inferior, entra al Harp por arriba (sobre la clavija) y sale por la punta de abajo, y termina en el clavo superior del Loom. Se dibuja con el scroll; cada ancla es un clavito que se enciende cuando el hilo llega. Con «reducir movimiento», dibujado completo.
- **Piezas:** las del laboratorio, versión 8, sin cambios de comportamiento: Ink recita el lema (`playground → generative → art → interactive → design → visual → symphony → side effects`) y acepta la palabra del visitante 25 s; Field con la alegoría de la caverna (verificada, 17 párrafos); Harp con sitar y tanpura en Malkauns, el punto medio de reacción, permiso antes de sonar, la clavija secreta y la guarda anti-NaN; Loom con el grabado de 1783 en versión «luz».
- **Más detalle (mi propuesta, dentro de lo aprobado):** bajo cada descripción, una línea de ficha técnica con datos reales en Space Mono (p. ej. «200 strings · Raga Malkauns · plucked synthesis»); viñeta de señal (`SignalBullet`) en las instrucciones; estados de carga con viñeta y verbo («growing ink», «laying out the text», «tuning strings», «threading the loom»); bajo el Harp, un lector discreto de las últimas notas en sílabas (Sa · ga · Ma); en Loom, el contador en vivo y la opción «Your photo» (se procesa en el navegador).
- **Pospuesto (segunda pasada, ya acordado):** que las cuerdas de la escena persistente se transformen en cada pieza al pasar con el scroll (pentagrama, aro, etc.).

## Restricciones globales

- Texto del sitio en inglés. Nombres: **Ink, Field, Harp, Loom**. Copia exacta en la Tarea 11.
- Tres voces: Michroma (nombres), Archivo (texto), Space Mono (datos, instrucciones). Color de interfaz solo con tokens (`signal`, `ink-*`, `line-*`, `canvas-*`); dentro de los lienzos, los colores del laboratorio.
- Sonido: nunca sin permiso explícito; se calla fuera de pantalla, con la pestaña oculta y al salir de la página; ningún búfer con muestras no finitas llega al grafo de audio.
- «Reducir movimiento»: cada pieza muestra un cuadro estático con sentido (tinta crecida, retrato tejido, campo en reposo, arpa quieta) y un botón «Play the pieces» lo activa; sin tareas largas (> 200 ms) al tejer de golpe.
- Rendimiento: solo se animan las piezas visibles; simulación de Ink ≤ 720 px de ancho; `devicePixelRatio` ≤ 2 en 2D y ≤ 1.5 en WebGL.
- Créditos visibles: «Plato, Republic, Book VII · tr. Benjamin Jowett» y el del grabado (CC BY 4.0) con enlace a Commons.
- Sin commits ni push hasta el visto bueno de Roberto en `localhost:3000/playground` (su regla). Comprobaciones pesadas de una en una (poca RAM).

## Foco de revisión

1. **Salir y volver por el menú** (navegación del cliente, varias veces): nada se duplica ni se fuga; el `AudioContext` se cierra, el temporizador de la tanpura se limpia, los contextos WebGL de las piezas se liberan y la consola queda limpia. → prueba en la Tarea 12.
2. **Permiso de sonido en los bordes:** rechazarlo y activarlo después con el botón, ocultar la pestaña, salir de pantalla; en iOS el `resume()` debe ocurrir dentro del toque. → pruebas en las Tareas 9 y 12.
3. **Cambio de tamaño u orientación a mitad de tejido o de tinta:** las piezas se reacomodan sin perder estado (el telar repinta su secuencia; la tinta vuelve a sembrar). → prueba en la Tarea 12.
4. **«Reducir movimiento»:** cuadros estáticos con sentido, hilo completo, sin tareas largas: el tejido instantáneo del Loom se reparte en varios cuadros. → pruebas en las Tareas 10 y 12.
5. **Equipos lentos:** pasos de simulación acotados por cuadro y la página sigue respondiendo; sin bloqueos al cargar la imagen o la foto. → prueba en la Tarea 12.

---

### Tarea 1: Motor de sonido

**Archivos:** crear `lib/playground/sound.mjs`; prueba `tests/node/playground-sound.test.mjs`.

**Interfaces — produce:** `MALKAUNS`, `BHUPALI`, `SA = 138.59`; `degreeIn(scale, base, deg) → number` (grados negativos bajan de octava, siempre finito > 0); `degree(base, deg)` (Malkauns); `pluck(sr, f, timbre: 'sitar'|'tanpura') → Float32Array`; `bell(sr, f)`; `tick(sr)`; `room(sr, seconds) → [Float32Array, Float32Array]`; `isClean(data) → boolean` (longitud > 1 y todas las muestras finitas). Con `f` inválida, los generadores devuelven `new Float32Array(1)`.

- [x] Prueba (falla primero): `los grados fuera de la escala dan frecuencias válidas` (−12…12 en ambas escalas; `degreeIn(BHUPALI, 277.18, -1)` ≈ 233.08 ± 0.01); `sitar, tanpura, campana y clic: sin NaN, pico ≤ 0.9 y se apagan` (RMS por cuartos decreciente, salvo el clic); `una frecuencia inválida no produce sonido` (`NaN, 0, -5, Infinity` → `isClean` falso).
- [x] `node --test tests/node/playground-sound.test.mjs` → falla (módulo inexistente).
- [x] Portar `p-arpa-sound.js` a ESM con JSDoc y `// @ts-check`, más `isClean`.
- [x] Prueba pasa.

### Tarea 2: Lógica del Harp (compuerta de notas y clavija)

**Archivos:** crear `lib/playground/harp-logic.mjs`; prueba `tests/node/playground-harp.test.mjs`.

**Interfaces — produce:**
- `createNoteGate({ grid = 0.08, maxLag = 0.6, repeat = 0.25 })` → `{ request(key: number, now: number, delay = 0): number | null }` (hora programada o `null` si no suena).
- `createPeg({ hysteresis = 0.65 })` → `{ drag(dAngle): PegEvent[], tap(): PegEvent[], release(): void, unwind(): PegEvent[], state(): { ang, count, base, tuned } }`, con `PegEvent = { type: 'notch', step, dir } | { type: 'complete', tuned, dir }`; `chimeDegree(step) → number | null` (`null` cuando `step === 0`).

- [x] Pruebas (fallan primero): `un rasgueo rápido suena como arpegio` (50 claves distintas en 0.25 s → entre 8 y 12 notas, separadas ≥ 0.08 s, ninguna después de `now + 0.6`); `la misma nota no se repite antes de 0.25 s`; `cuatro toques completan la vuelta y afinan, otros cuatro la regresan`; `regresar la manivela al inicio no pide la campana −1` (girar +100° y −110°: hay un paso con `step 0` y `chimeDegree` nunca es negativo — regresión del silencio); `sacudir en la frontera no cuenta ida y vuelta` (10 oscilaciones entre 40° y 50° → cero eventos); `girar al revés también completa`.
- [x] Implementar con la lógica de `requestNote`, `notch` y el arrastre con histéresis de `p-arpa.js`.
- [x] `node --test tests/node/playground-harp.test.mjs` pasa.

### Tarea 3: Palabras de Ink y texto de Field

**Archivos:** crear `lib/playground/words.mjs` y `lib/playground/cave.mjs`; pruebas `tests/node/playground-words.test.mjs` y `tests/node/playground-cave.test.mjs`.

**Interfaces — produce:**
- `MOTTO` (8 palabras, en el orden del Diseño); `createWordCycle({ words, hold = 6.5, sweep = 1.6, pinned = 25 })` → `{ step(dt): { cur, next, sweep /* -1 o 0..1 */, changed }, pin(word: string): void }` (recorta a 24 caracteres; vacía = vuelve al lema en ≤ 1.5 s).
- `CAVE: string[]` (17 párrafos con rayas tipográficas, verificados contra la edición de Jowett del MIT Classics Archive el 2026-10-21; el párrafo 16 es la pregunta «And you may further imagine…» que faltaba en el laboratorio); `CAVE_SOURCE = 'Plato, Republic, Book VII · tr. Benjamin Jowett'`; `wrapLines(paragraphs, cols) → string[]`.

- [x] Pruebas (fallan primero): `recita el lema en orden` (barrido a los 6.5 s; `generative` al terminar el barrido); `la palabra del visitante se queda 25 s y vuelve el lema`; `una palabra vacía regresa al lema`; `la caverna está completa` (17 párrafos; el 16 contiene «will he not be perplexed?»; el último es «Far truer.»; sin «--»); `el ajuste de líneas no pierde palabras ni rebasa columnas`.
- [x] Implementar (`clock` de `p-tinta.js`; `layout` de `p-campo.js` sin DOM).
- [x] Ambas pruebas pasan.

### Tarea 4: Núcleo del Loom y la imagen

**Archivos:** crear `lib/playground/loom.mjs`, `public/playground/socrates-cunego-1783.jpg`; prueba `tests/node/playground-loom.test.mjs`.

**Interfaces — produce:** `SOCRATES_SILHOUETTE: [number, number][]` (el polígono del laboratorio; vale tal cual porque el recorte `[0.12, 0.06, 0.76]` ya viene aplicado en la imagen); `buildTarget(lum: Float32Array, N, { invert, gamma = 1.35, tone, soften, mask, outline }) → Float32Array` (sin canvas: máscara por punto-en-polígono, desenfoque de caja en JS); `createWeaver({ pins = 300, size = 300, add = 0.03, bias = 0, gap = 18, threads = 6000, minThreads = 2500 })` → `{ setTarget(t), next(): number, commit(q), done, finished, seq, meters, pins }`.

- [x] Imagen: del grabado de 960 px (scratchpad `dl-cunego/`), recortar `[0.12, 0.06, 0.76]` del ancho/alto/ancho, 600×600, JPEG calidad 82 (≤ 120 KB).
- [x] Pruebas (fallan primero, con `size 100` y `pins 120` para que sean rápidas): `la máscara apaga todo fuera de la silueta`; `el telar termina entre el mínimo y el tope y no une clavos vecinos` (ningún par consecutivo a menos de `gap`; sin repetir los 8 recientes); `es determinista` (mismos 50 primeros clavos).
- [x] Implementar desde `load`, `bestNext`, `commit` y `blur` de `p-telar.js`.
- [x] Prueba pasa.

### Tarea 5: Geometría del hilo

**Archivos:** crear `lib/playground/thread.mjs`; prueba `tests/node/playground-thread.test.mjs`.

**Interfaces — produce:** `threadPath(points: {x, y}[]) → string` (cúbicas con tangentes verticales entre anclas, control al 45 % de la distancia vertical); `lengthAtY(samples: {len, y}[], y) → number` (monótona, recortada a `[0, total]`).

- [x] Pruebas (fallan primero): `el hilo pasa por cada ancla`; `lengthAtY es monótona y se recorta en los extremos`.
- [x] Implementar; prueba pasa.

### Tarea 6: Anfitrión de piezas y utilidades WebGL

**Archivos:** crear `components/playground/use-piece.ts`, `lib/playground/gl.ts`, `lib/playground/motion.ts`.

**Interfaces — produce:**
- `type Piece = { resize(w, h, dpr, cssW, cssH): void; frame(t: number, dt: number): void; dispose(): void; dirty: boolean; visibility?(visible: boolean): void }`.
- `usePiece(ref: RefObject<HTMLCanvasElement>, make: (canvas: HTMLCanvasElement) => Piece, { maxDpr = 2 }) → { piece: MutableRefObject<Piece | null>; failed: boolean }`: `ResizeObserver`, `IntersectionObserver` (margen 120 px), un solo `requestAnimationFrame` compartido por todas las piezas (`dt` acotado a 0.05 s), cuadro estático cuando no hay movimiento (`dirty`), y limpieza completa al desmontar.
- `motion.ts`: `isRunning()`, `play()`, `subscribe(fn)`; corre si no hay `prefers-reduced-motion` o si el visitante pulsó «Play the pieces».
- `gl.ts`: `program`, `triangle`, `pingpong` y `GLSL` de `gl.js`, con `dispose()` de todo lo creado.

- [x] Implementar. Se verifica con las piezas (Tareas 7–10) y en la Tarea 12.

### Tarea 7: Ink

**Archivos:** crear `components/playground/ink-engine.ts` y `components/playground/ink.tsx`.

**Interfaces — consume:** `createWordCycle` (T3), `gl.ts` y `usePiece` (T6). **Produce:** `<InkStage ref>` con `useImperativeHandle` → `{ setWord(word: string): void }`; `<InkWordInput onWord>` (etiqueta «Your word», máx. 24, aplica 300 ms después de dejar de escribir).

- [x] Portar `p-tinta.js` (shaders sin cambios; reloj de palabras desde `words.mjs`; `dispose` libera texturas, programas y búferes, y quita el `pointerup` de `window`).
- [x] En el navegador: la palabra rota, el barrido reescribe, arrastrar suelta tinta y «reducir movimiento» la muestra crecida.

### Tarea 8: Field

**Archivos:** crear `components/playground/field-engine.ts` y `components/playground/field.tsx`.

**Interfaces — consume:** `CAVE`, `wrapLines` (T3) y `usePiece` (T6). **Produce:** `<FieldStage />` con el imán como `<button>` (flechas mueven el imán; `touch-action: none` solo en él).

- [x] Portar `p-campo.js` (atlas de glifos, dipolo, dos columnas desde 720 px).
- [x] En el navegador: arrastrar con mouse, con dedo y con teclado; el texto vuelve a su renglón.

### Tarea 9: Harp

**Archivos:** crear `components/playground/harp-engine.ts` y `components/playground/harp.tsx`.

**Interfaces — consume:** `sound.mjs` (T1), `harp-logic.mjs` (T2) y `usePiece` (T6). **Produce:** `<HarpStage ref onNote>` → `{ setSound(on: boolean): boolean }`; tarjeta de permiso dentro del escenario la primera vez que el Harp entra en vista (la respuesta se recuerda en `sessionStorage`); la clavija también es un `<button>` invisible y enfocable («Turn the peg»); `onNote(sargam: string)` alimenta el lector bajo la pieza.

- [x] Portar `p-arpa.js`: la compuerta y la clavija salen de `harp-logic.mjs`, `buffer()` usa `isClean`, `dispose` cierra el `AudioContext`, limpia el temporizador de la tanpura y quita los oyentes.
- [x] En el navegador: permiso → rasgueo con notas; volver a girar la manivela y regresarla no silencia (oído = `AnalyserNode`, como `qa-arpa-silence.cjs`); rechazar el permiso y activarlo después con el botón; la vuelta completa revela la gema.

### Tarea 10: Loom

**Archivos:** crear `components/playground/loom-engine.ts` y `components/playground/loom.tsx`.

**Interfaces — consume:** `loom.mjs` (T4) y `usePiece` (T6). **Produce:** `<LoomStage ref>` → `{ weave(source: 'socrates' | File): void; restart(): void }`; contador en vivo; selector «Socrates · Your photo».

- [x] Portar `p-telar.js` (ritmo, aguja, destellos, estela, mantener presionado). El tejido instantáneo de «reducir movimiento» se reparte en tandas de 150 hilos por cuadro. La foto se lee con `createImageBitmap`, sin subirla.
- [x] En el navegador: teje en unos 30 s, se detiene solo, «Your photo» funciona y no hay tareas largas (`PerformanceObserver` de `longtask`) al tejer de golpe.

### Tarea 11: Página B, hilo y carrete

**Archivos:** reescribir `app/playground/playground-client.tsx`; modificar `app/playground/page.tsx` (metadatos) y `components/scene/scene-canvas.tsx` (colocación de `'playground'`); crear `components/playground/thread.tsx`; borrar `components/playground/{drag-obstacle,reflow-canvas,reflowing-paragraph,shrinkwrap-text}.tsx`.

**Interfaces — consume:** las cuatro piezas (T7–T10) y `threadPath`, `lengthAtY` (T5). **Produce:** `<Thread />`, que lee anclas `data-thread="spool|field-in|field-out|harp-in|harp-out|loom-in"` dentro del `<article>`, recalcula con `ResizeObserver`, dibuja con `stroke-dashoffset` según el scroll (el punto de lectura a 62 % de la ventana) y enciende cada clavito al pasar.

- [x] Maquetar B según «Diseño»: contenedor de 1280 px con `grid-cols-12`; el Harp sangra a la derecha con un `padding-left` alineado al contenedor; ritmo vertical de 112 px (celular) y 160 px (escritorio) entre piezas. En celular, una columna con las anclas del hilo en el margen izquierdo. Instrucciones con `SignalBullet`; cada pieza carga con `nextDynamic({ ssr: false })` y un marcador del mismo tamaño con viñeta y verbo («growing ink», «laying out the text», «tuning strings», «threading the loom»), para que no haya saltos de diseño.
- [x] Carrete: un `div` de 132 px con `data-scene-cover` bajo la portada; en `placementFor`, `'playground'` usa escala ×1 (antes ×1.5), alfa 0.9 en escritorio y 0.75 en celular, `rot` 0.15.
- [x] Copia exacta:
  - Intro: «Playground» / «Four instruments built from the studio's materials: ink, text, strings and thread.»
  - Ink: «The studio's motto, grown in ink. The word changes on its own; write your own and the ink regrows around it.» · ficha «Gray–Scott reaction–diffusion · f 0.029 · k 0.057» · «Drag to drop ink».
  - Field: «Plato's cave as iron filings. Drag the magnet and every letter turns to follow the field, then settles back into its line.» · ficha «Magnetic dipole · {glifos} glyphs» · «Drag the magnet» · fuente `CAVE_SOURCE`.
  - Harp: «The diamond's 200 strings, tuned to a night raga. It asks before it makes a sound.» · ficha «200 strings · Raga Malkauns · plucked synthesis» · «Sweep across the strings» · permiso «This piece makes sound. Listen?» / «Yes, with sound» / «In silence» · botón «Sound on» / «Sound off».
  - Loom: «One red thread and 300 pins weave Socrates while you watch.» · ficha «300 pins · one thread · it stops when no thread improves the portrait» · «Hold to weave faster» · selector «Socrates» / «Your photo» y «Your photo stays on your device.» · crédito «Socrates, engraving by Domenico Cunego, 1783, after Anton Raphael Mengs. Wellcome Collection, CC BY 4.0.»
  - Metadatos: título «playground»; descripción igual a la intro.
  - Reducir movimiento: «Motion is reduced on your device.» / «Play the pieces».
- [x] `npm run typecheck`, `npm run lint` y `npm run test:node`, de uno en uno; todo pasa.

### Tarea 12: Verificación en el navegador

**Archivos:** scripts de QA en el scratchpad (no en el repo).

- [x] Chromium empaquetado a 1440 y 390 px y con «reducir movimiento»: capturas de cada sección, sin desborde horizontal, consola limpia; el hilo crece con el scroll y los clavitos se encienden.
- [x] Interacciones: palabra propia en Ink; arrastre en Field; Harp con permiso, rasgueo contado (instrumentación de `AudioBufferSourceNode.start`) y la regresión del silencio; Loom tejiendo y «Your photo» con una imagen de prueba.
- [x] Navegación del cliente casa → playground → sf01 → playground ×3: sin errores, `AudioContext` cerrado al salir, sin oyentes ni contextos duplicados.
- [x] Cambio de tamaño a mitad de tejido y de tinta; en «reducir movimiento», sin `longtask` > 200 ms.
- [x] Firefox 153 empaquetado: una pasada a 1440.
- [x] Mostrar a Roberto en `localhost:3000/playground`. Commit solo con su visto bueno.
