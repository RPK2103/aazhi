"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { oceanElapsedRef } from "@/components/ocean/ocean-animation-time";

const PARTICLE_COUNT_DESKTOP = 48;
const PARTICLE_COUNT_MOBILE = 22;

const particleVertexShader = /* glsl */ `
attribute float aSeed;
attribute float aSize;

uniform float uTime;
uniform float uDepth;
uniform float uAnimate;

varying float vAlpha;

void main() {
  float visibility = smoothstep(0.18, 0.62, uDepth);
  float seed = aSeed * 6.28318;
  vec3 pos = position;

  if (uAnimate > 0.5) {
    pos.x += sin(uTime * 0.08 + seed) * 0.35 + cos(uTime * 0.05 + seed * 1.7) * 0.18;
    pos.y += cos(uTime * 0.06 + seed * 2.1) * 0.12;
    pos.z += sin(uTime * 0.04 + seed * 0.8) * 0.22;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float depthScale = mix(0.55, 1.0, aSeed);
  gl_PointSize = aSize * depthScale * (220.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;

  float depthFade = smoothstep(12.0, 45.0, -mvPosition.z);
  vAlpha = visibility * mix(0.12, 0.42, aSeed) * depthFade;
}
`;

const particleFragmentShader = /* glsl */ `
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;
  float soft = smoothstep(0.5, 0.08, dist);
  gl_FragColor = vec4(0.72, 0.84, 0.88, vAlpha * soft);
}
`;

function buildParticleGeometry(count: number) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const seed = Math.random();
    positions[i * 3] = (Math.random() - 0.5) * 36;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 18 - 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 28 - 8;
    seeds[i] = seed;
    sizes[i] = 1.8 + seed * 2.8;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  return geo;
}

interface Props {
  depthRef: React.RefObject<number>;
  animateRef: React.RefObject<boolean>;
  reducedCount?: boolean;
}

export function SuspendedParticles({
  depthRef,
  animateRef,
  reducedCount = false,
}: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = reducedCount ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
  const geometry = useMemo(() => buildParticleGeometry(count), [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDepth: { value: 0 },
      uAnimate: { value: 1 },
    }),
    [],
  );

  useFrame(() => {
    if (!materialRef.current || !pointsRef.current) return;
    const depth = depthRef.current;
    materialRef.current.uniforms.uDepth.value = depth;
    materialRef.current.uniforms.uAnimate.value = animateRef.current ? 1 : 0;
    if (animateRef.current) {
      materialRef.current.uniforms.uTime.value = oceanElapsedRef.current;
    }
    pointsRef.current.position.y = THREE.MathUtils.lerp(1.2, -2.8, depth);
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
