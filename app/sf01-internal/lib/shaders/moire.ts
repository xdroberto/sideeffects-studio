import type { Effect } from '../types'

const fragment = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec4 u_audio; // x=low, y=mid, z=high, w=level
  uniform float u_lineCount;
  uniform float u_rotation;
  uniform float u_thickness;
  uniform float u_warp;
  uniform float u_driftSpeed;
  uniform float u_chromaticSplit;
  uniform float u_glow;
  uniform float u_hueShift;
  uniform float u_secondLayer;
  uniform float u_audioReact;
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  float pattern(vec2 p, float phase, float audioDrift, float audioWarp) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float drift = u_time * (u_driftSpeed + audioDrift) + phase;
    float freq = u_lineCount * 6.28318;
    float a = sin(radius * freq + drift);
    float b = sin(radius * freq * (1.0 + (u_warp + audioWarp) * 0.4) + angle * 2.0 + u_rotation - drift * 0.6);
    float interference = a * b;
    float base = smoothstep(u_thickness - 0.15, u_thickness + 0.15, interference);

    if (u_secondLayer > 0.001) {
      float a2 = sin(radius * freq * 1.7 + u_time * 0.8);
      float b2 = sin(angle * 5.0 + u_time * 0.5);
      float extra = smoothstep(0.2, 0.8, a2 * b2);
      base = mix(base, max(base, extra), u_secondLayer);
    }
    return base;
  }

  void main() {
    vec2 uv = (vUv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

    // audio modulation (balanced so audioReact=1 gives comparable impact across effects)
    float aLow = u_audio.x * u_audioReact;
    float aMid = u_audio.y * u_audioReact;
    float aHigh = u_audio.z * u_audioReact;
    float aLevel = u_audio.w * u_audioReact;

    // chromatic split grows with highs, drift boosted by level, warp nudged by mids
    float split = (u_chromaticSplit + aHigh * 1.5) * (0.3 + length(uv) * 0.7);
    float audioDrift = aLevel * 3.5;
    float audioWarp = aMid * 1.2;
    float mR = pattern(uv, -split, audioDrift, audioWarp);
    float mG = pattern(uv,  0.0,   audioDrift, audioWarp);
    float mB = pattern(uv,  split, audioDrift, audioWarp);

    vec3 col = vec3(
      mix(u_colorA.r, u_colorB.r, mR),
      mix(u_colorA.g, u_colorB.g, mG),
      mix(u_colorA.b, u_colorB.b, mB)
    );

    // time-driven hue drift
    if (u_hueShift > 0.001) {
      vec3 hsv = rgb2hsv(col);
      hsv.x = fract(hsv.x + u_hueShift * (0.5 + 0.5 * sin(u_time * 0.3)));
      col = hsv2rgb(hsv);
    }

    // bloom-ish glow: boost bright regions non-linearly (boosted by level)
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 hot = col * pow(luma, 2.5) * 2.5;
    col += hot * (u_glow + aLevel * 1.5);

    // soft vignette
    float r = length(uv);
    col *= mix(0.55, 1.05, smoothstep(1.3, 0.0, r));

    // subtle scanline / film grain for texture
    float grain = fract(sin(dot(vUv * u_resolution, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * 0.03;

    gl_FragColor = vec4(col, 1.0);
  }
`

export const moire: Effect = {
  id: 'moire',
  name: 'Moiré Radial',
  description: 'Interferencia radial con chromatic split, glow y hue drift',
  fragment,
  uniforms: [
    { name: 'u_lineCount', type: 'float', default: 18, min: 1, max: 180, step: 0.1, label: 'Line Count' },
    { name: 'u_rotation', type: 'float', default: 0, min: 0, max: 6.28318, step: 0.01, label: 'Rotation' },
    { name: 'u_thickness', type: 'float', default: 0, min: -0.8, max: 0.8, step: 0.01, label: 'Thickness' },
    { name: 'u_warp', type: 'float', default: 0.25, min: 0, max: 1, step: 0.01, label: 'Warp' },
    { name: 'u_driftSpeed', type: 'float', default: 0.5, min: -3, max: 3, step: 0.01, label: 'Drift' },
    { name: 'u_chromaticSplit', type: 'float', default: 0.15, min: 0, max: 2, step: 0.01, label: 'RGB Split' },
    { name: 'u_glow', type: 'float', default: 0.5, min: 0, max: 2, step: 0.01, label: 'Glow' },
    { name: 'u_hueShift', type: 'float', default: 0, min: 0, max: 1, step: 0.01, label: 'Hue Drift' },
    { name: 'u_secondLayer', type: 'float', default: 0, min: 0, max: 1, step: 0.01, label: 'Second Layer' },
    { name: 'u_audioReact', type: 'float', default: 1, min: 0, max: 2, step: 0.01, label: 'Audio React' },
    { name: 'u_colorA', type: 'vec3', default: [0.04, 0.0, 0.12], label: 'Color A' },
    { name: 'u_colorB', type: 'vec3', default: [1.0, 0.3, 0.7], label: 'Color B' },
  ],
}
