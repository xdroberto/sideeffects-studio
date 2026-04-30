import type { Effect } from '../types'

const fragment = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec4 u_audio;
  uniform float u_size;
  uniform float u_smoothness;
  uniform float u_cameraDist;
  uniform float u_dispersion;
  uniform float u_fresnel;
  uniform float u_rotSpeed;
  uniform float u_audioReact;
  uniform vec3 u_bgA;
  uniform vec3 u_bgB;
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  uniform vec3 u_rim;

  float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
  }

  float sdSphere(vec3 p, float r) {
    return length(p) - r;
  }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  mat3 rotY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
  }

  mat3 rotX(float a) {
    float c = cos(a), s = sin(a);
    return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
  }

  float sceneSDF(vec3 p) {
    float t = u_time * u_rotSpeed;
    p = rotY(t) * rotX(t * 0.7) * p;
    float box = sdBox(p, vec3(u_size));
    float sphere = sdSphere(p, u_size * 1.25);
    return smin(box, sphere, u_smoothness);
  }

  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.0015, 0.0);
    return normalize(vec3(
      sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
      sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
      sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
  }

  float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < 80; i++) {
      vec3 p = ro + rd * t;
      float d = sceneSDF(p);
      if (d < 0.001) return t;
      if (t > 25.0) return -1.0;
      t += d * 0.9;
    }
    return -1.0;
  }

  vec3 sampleRay(vec3 ro, vec3 rd, vec3 bg) {
    float t = raymarch(ro, rd);
    if (t < 0.0) return bg;
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    float fresnel = pow(1.0 - max(0.0, dot(n, -rd)), 2.5);
    vec3 obj = mix(u_colorA, u_colorB, clamp((n.y + n.x) * 0.5 + 0.5, 0.0, 1.0));
    obj = mix(obj, u_rim, fresnel * u_fresnel);
    return obj;
  }

  void main() {
    vec2 uv = (vUv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

    float aLevel = u_audio.w * u_audioReact;
    float aHigh = u_audio.z * u_audioReact;

    // radial gradient background
    float r = length(uv);
    vec3 bg = mix(u_bgB, u_bgA, smoothstep(0.0, 1.0, r));

    vec3 ro = vec3(0.0, 0.0, u_cameraDist);

    // chromatic dispersion: 3 rays with slight offset per channel
    float split = u_dispersion * (1.0 + aHigh * 2.0);
    vec3 rdR = normalize(vec3(uv + vec2( split,  0.0), -1.0));
    vec3 rdG = normalize(vec3(uv,                         -1.0));
    vec3 rdB = normalize(vec3(uv + vec2(-split,  0.0), -1.0));

    vec3 colR = sampleRay(ro, rdR, bg);
    vec3 colG = sampleRay(ro, rdG, bg);
    vec3 colB = sampleRay(ro, rdB, bg);

    vec3 col = vec3(colR.r, colG.g, colB.b);

    // audio-driven luminance boost
    col += col * aLevel * 0.5;

    // subtle grain
    float grain = fract(sin(dot(vUv * u_resolution, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * 0.02;

    gl_FragColor = vec4(col, 1.0);
  }
`

export const raymarchSDF: Effect = {
  id: 'raymarch-sdf',
  name: 'Raymarched SDF',
  description: 'Objeto 3D con dispersión cromática y fresnel',
  fragment,
  uniforms: [
    { name: 'u_size', type: 'float', default: 0.8, min: 0.3, max: 1.5, step: 0.01, label: 'Size' },
    { name: 'u_smoothness', type: 'float', default: 0.35, min: 0, max: 0.8, step: 0.01, label: 'Smoothness' },
    { name: 'u_cameraDist', type: 'float', default: 3.5, min: 2, max: 8, step: 0.1, label: 'Cam Dist' },
    { name: 'u_dispersion', type: 'float', default: 0.015, min: 0, max: 0.08, step: 0.001, label: 'Dispersion' },
    { name: 'u_fresnel', type: 'float', default: 0.85, min: 0, max: 2, step: 0.01, label: 'Fresnel' },
    { name: 'u_rotSpeed', type: 'float', default: 0.3, min: -1.5, max: 1.5, step: 0.01, label: 'Rotation' },
    { name: 'u_audioReact', type: 'float', default: 1, min: 0, max: 2, step: 0.01, label: 'Audio React' },
    { name: 'u_bgA', type: 'vec3', default: [0.02, 0.01, 0.05], label: 'BG Center' },
    { name: 'u_bgB', type: 'vec3', default: [0.98, 0.78, 0.5], label: 'BG Edge' },
    { name: 'u_colorA', type: 'vec3', default: [0.1, 0.9, 0.6], label: 'Color A' },
    { name: 'u_colorB', type: 'vec3', default: [0.2, 0.3, 1.0], label: 'Color B' },
    { name: 'u_rim', type: 'vec3', default: [1.0, 0.4, 0.9], label: 'Rim Color' },
  ],
}
