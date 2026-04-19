import type { Effect } from '../types'
import { noise2D } from './common/noise'

const fragment = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec4 u_audio;
  uniform float u_scale;
  uniform float u_warp1;
  uniform float u_warp2;
  uniform float u_timeScale;
  uniform float u_contrast;
  uniform float u_glow;
  uniform float u_audioReact;
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  uniform vec3 u_colorC;

  ${noise2D}

  void main() {
    vec2 uv = (vUv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
    vec2 p = uv * u_scale;

    float aLow = u_audio.x * u_audioReact;
    float aMid = u_audio.y * u_audioReact;
    float aLevel = u_audio.w * u_audioReact;

    float t = u_time * u_timeScale;

    vec2 q = vec2(
      fbm(p + vec2(0.0, t)),
      fbm(p + vec2(5.2, 1.3 - t))
    );

    float warp1 = u_warp1 + aLow * 1.2;
    float warp2 = u_warp2 + aMid * 0.8;

    vec2 r = vec2(
      fbm(p + q * warp1 + vec2(1.7 + t * 0.5, 9.2)),
      fbm(p + q * warp1 + vec2(8.3 - t * 0.3, 2.8))
    );

    float f = fbm(p + r * warp2);
    f = pow(clamp(f * u_contrast, 0.0, 1.0), 1.2);

    vec3 col = mix(u_colorA, u_colorB, f);
    col = mix(col, u_colorC, clamp(length(r) * 0.55, 0.0, 1.0));
    col += u_colorC * length(q) * u_glow * 0.4;

    // audio glow bump
    col += col * aLevel * 0.5;

    // subtle vignette
    float vignette = smoothstep(1.3, 0.2, length(uv));
    col *= mix(0.7, 1.05, vignette);

    gl_FragColor = vec4(col, 1.0);
  }
`

export const domainWarping: Effect = {
  id: 'domain-warping',
  name: 'Domain Warping',
  description: 'FBM anidado — plasma líquido orgánico (iq pattern)',
  fragment,
  uniforms: [
    { name: 'u_scale', type: 'float', default: 2.5, min: 0.5, max: 10, step: 0.1, label: 'Scale' },
    { name: 'u_warp1', type: 'float', default: 3.0, min: 0, max: 6, step: 0.05, label: 'Warp 1' },
    { name: 'u_warp2', type: 'float', default: 2.5, min: 0, max: 6, step: 0.05, label: 'Warp 2' },
    { name: 'u_timeScale', type: 'float', default: 0.15, min: -1, max: 1, step: 0.01, label: 'Time' },
    { name: 'u_contrast', type: 'float', default: 1.3, min: 0.5, max: 3, step: 0.01, label: 'Contrast' },
    { name: 'u_glow', type: 'float', default: 0.5, min: 0, max: 2, step: 0.01, label: 'Glow' },
    { name: 'u_audioReact', type: 'float', default: 1, min: 0, max: 2, step: 0.01, label: 'Audio React' },
    { name: 'u_colorA', type: 'vec3', default: [0.04, 0.02, 0.12], label: 'Color A' },
    { name: 'u_colorB', type: 'vec3', default: [0.9, 0.25, 0.5], label: 'Color B' },
    { name: 'u_colorC', type: 'vec3', default: [1.0, 0.85, 0.35], label: 'Color C' },
  ],
}
