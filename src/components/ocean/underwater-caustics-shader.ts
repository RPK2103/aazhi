export const causticVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const causticFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uDepth;
uniform float uAnimate;

varying vec2 vUv;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  float underwater = smoothstep(0.38, 0.78, uDepth);
  if (underwater < 0.01) discard;

  float deepFade = 1.0 - smoothstep(0.76, 1.0, uDepth) * 0.82;

  float t = uTime * uAnimate;
  vec2 uv1 = vWorldPosition.xz * 0.035 + vec2(t * 0.018, t * 0.012);
  vec2 uv2 = vWorldPosition.xz * 0.055 + vec2(-t * 0.011, t * 0.016);
  float field = noise(uv1) * 0.6 + noise(uv2) * 0.4;
  field = smoothstep(0.42, 0.82, field);

  float edgeFade = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
  float alpha = field * underwater * edgeFade * 0.09 * deepFade;
  gl_FragColor = vec4(0.45, 0.86, 0.82, alpha);
}
`;

export function createCausticUniforms() {
  return {
    uTime: { value: 0 },
    uDepth: { value: 0 },
    uAnimate: { value: 1 },
  };
}
