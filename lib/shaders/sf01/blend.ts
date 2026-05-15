export const blendFragment = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D u_texA;
  uniform sampler2D u_texB;
  uniform float u_crossfade;
  uniform float u_gainA;
  uniform float u_gainB;
  uniform int u_blendMode;
  uniform vec4 u_audio;

  vec3 bAdd(vec3 a, vec3 b) { return clamp(a + b, 0.0, 1.0); }
  vec3 bMul(vec3 a, vec3 b) { return a * b; }
  vec3 bScr(vec3 a, vec3 b) { return vec3(1.0) - (vec3(1.0) - a) * (vec3(1.0) - b); }
  vec3 bDif(vec3 a, vec3 b) { return abs(a - b); }
  vec3 bOvr(vec3 a, vec3 b) {
    vec3 o;
    for (int i = 0; i < 3; i++) {
      o[i] = a[i] < 0.5
        ? 2.0 * a[i] * b[i]
        : 1.0 - 2.0 * (1.0 - a[i]) * (1.0 - b[i]);
    }
    return o;
  }

  void main() {
    vec3 a = texture2D(u_texA, vUv).rgb * u_gainA;
    vec3 b = texture2D(u_texB, vUv).rgb * u_gainB;
    float t = u_crossfade;

    vec3 col;
    if (u_blendMode == 0) {
      col = mix(a, b, t);
    } else {
      vec3 mixed;
      if (u_blendMode == 1) mixed = bAdd(a, b);
      else if (u_blendMode == 2) mixed = bMul(a, b);
      else if (u_blendMode == 3) mixed = bScr(a, b);
      else if (u_blendMode == 4) mixed = bDif(a, b);
      else mixed = bOvr(a, b);

      if (t < 0.5) col = mix(a, mixed, t * 2.0);
      else col = mix(mixed, b, (t - 0.5) * 2.0);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`
