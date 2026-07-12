"use client";

import Image from "next/image";
import { motion, type MotionValue } from "motion/react";

const LOGO_WIDTH = 488;
const LOGO_HEIGHT = 511;
const LOGO_SRC = "/brand/aazhi-logo.png";

interface Props {
  descriptorOpacity: MotionValue<number>;
}

export function PersistentBrand({ descriptorOpacity }: Props) {
  return (
    <header className="persistent-brand" aria-label="AAZHI">
      <div className="persistent-brand__lockup">
        <div className="persistent-brand__logo-wrap">
          <Image
            src={LOGO_SRC}
            alt="AAZHI"
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            className="persistent-brand__image"
            priority
          />
        </div>
        <motion.span
          className="persistent-brand__descriptor"
          style={{ opacity: descriptorOpacity }}
        >
          MARINE DECISION INTELLIGENCE
        </motion.span>
      </div>
    </header>
  );
}
