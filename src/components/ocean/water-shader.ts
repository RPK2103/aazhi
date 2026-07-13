import * as THREE from "three";

export const waterVertexShader = /* glsl */ `
uniform float uTime;
uniform float uDepth;
uniform float uAnimate;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vElevation;
varying float vWaveSlope;

float waveHeight(vec2 p, float t) {
  float w1 = sin(dot(p, vec2(0.082, 0.031)) + t * 0.20) * 0.088;
  float w2 = sin(dot(p, vec2(-0.054, 0.098)) - t * 0.26) * 0.055;
  float w3 = sin(dot(p, vec2(0.121, -0.067)) + t * 0.35) * 0.029;
  float w4 = sin(dot(p, vec2(0.173, 0.142)) - t * 0.47 + sin(p.x * 0.07) * 0.55) * 0.014;
  return w1 + w2 + w3 + w4;
}

void main() {
  vec3 pos = position;
  float t = uTime * uAnimate;
  float damp = mix(1.0, 0.62, uDepth);
  float crossingBoost = smoothstep(0.28, 0.52, uDepth) * (1.0 - smoothstep(0.52, 0.72, uDepth));

  float h = waveHeight(pos.xy, t) * damp * (1.0 + crossingBoost * 0.22);
  pos.z += h;
  vElevation = h;

  float eps = 0.14;
  float hx = waveHeight(pos.xy + vec2(eps, 0.0), t) - waveHeight(pos.xy - vec2(eps, 0.0), t);
  float hy = waveHeight(pos.xy + vec2(0.0, eps), t) - waveHeight(pos.xy - vec2(0.0, eps), t);
  vec3 localNormal = normalize(vec3(-hx * 2.8, -hy * 2.8, 1.0));
  vWaveSlope = length(vec2(hx, hy));

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(normalMatrix * localNormal);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const waterFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uDepth;
uniform float uAnimate;
uniform vec3 uTroughColor;
uniform vec3 uMidColor;
uniform vec3 uBodyColor;
uniform vec3 uHighlightColor;
uniform vec3 uSpecularColor;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vElevation;
varying float vWaveSlope;

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
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float ndv = max(dot(viewDir, vNormal), 0.0);
  float fresnel = pow(1.0 - ndv, 3.2);

  float surfaceZone = 1.0 - smoothstep(0.08, 0.38, uDepth);
  float crossingZone = smoothstep(0.22, 0.42, uDepth) * (1.0 - smoothstep(0.48, 0.68, uDepth));
  float underwaterZone = smoothstep(0.42, 0.82, uDepth);

  float t = uTime * uAnimate;
  vec2 flowUv = vWorldPosition.xz * 0.08 + vec2(t * 0.05, -t * 0.034);
  vec2 flowUv2 = vWorldPosition.xz * 0.13 + vec2(-t * 0.038, t * 0.024);
  float highlightFlow = noise(flowUv) * 0.55 + noise(flowUv2) * 0.45;
  float crest = smoothstep(0.008, 0.065, vElevation + vWaveSlope * 0.04);

  vec3 color = mix(uTroughColor, uMidColor, smoothstep(-0.02, 0.05, vElevation) + fresnel * 0.18);
  color = mix(color, uBodyColor, fresnel * 0.28 + crest * 0.12);

  float highlightStrength = crest * 0.16 + highlightFlow * 0.11 + fresnel * 0.1;
  highlightStrength += surfaceZone * 0.12 + crossingZone * 0.08;
  color += uHighlightColor * highlightStrength;

  float spec = pow(fresnel, 5.0) * (0.06 + crest * 0.08 + surfaceZone * 0.05);
  color += uSpecularColor * spec;

  float alpha = mix(0.9, 0.72, uDepth);
  alpha = mix(alpha, 0.82, underwaterZone * 0.25);

  bool viewFromBelow = cameraPosition.y < vWorldPosition.y - 0.05;
  if (viewFromBelow) {
    float distantSurface = smoothstep(0.58, 0.92, uDepth);
    float ceilingGlow = crest * 0.22 + highlightFlow * 0.14 + fresnel * 0.16;
    ceilingGlow *= underwaterZone * 0.85 + crossingZone * 0.35;
    ceilingGlow *= 1.0 - distantSurface * 0.88;
    color = mix(color, uBodyColor + uHighlightColor * 0.35, ceilingGlow);
    color += uHighlightColor * ceilingGlow * 0.35;
    alpha = mix(0.35, 0.62, underwaterZone);
    alpha *= mix(1.0, 0.1, distantSurface);
  }

  gl_FragColor = vec4(color, alpha);
}
`;

export function createWaterUniforms() {
  return {
    uTime: { value: 0 },
    uDepth: { value: 0 },
    uAnimate: { value: 1 },
    uTroughColor: { value: new THREE.Color("#04121d") },
    uMidColor: { value: new THREE.Color("#061b27") },
    uBodyColor: { value: new THREE.Color("#0e3a48") },
    uHighlightColor: { value: new THREE.Color("#4ec8be") },
    uSpecularColor: { value: new THREE.Color("#b8ece8") },
  };
}
