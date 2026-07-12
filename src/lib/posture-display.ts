import type { AazhiAssessment } from "@/lib/types";

export interface PostureDisplay {
  line1: string;
  line2: string;
  ringProgress: number;
}

const POSTURE_MAP: Record<
  AazhiAssessment["actionPosture"],
  PostureDisplay
> = {
  "DO NOT DEPART YET": {
    line1: "DO NOT",
    line2: "DEPART YET",
    ringProgress: 0.2,
  },
  "DELAY AND REASSESS": {
    line1: "DELAY",
    line2: "REASSESS",
    ringProgress: 0.45,
  },
  "PROCEED WITH CAUTION": {
    line1: "PROCEED",
    line2: "WITH CAUTION",
    ringProgress: 0.7,
  },
  "PREPARE BEFORE DEPARTURE": {
    line1: "PREPARE",
    line2: "BEFORE DEPARTURE",
    ringProgress: 0.95,
  },
};

export function getPostureDisplay(
  actionPosture: AazhiAssessment["actionPosture"],
): PostureDisplay {
  return POSTURE_MAP[actionPosture];
}
