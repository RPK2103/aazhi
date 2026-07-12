"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  causticFragmentShader,
  causticVertexShader,
  createCausticUniforms,
} from "@/components/ocean/underwater-caustics-shader";
import { oceanElapsedRef } from "@/components/ocean/ocean-animation-time";

interface Props {
  depthRef: React.RefObject<number>;
  animateRef: React.RefObject<boolean>;
}

export function UnderwaterCaustics({ depthRef, animateRef }: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => createCausticUniforms(), []);

  useFrame(() => {
    if (!materialRef.current || !meshRef.current) return;
    const depth = depthRef.current;
    materialRef.current.uniforms.uDepth.value = depth;
    materialRef.current.uniforms.uAnimate.value = animateRef.current ? 1 : 0;
    if (animateRef.current) {
      materialRef.current.uniforms.uTime.value = oceanElapsedRef.current;
    }
    meshRef.current.position.y = THREE.MathUtils.lerp(2.8, 1.2, depth);
    meshRef.current.visible = depth > 0.32;
  });

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 2.8, 0]}>
      <planeGeometry args={[100, 100, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        uniforms={uniforms}
        vertexShader={causticVertexShader}
        fragmentShader={causticFragmentShader}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
