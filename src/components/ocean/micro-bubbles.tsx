"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { oceanElapsedRef } from "@/components/ocean/ocean-animation-time";

const BUBBLE_COUNT_DESKTOP = 24;
const BUBBLE_COUNT_MOBILE = 10;

const bubbleVertexShader = /* glsl */ `
attribute float aSeed;
attribute float aSpeed;

uniform float uTime;
uniform float uDepth;
uniform float uAnimate;

varying float vAlpha;

void main() {
  float visibility = smoothstep(0.32, 0.72, uDepth);
  float seed = aSeed * 6.28318;
  vec3 pos = position;

  if (uAnimate > 0.5) {
    float rise = mod(uTime * aSpeed + seed, 14.0);
    pos.y += rise - 7.0;
    pos.x += sin(uTime * 0.12 + seed) * 0.08;
    pos.z += cos(uTime * 0.09 + seed * 1.3) * 0.06;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float size = mix(1.2, 2.4, aSeed);
  gl_PointSize = size * (180.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = visibility * mix(0.08, 0.28, aSeed);
}
`;

const bubbleFragmentShader = /* glsl */ `
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;
  float core = smoothstep(0.5, 0.0, dist);
  gl_FragColor = vec4(0.82, 0.95, 0.96, vAlpha * core);
}
`;

function buildBubbleGeometry(count: number) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const seed = Math.random();
    positions[i * 3] = (Math.random() - 0.5) * 28;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10 - 4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 6;
    seeds[i] = seed;
    speeds[i] = 0.12 + seed * 0.18;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
  return geo;
}

interface Props {
  depthRef: React.RefObject<number>;
  animateRef: React.RefObject<boolean>;
  reducedCount?: boolean;
}

export function MicroBubbles({
  depthRef,
  animateRef,
  reducedCount = false,
}: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = reducedCount ? BUBBLE_COUNT_MOBILE : BUBBLE_COUNT_DESKTOP;
  const geometry = useMemo(() => buildBubbleGeometry(count), [count]);

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
    pointsRef.current.position.y = THREE.MathUtils.lerp(0.5, -2.2, depth);
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={bubbleVertexShader}
        fragmentShader={bubbleFragmentShader}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
