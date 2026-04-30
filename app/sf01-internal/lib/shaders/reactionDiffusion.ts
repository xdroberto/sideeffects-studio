import type { Effect } from '../types'

const compute = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D u_prev;
  uniform vec2 u_texelSize;
  uniform vec4 u_audio;
  uniform float u_feed;
  uniform float u_kill;
  uniform float u_diffA;
  uniform float u_diffB;
  uniform float u_dt;
  uniform float u_audioReact;

  void main() {
    vec2 tx = u_texelSize;
    vec2 c = texture2D(u_prev, vUv).rg;

    vec2 lap = vec2(0.0);
    lap += texture2D(u_prev, vUv + vec2(-tx.x, -tx.y)).rg * 0.05;
    lap += texture2D(u_prev, vUv + vec2(0.0,   -tx.y)).rg * 0.20;
    lap += texture2D(u_prev, vUv + vec2( tx.x, -tx.y)).rg * 0.05;
    lap += texture2D(u_prev, vUv + vec2(-tx.x,  0.0)).rg * 0.20;
    lap += texture2D(u_prev, vUv + vec2( tx.x,  0.0)).rg * 0.20;
    lap += texture2D(u_prev, vUv + vec2(-tx.x,  tx.y)).rg * 0.05;
    lap += texture2D(u_prev, vUv + vec2(0.0,    tx.y)).rg * 0.20;
    lap += texture2D(u_prev, vUv + vec2( tx.x,  tx.y)).rg * 0.05;
    lap -= c;

    float A = c.r;
    float B = c.g;
    float reaction = A * B * B;
    float audioFeed = u_audio.x * u_audioReact * 0.025;
    float effFeed = clamp(u_feed + audioFeed, 0.005, 0.09);
    float dA = u_diffA * lap.r - reaction + effFeed * (1.0 - A);
    float dB = u_diffB * lap.g + reaction - (effFeed + u_kill) * B;

    vec2 next = clamp(c + vec2(dA, dB) * u_dt, 0.0, 1.0);
    gl_FragColor = vec4(next, 0.0, 1.0);
  }
`

const seed = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float u_seedRadius;
  uniform float u_time;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    float A = 1.0;
    float B = 0.0;

    vec2 centered = vUv - 0.5;

    float d = length(centered);
    if (d < u_seedRadius) B = 1.0;

    for (int i = 0; i < 4; i++) {
      vec2 offset = vec2(
        hash(vec2(float(i) * 1.73, u_time)) - 0.5,
        hash(vec2(float(i) * 3.17, u_time + 1.0)) - 0.5
      ) * 0.7;
      float dd = length(centered - offset);
      if (dd < u_seedRadius * 0.6) B = 1.0;
    }

    gl_FragColor = vec4(A, B, 0.0, 1.0);
  }
`

const display = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D u_state;
  uniform vec2 u_stateRes;
  uniform vec4 u_audio;
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  uniform vec3 u_edgeColor;
  uniform float u_contrast;
  uniform float u_edgeWidth;
  uniform float u_sharpness;
  uniform float u_glow;
  uniform float u_audioReact;

  // Bicubic-ish sampling via 5-tap unsharp mask for crisp upscaling
  float sampleSharp(vec2 uv) {
    vec2 tx = 1.0 / u_stateRes;
    float c  = texture2D(u_state, uv).g;
    float l  = texture2D(u_state, uv + vec2(-tx.x, 0.0)).g;
    float r  = texture2D(u_state, uv + vec2( tx.x, 0.0)).g;
    float u  = texture2D(u_state, uv + vec2(0.0, -tx.y)).g;
    float d  = texture2D(u_state, uv + vec2(0.0,  tx.y)).g;
    float blur = (c * 4.0 + l + r + u + d) / 8.0;
    return clamp(c + (c - blur) * u_sharpness * 4.0, 0.0, 1.0);
  }

  void main() {
    float v = sampleSharp(vUv);

    // Crisp threshold with controllable edge width
    float mid = 0.35 - u_contrast * 0.1;
    float shaped = smoothstep(mid - u_edgeWidth, mid + u_edgeWidth, v);

    // Edge detection: highlight transition band
    vec2 tx = 1.0 / u_stateRes;
    float gx = sampleSharp(vUv + vec2(tx.x, 0.0)) - sampleSharp(vUv - vec2(tx.x, 0.0));
    float gy = sampleSharp(vUv + vec2(0.0, tx.y)) - sampleSharp(vUv - vec2(0.0, tx.y));
    float edge = length(vec2(gx, gy)) * 3.5;
    edge = smoothstep(0.05, 0.5, edge);

    float aLevel = u_audio.w * u_audioReact;
    float aHigh = u_audio.z * u_audioReact;

    vec3 col = mix(u_colorA, u_colorB, shaped);
    col = mix(col, u_edgeColor, edge * (u_glow + aHigh * 1.8));

    // Subtle luminance boost in bright zones (boosted by level)
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col += col * pow(luma, 2.0) * (u_glow * 0.4 + aLevel * 1.5);

    gl_FragColor = vec4(col, 1.0);
  }
`

export const reactionDiffusion: Effect = {
  id: 'reaction-diffusion',
  name: 'Reaction-Diffusion',
  description: 'Gray-Scott model — patrones orgánicos por feedback químico',
  uniforms: [
    { name: 'u_feed', type: 'float', default: 0.037, min: 0.01, max: 0.08, step: 0.0005, label: 'Feed' },
    { name: 'u_kill', type: 'float', default: 0.062, min: 0.04, max: 0.068, step: 0.0005, label: 'Kill' },
    { name: 'u_diffA', type: 'float', default: 1.0, min: 0.3, max: 1.5, step: 0.01, label: 'Diffusion A' },
    { name: 'u_diffB', type: 'float', default: 0.5, min: 0.1, max: 0.8, step: 0.01, label: 'Diffusion B' },
    { name: 'u_dt', type: 'float', default: 1.0, min: 0.1, max: 1.5, step: 0.01, label: 'Time Step' },
    { name: 'u_seedRadius', type: 'float', default: 0.06, min: 0.01, max: 0.2, step: 0.005, label: 'Seed Radius' },
    { name: 'u_contrast', type: 'float', default: 0.5, min: 0, max: 1, step: 0.01, label: 'Contrast' },
    { name: 'u_edgeWidth', type: 'float', default: 0.03, min: 0.005, max: 0.2, step: 0.005, label: 'Edge Width' },
    { name: 'u_sharpness', type: 'float', default: 0.7, min: 0, max: 2, step: 0.01, label: 'Sharpness' },
    { name: 'u_glow', type: 'float', default: 0.6, min: 0, max: 2, step: 0.01, label: 'Glow' },
    { name: 'u_audioReact', type: 'float', default: 1, min: 0, max: 2, step: 0.01, label: 'Audio React' },
    { name: 'u_colorA', type: 'vec3', default: [0.02, 0.02, 0.06], label: 'Color A' },
    { name: 'u_colorB', type: 'vec3', default: [1.0, 0.85, 0.45], label: 'Color B' },
    { name: 'u_edgeColor', type: 'vec3', default: [1.0, 0.35, 0.1], label: 'Edge Color' },
  ],
  feedback: {
    compute,
    display,
    seed,
    resolution: 1440,
    iterations: 10,
  },
}
