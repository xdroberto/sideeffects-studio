# Rediseño octubre 2026: B, C y D aprobados

Fecha: 2026-10-20. Rama: `feat/rediseno-octubre-2026` (local, sin commits ni push hasta el visto bueno de Roberto).
Decisiones tomadas viendo el laboratorio: https://claude.ai/artifact/SkbF3phe3NidMJvJuGepKb

## Decisiones

- **A, hero:** pendiente. Ronda 2 en el laboratorio (A1 Respira, A4 Pulsar, A5 Atracción): sin música, responde al mouse y al toque. El texto del hero no cambia y el diamante se conserva.
- **B1:** en el home, al bajar, el diamante se pliega sobre su onda, la onda se vuelve tinta Turing y la galería se abre en ventanas con forma de diamante.
- **B2:** al navegar, las cuerdas se reacomodan en la portada de cada página: dos decks en SF-01, ocho pads en Chord Lab, el orbe en Playground. Legales, 404 y error: una línea tranquila.
- **C1:** la onda del diamante marca la página actual del menú; las viñetas de las etiquetas pasan de punto pulsante a señal animada; el badge de video deja la píldora (dato + triángulo de cuerdas). Los bordes redondeados se quedan.
- **C2:** arreglo definitivo de la cuadrícula de la galería para cualquier número de obras, sin huecos.
- **C3:** tres voces. Michroma para títulos, Archivo para texto (sustituye a Inter), Space Mono para datos y etiquetas.
- **D:** Chord Lab dice «early 2027». SF-01 dice «In development» y pierde todas sus fechas. El footer se vuelve legible sobre el fondo ASCII.

## Arquitectura

- **Escena persistente** en `components/scene/`, montada en `app/layout.tsx` como capa fija detrás del contenido, con un solo Canvas de R3F.
  - `shapes.mjs` no tiene dependencias y se prueba con `node --test`. Cada forma son 200 segmentos; la del home es la misma matemática que `ConnectingLines` (100 cuerdas arriba y 100 abajo), así que el hero no cambia.
  - Morph al cambiar de ruta, de la forma actual a la nueva, con un retraso escalonado por cuerda (~1.2 s). Con «reducir movimiento» el cambio es instantáneo.
  - Portadas: en escritorio ocupan la mitad derecha del encabezado; en móvil van detrás del título con alfa baja. Se desplazan con el scroll como parte del encabezado.
  - Tinta (B1): Gray-Scott en ping-pong HalfFloat, con RGBA8 como respaldo. La semilla es la onda proyectada por la cámara principal en un render target, y se muestra en un quad a pantalla completa en clip space.
  - Error boundary: si WebGL falla, queda una capa estática y la página sigue funcionando.
  - Rendimiento: fuera del home, el frameloop se pausa cuando la portada salió de vista y no hay morph.
- **Galería:** planificador de bandas (programación dinámica sobre plantillas; 4 columnas en escritorio, 2 en móvil) que usa `aspectRatio` y `featured`. No deja huecos con ninguna cantidad de obras. El revelado en diamante va ligado al scroll y el `clip-path` pasa a `none` al abrir del todo, para conservar el redondeo. El contenedor es transparente para que se vea la tinta.
- **Footer:** halo oscuro detrás de cada bloque de texto, por encima del ASCII.

## Verificación

1. `npm run typecheck`, `npm run lint` y `npm run test:node`, una a la vez (el equipo tiene poca memoria libre).
2. QA visual con los navegadores empaquetados de Playwright (Chromium y Firefox, 1440 y 390 px). Solo después de que Roberto autorice levantar el servidor.
3. Nada llega a `main` ni a producción sin su visto bueno.
