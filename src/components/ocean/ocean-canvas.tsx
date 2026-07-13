"use client";

import { useCallback, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useMotionValueEvent, type MotionValue } from "motion/react";
import { OceanScene } from "@/components/ocean/ocean-scene";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { useOceanCapabilities } from "@/hooks/use-ocean-capabilities";

interface Props {
  depthProgress: MotionValue<number>;
  reducedMotion: boolean;
  onReady?: () => void;
}

export function OceanCanvas({ depthProgress, reducedMotion, onReady }: Props) {
  const depthRef = useRef(0);
  const animateRef = useRef(true);
  const readyRef = useRef(false);
  const isVisible = usePageVisibility();
  const capabilities = useOceanCapabilities();

  useMotionValueEvent(depthProgress, "change", (value) => {
    depthRef.current = value;
  });

  useEffect(() => {
    depthRef.current = depthProgress.get();
  }, [depthProgress]);

  useEffect(() => {
    animateRef.current =
      isVisible &&
      !reducedMotion &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, [isVisible, reducedMotion]);

  const handleCreated = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  }, [onReady]);

  return (
    <Canvas
      className="ocean-canvas"
      dpr={capabilities.dpr}
      frameloop={isVisible ? "always" : "demand"}
      camera={{ fov: 52, near: 0.1, far: 200, position: [0, 1.8, 9] }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      style={{ pointerEvents: "none" }}
      onCreated={handleCreated}
    >
      <OceanScene
        depthRef={depthRef}
        animateRef={animateRef}
        reducedMotion={reducedMotion || capabilities.reducedParticles}
        waterSegments={capabilities.waterSegments}
      />
    </Canvas>
  );
}
