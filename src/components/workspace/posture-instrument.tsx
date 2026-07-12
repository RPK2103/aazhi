"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getPostureDisplay } from "@/lib/posture-display";
import { postureTone, statusColor } from "@/lib/status-colors";
import type { AazhiAssessment } from "@/lib/types";

interface Props {
  assessment: AazhiAssessment;
}

export function PostureInstrument({ assessment }: Props) {
  const reducedMotion = Boolean(useReducedMotion());
  const display = getPostureDisplay(assessment.actionPosture);
  const tone = postureTone(assessment.actionPosture);
  const ringColor = statusColor(tone);
  const circumference = 2 * Math.PI * 72;
  const dashOffset = circumference * (1 - display.ringProgress);

  return (
    <div
      className={`posture-instrument posture-instrument--${tone}`}
      style={{ "--posture-color": ringColor } as CSSProperties}
    >
      <svg
        className="posture-instrument__ring"
        viewBox="0 0 180 180"
        role="img"
        aria-label={`Departure posture: ${assessment.actionPosture}`}
      >
        <circle
          cx="90"
          cy="90"
          r="72"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="9"
        />
        <motion.circle
          cx="90"
          cy="90"
          r="72"
          fill="none"
          stroke={ringColor}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={
            reducedMotion
              ? { duration: 0.01 }
              : {
                  duration: 0.75,
                  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                }
          }
          transform="rotate(-90 90 90)"
        />
      </svg>
      <div className="posture-instrument__center">
        <span className="posture-instrument__line">{display.line1}</span>
        <span className="posture-instrument__line">{display.line2}</span>
      </div>
    </div>
  );
}
