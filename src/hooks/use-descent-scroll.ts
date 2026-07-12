"use client";

import { useCallback, useRef } from "react";
import {
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

export interface DescentTransforms {
  heroLine1Y: MotionValue<number>;
  seaLevelY: MotionValue<number>;
  heroLine2Y: MotionValue<number>;
  heroLine2Opacity: MotionValue<number>;
  heroSupportOpacity: MotionValue<number>;
  anchorOpacity: MotionValue<number>;
  depthAbsorption: MotionValue<number>;
  surfaceLightOpacity: MotionValue<number>;
  underwaterLightOpacity: MotionValue<number>;
  workspaceReveal: MotionValue<number>;
  brandDescriptorOpacity: MotionValue<number>;
  seaRefraction: MotionValue<number>;
}

export function useDescentScroll() {
  const descentZoneRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: descentZoneRef,
    offset: ["start start", "end start"],
  });

  const heroLine1Y = useTransform(scrollYProgress, [0, 1], [0, -220]);
  const seaLevelY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const heroLine2Y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const heroLine2Opacity = useTransform(scrollYProgress, [0, 0.55, 1], [1, 0.35, 0]);
  const heroSupportOpacity = useTransform(scrollYProgress, [0, 0.4, 0.85], [1, 0.45, 0]);
  const anchorOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const depthAbsorption = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const surfaceLightOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const underwaterLightOpacity = useTransform(scrollYProgress, [0.25, 0.85], [0, 1]);
  const workspaceReveal = useTransform(scrollYProgress, [0.45, 1], [0, 1]);
  const brandDescriptorOpacity = useTransform(scrollYProgress, [0.55, 0.9], [0, 1]);
  const seaRefraction = useTransform(scrollYProgress, [0, 0.5, 1], [0.4, 1, 0.6]);

  const scrollToWorkspace = useCallback(() => {
    workspaceRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [reducedMotion]);

  const transforms: DescentTransforms = {
    heroLine1Y,
    seaLevelY,
    heroLine2Y,
    heroLine2Opacity,
    heroSupportOpacity,
    anchorOpacity,
    depthAbsorption,
    surfaceLightOpacity,
    underwaterLightOpacity,
    workspaceReveal,
    brandDescriptorOpacity,
    seaRefraction,
  };

  return {
    descentZoneRef,
    workspaceRef,
    scrollYProgress,
    scrollToWorkspace,
    transforms,
    reducedMotion: Boolean(reducedMotion),
  };
}
