"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  createWaterUniforms,
  waterFragmentShader,
  waterVertexShader,
} from "@/components/ocean/water-shader";
import { oceanElapsedRef } from "@/components/ocean/ocean-animation-time";
import { sceneWaterPlaneY } from "@/components/ocean/ocean-depth-curve";

interface Props {
  depthRef: React.RefObject<number>;
  animateRef: React.RefObject<boolean>;
  waterSegments?: number;
}

export function WaterSurface({ depthRef, animateRef, waterSegments = 96 }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => createWaterUniforms(), []);

  useFrame(() => {
    if (!materialRef.current || !meshRef.current) return;
    const depth = depthRef.current;
    if (animateRef.current) {
      materialRef.current.uniforms.uTime.value = oceanElapsedRef.current;
      materialRef.current.uniforms.uAnimate.value = 1;
    } else {
      materialRef.current.uniforms.uAnimate.value = 0.15;
    }
    materialRef.current.uniforms.uDepth.value = depth;
    meshRef.current.position.y = sceneWaterPlaneY(depth);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
      <planeGeometry args={[140, 140, waterSegments, waterSegments]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        uniforms={uniforms}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
