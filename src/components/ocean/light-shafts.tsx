"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { oceanElapsedRef } from "@/components/ocean/ocean-animation-time";

const SHAFTS = [
  { x: -8, z: -6, scale: 1.2, rot: -0.14, phase: 0.3, opacity: 0.028, drift: 0.012 },
  { x: 2, z: -10, scale: 0.9, rot: 0.1, phase: 1.8, opacity: 0.022, drift: -0.009 },
  { x: 10, z: -3, scale: 1.05, rot: -0.06, phase: 3.1, opacity: 0.025, drift: 0.008 },
  { x: -3, z: 5, scale: 0.8, rot: 0.16, phase: 4.6, opacity: 0.018, drift: -0.011 },
  { x: 6, z: 2, scale: 0.7, rot: -0.11, phase: 5.9, opacity: 0.016, drift: 0.007 },
] as const;

interface Props {
  depthRef: React.RefObject<number>;
  animateRef: React.RefObject<boolean>;
  shaftCount?: number;
}

export function LightShafts({ depthRef, animateRef, shaftCount = 5 }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);

  useFrame(() => {
    if (!groupRef.current) return;
    const depth = depthRef.current;
    const elapsed = oceanElapsedRef.current;
    const underwater = smoothstep(0.25, 0.75, depth);
    groupRef.current.visible = underwater > 0.02;
    groupRef.current.position.y = THREE.MathUtils.lerp(6.5, 12, depth);

    meshRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const shaft = SHAFTS[index];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = shaft.opacity * underwater;

      mesh.rotation.z = shaft.rot;
      if (animateRef.current) {
        mesh.rotation.z +=
          Math.sin(elapsed * 0.025 + shaft.phase) * 0.018;
        mesh.position.x =
          shaft.x + Math.sin(elapsed * 0.02 + shaft.phase) * 0.6;
      } else {
        mesh.position.x = shaft.x;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {SHAFTS.slice(0, shaftCount).map((shaft, index) => (
        <mesh
          key={index}
          ref={(node) => {
            if (node) meshRefs.current[index] = node;
          }}
          position={[shaft.x, 0, shaft.z]}
          rotation={[0.08, 0, shaft.rot]}
          scale={[0.48 * shaft.scale, 22, 0.12]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#7ed8d0"
            transparent
            opacity={shaft.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
