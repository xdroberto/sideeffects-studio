import type { Effect } from '../types'
import { noise2D } from './common/noise'

const fragment = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec4 u_audio;
  uniform float u_density;
  uniform float u_motion;
  uniform float u_softness;
  uniform float u_edgeWidth;
  uniform float u_edgeIntensity;
  uniform float u_hueDrift;
  uniform float u_audioReact;
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  uniform vec3 u_edgeColor;

  ${noise2D}

  void main() {
    vec2 uv = (vUv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * u_density;

    float aLow = u_audio.x * u_audioReact;
    float aHigh = u_audio.z * u_audioReact;
    float aLevel = u_audio.w * u_audioReact;

    vec2 iUv = floor(uv);
    vec2 fUv = fract(uv);

    float minDist = 1.5;
    float secondDist = 1.5;
    vec2 closestCell = vec2(0.0);

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 cellOffset = vec2(float(x), float(y));
        vec2 cellId = iUv + cellOffset;
        vec2 rnd = hash22(cellId);
        vec2 pointPos = cellOffset + rnd;
        float move = u_motion + aLow * 1.5;
        pointPos += sin(u_time * move + rnd * 6.28318) * 0.35;

        float dist = length(pointPos - fUv);
        if (dist < minDist) {
          secondDist = minDist;
          minDist = dist;
          closestCell = cellId;
        } else if (dist < secondDist) {
          secondDist = dist;
        }
      }
    }

    // edge: when F1 and F2 are close, we are near a boundary
    float edgeDelta = secondDist - minDist;
    float edge = 1.0 - smoothstep(0.0, u_edgeWidth, edgeDelta);

    // cell signature
    float cellHash = hash12(closestCell);
    float drift = u_hueDrift * sin(u_time * 0.2 + cellHash * 6.28318);

    vec3 cellColor = mix(u_colorA, u_colorB, clamp(cellHash + drift, 0.0, 1.0));

    // radial gradient inside cell (darker toward point)
    float shade = mix(1.0, 0.25, smoothstep(0.0, u_softness, minDist));
    cellColor *= shade;

    vec3 col = mix(cellColor, u_edgeColor, edge * (u_edgeIntensity + aHigh * 1.5));

    // audio brightness
    col += col * aLevel * 0.4;

    gl_FragColor = vec4(col, 1.0);
  }
`

export const voronoi: Effect = {
  id: 'voronoi',
  name: 'Voronoi Gradients',
  description: 'Celdas con gradientes y bordes — F1/F2 edge detection',
  fragment,
  uniforms: [
    { name: 'u_density', type: 'float', default: 5, min: 1.5, max: 25, step: 0.1, label: 'Density' },
    { name: 'u_motion', type: 'float', default: 0.6, min: 0, max: 3, step: 0.01, label: 'Motion' },
    { name: 'u_softness', type: 'float', default: 0.8, min: 0.1, max: 1.5, step: 0.01, label: 'Softness' },
    { name: 'u_edgeWidth', type: 'float', default: 0.1, min: 0.005, max: 0.5, step: 0.005, label: 'Edge Width' },
    { name: 'u_edgeIntensity', type: 'float', default: 0.8, min: 0, max: 2, step: 0.01, label: 'Edge Int' },
    { name: 'u_hueDrift', type: 'float', default: 0.25, min: 0, max: 1, step: 0.01, label: 'Hue Drift' },
    { name: 'u_audioReact', type: 'float', default: 1, min: 0, max: 2, step: 0.01, label: 'Audio React' },
    { name: 'u_colorA', type: 'vec3', default: [0.05, 0.04, 0.12], label: 'Color A' },
    { name: 'u_colorB', type: 'vec3', default: [0.9, 0.4, 0.15], label: 'Color B' },
    { name: 'u_edgeColor', type: 'vec3', default: [1.0, 0.95, 0.8], label: 'Edge Color' },
  ],
}
