export const ACTION_POSTURES = [
  "PREPARE BEFORE DEPARTURE",
  "PROCEED WITH CAUTION",
  "DELAY AND REASSESS",
  "DO NOT DEPART YET",
] as const;

export const URGENCY_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export const PRIORITY_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export const LANGUAGES = ["English", "Tamil"] as const;
export const BOAT_TYPES = [
  "Small fibre boat",
  "Motorized traditional boat",
  "Medium fishing vessel",
] as const;

export interface MarineContext {
  waveHeight: number | null;
  wavePeriod: number | null;
  windWaveHeight: number | null;
  swellWaveHeight: number | null;
  checkedAt: string;
  source: "Open-Meteo Marine Forecast";
}

export interface DepartureBlocker {
  title: string;
  reason: string;
  priority: (typeof PRIORITY_LEVELS)[number];
}

export interface AazhiAssessment {
  actionPosture: (typeof ACTION_POSTURES)[number];
  urgency: (typeof URGENCY_LEVELS)[number];
  situationSummary: string;
  conditionConflict: {
    detected: boolean;
    explanation: string;
  };
  departureBlockers: DepartureBlocker[];
  whyThisMatters: string;
  immediateActions: string[];
  preDepartureChecklist: string[];
  atSeaActions: string[];
  afterReturnActions: string[];
  marineContextExplanation: string;
  language: (typeof LANGUAGES)[number];
}

export interface AssessmentResponse {
  assessment: AazhiAssessment;
  marineContext: MarineContext;
}
