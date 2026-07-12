"use client";

import { motion, useReducedMotion } from "motion/react";

interface Props {
  onDescend: () => void;
  reducedMotion: boolean;
}

export function DescentTrigger({ onDescend, reducedMotion }: Props) {
  const systemReducedMotion = useReducedMotion();
  const disableDrift = reducedMotion || Boolean(systemReducedMotion);

  return (
    <div className="descent-trigger">
      <motion.button
        type="button"
        className="descent-trigger__button"
        aria-label="Descend to AAZHI assessment workspace"
        onClick={onDescend}
        whileHover={{ y: 2 }}
        whileTap={{ y: 4, scale: 0.97 }}
        animate={disableDrift ? undefined : { y: [0, 3, 0] }}
        transition={
          disableDrift
            ? undefined
            : { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <span className="descent-trigger__ring" aria-hidden="true" />
        <svg
          className="descent-trigger__icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="30"
          height="30"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="5" r="3" />
          <line x1="12" y1="8" x2="12" y2="22" />
          <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
        </svg>
      </motion.button>
      <span className="descent-trigger__label">DESCEND</span>
    </div>
  );
}
