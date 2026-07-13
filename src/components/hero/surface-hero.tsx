"use client";

import { motion, type MotionValue } from "motion/react";
import { DescentTrigger } from "@/components/hero/descent-trigger";

interface Props {
  heroLine1Y: MotionValue<number>;
  heroLine2Y: MotionValue<number>;
  heroLine2Opacity: MotionValue<number>;
  heroSupportOpacity: MotionValue<number>;
  anchorOpacity: MotionValue<number>;
  onDescend: () => void;
  reducedMotion: boolean;
}

export function SurfaceHero({
  heroLine1Y,
  heroLine2Y,
  heroLine2Opacity,
  heroSupportOpacity,
  anchorOpacity,
  onDescend,
  reducedMotion,
}: Props) {
  return (
    <section className="surface-hero" aria-labelledby="hero-title">
      <div className="surface-hero__above" aria-hidden="true" />
      <div className="surface-hero__below" aria-hidden="true" />

      <div className="surface-hero__content">
        <motion.p
          id="hero-title"
          className="surface-hero__line surface-hero__line--primary"
          style={{ y: heroLine1Y }}
        >
          See the sea. Speak your situation.
        </motion.p>

        <div className="surface-hero__surface-gap" aria-hidden="true" />

        <motion.p
          className="surface-hero__line surface-hero__line--accent"
          style={{ y: heroLine2Y, opacity: heroLine2Opacity }}
        >
          Know your next move.
        </motion.p>

        <motion.p
          className="surface-hero__support"
          style={{ opacity: heroSupportOpacity }}
        >
          Marine systems forecast the sea. AAZHI interprets the decision at the
          shore.
        </motion.p>

        <motion.div style={{ opacity: anchorOpacity }}>
          <DescentTrigger onDescend={onDescend} reducedMotion={reducedMotion} />
        </motion.div>
      </div>
    </section>
  );
}
