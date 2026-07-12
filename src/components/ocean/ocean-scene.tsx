"use client";

/* eslint-disable react-hooks/immutability -- R3F scene graph updates occur in useFrame by design */

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { WaterSurface } from "@/components/ocean/water-surface";
import { LightShafts } from "@/components/ocean/light-shafts";
import { SuspendedParticles } from "@/components/ocean/suspended-particles";
import { MicroBubbles } from "@/components/ocean/micro-bubbles";
import { UnderwaterCaustics } from "@/components/ocean/underwater-caustics";
import { oceanElapsedRef } from "@/components/ocean/ocean-animation-time";

interface Props {
  depthRef: React.RefObject<number>;
  animateRef: React.RefObject<boolean>;
  reducedMotion: boolean;
  waterSegments?: number;
  lightShaftCount?: number;
}

const SURFACE_BG = new THREE.Color("#071a28");
const MID_BG = new THREE.Color("#04121d");
const UNDERWATER_BG = new THREE.Color("#02060c");
const FOG_SURFACE = new THREE.Color("#061a24");
const FOG_MID = new THREE.Color("#041018");
const FOG_UNDERWATER = new THREE.Color("#020508");

export function OceanScene({
  depthRef,
  animateRef,
  reducedMotion,
  waterSegments = 96,
  lightShaftCount = 5,
}: Props) {
  const { scene, camera } = useThree();
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const bgColor = useRef(new THREE.Color());
  const lookAt = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (animateRef.current) {
      oceanElapsedRef.current += delta;
    }

    const depth = depthRef.current;
    const cam = camera as THREE.PerspectiveCamera;

    cam.position.y = THREE.MathUtils.lerp(2.4, -3.4, depth);
    cam.position.z = THREE.MathUtils.lerp(10.5, 7.2, depth);
    lookAt.current.set(0, THREE.MathUtils.lerp(-0.2, -2.2, depth), 0);
    cam.lookAt(lookAt.current);

    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(0.4, 0.2, depth);
    }

    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog) {
      const midDepth = smoothstep(0.2, 0.55, depth);
      const deepDepth = smoothstep(0.45, 1, depth);
      fog.density = THREE.MathUtils.lerp(0.012, 0.078, depth);
      fog.color.copy(FOG_SURFACE)
        .lerp(FOG_MID, midDepth)
        .lerp(FOG_UNDERWATER, deepDepth);
    }

    bgColor.current.copy(SURFACE_BG).lerp(MID_BG, smoothstep(0.15, 0.55, depth));
    bgColor.current.lerp(UNDERWATER_BG, smoothstep(0.5, 1, depth));
    scene.background = bgColor.current;
  });

  return (
    <>
      <fog attach="fog" args={["#061a24", 0.012]} />
      <ambientLight ref={ambientRef} intensity={0.4} color="#8ec8d8" />
      <directionalLight position={[4, 16, 6]} intensity={0.55} color="#c8faf4" />
      <directionalLight position={[-6, 10, -4]} intensity={0.1} color="#2a5a68" />
      <WaterSurface
        depthRef={depthRef}
        animateRef={animateRef}
        waterSegments={waterSegments}
      />
      <UnderwaterCaustics depthRef={depthRef} animateRef={animateRef} />
      <LightShafts
        depthRef={depthRef}
        animateRef={animateRef}
        shaftCount={lightShaftCount}
      />
      <SuspendedParticles
        depthRef={depthRef}
        animateRef={animateRef}
        reducedCount={reducedMotion}
      />
      <MicroBubbles
        depthRef={depthRef}
        animateRef={animateRef}
        reducedCount={reducedMotion}
      />
    </>
  );
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
