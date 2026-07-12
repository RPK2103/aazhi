"use client";

import { motion, type MotionValue } from "motion/react";

interface Props {
  y: MotionValue<number>;
  refraction: MotionValue<number>;
}

export function SeaLevelLayer({ y, refraction }: Props) {
  return (
    <motion.div
      className="sea-level-layer"
      style={{ y, opacity: refraction }}
      aria-hidden="true"
    >
      <div className="sea-level-layer__shimmer" />
      <div className="sea-level-layer__reflection" />
      <div className="sea-level-layer__horizon" />
    </motion.div>
  );
}
