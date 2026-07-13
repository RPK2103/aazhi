"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useTransform, type MotionValue } from "motion/react";
import { usePageVisibility } from "@/hooks/use-page-visibility";

const OceanCanvas = dynamic(
  () =>
    import("@/components/ocean/ocean-canvas").then((mod) => mod.OceanCanvas),
  { ssr: false },
);

const PARTICLES = [
  { x: 8, y: 12, size: 2, delay: 0 },
  { x: 22, y: 28, size: 1.5, delay: 2 },
  { x: 35, y: 8, size: 2.5, delay: 4 },
  { x: 48, y: 42, size: 1.5, delay: 1 },
  { x: 61, y: 18, size: 2, delay: 3 },
  { x: 74, y: 55, size: 1.5, delay: 5 },
  { x: 88, y: 32, size: 2, delay: 2 },
] as const;

interface Props {
  depthAbsorption: MotionValue<number>;
  surfaceLightOpacity: MotionValue<number>;
  underwaterLightOpacity: MotionValue<number>;
  depthProgress: MotionValue<number>;
  reducedMotion: boolean;
}

export function OceanEnvironment({
  depthAbsorption,
  surfaceLightOpacity,
  underwaterLightOpacity,
  depthProgress,
  reducedMotion,
}: Props) {
  const isVisible = usePageVisibility();
  const [webglReady, setWebglReady] = useState(false);
  const abyssBlend = useTransform(depthAbsorption, [0, 1], [0, 1]);
  const surfaceGlowY = useTransform(depthAbsorption, [0, 1], [0, -32]);
  const surfaceGlowOpacity = useTransform(
    depthAbsorption,
    [0, 0.35, 0.7, 1],
    [1, 0.35, 0.08, 0.03],
  );

  const handleWebglReady = useCallback(() => {
    setWebglReady(true);
  }, []);

  return (
    <div className="ocean-environment" aria-hidden="true">
      <div className="css-fallback-environment">
        <motion.div
          className="ocean-layer ocean-layer--abyss"
          style={{ opacity: abyssBlend }}
        />
        <motion.div
          className="ocean-layer ocean-layer--surface-light"
          style={{ opacity: surfaceLightOpacity }}
        />
        <motion.div
          className="ocean-layer ocean-layer--underwater-rays"
          style={{ opacity: underwaterLightOpacity }}
        />
        <motion.div
          className="ocean-layer ocean-layer--surface-glow"
          style={{ y: surfaceGlowY, opacity: surfaceGlowOpacity }}
        />
        <div
          className={`ocean-layer ocean-layer--particles${isVisible ? "" : " is-paused"}`}
        >
          {PARTICLES.map((particle, index) => (
            <span
              key={index}
              className="ocean-particle"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDelay: `${particle.delay}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div
        className={`ocean-canvas-wrap${webglReady ? " is-ready" : ""}`}
        aria-hidden="true"
      >
        <OceanCanvas
          depthProgress={depthProgress}
          reducedMotion={reducedMotion}
          onReady={handleWebglReady}
        />
      </div>
    </div>
  );
}
