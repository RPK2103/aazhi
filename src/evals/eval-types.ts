import type {
  MarineMeasurement,
  ReassessmentReason,
  RiskConcept,
  RiskDeltaType,
  RiskState,
} from "@/domain/risk";
import type { OperationalAction } from "@/domain/policy";

/**
 * Bounded vocabulary for scenario metadata documenting product capabilities
 * not yet represented in RiskState. Does not cause scenario failure.
 */
export const KNOWN_CAPABILITY_GAPS = [
  "TRIP_DURATION_NOT_YET_COMPARED",
  "CHECK_IN_EVENT_NOT_YET_MODELLED",
  "OFFICIAL_ALERT_STATE_NOT_YET_MODELLED",
] as const;

export type KnownCapabilityGap = (typeof KNOWN_CAPABILITY_GAPS)[number];

/** Optional exact assertion for a single marine measurement delta. */
export interface ExpectedMeasurementDelta {
  measurement: MarineMeasurement;
  type: RiskDeltaType;
  signedChange?: number;
  absoluteChange?: number;
  reassessmentRelevant: boolean;
}

export interface RiskScenarioExpectations {
  expectedDeltaCount: number;
  expectedDeltaTypes?: readonly RiskDeltaType[];
  expectedDeltaConcepts?: readonly RiskConcept[];
  expectedReassessmentRequired: boolean;
  expectedReassessmentReason: ReassessmentReason;
  expectedTriggerConcepts: readonly RiskConcept[];
  expectedActiveConcernConcepts?: readonly RiskConcept[];
  expectedMeasurementDeltas?: readonly ExpectedMeasurementDelta[];
  expectedOperationalAction: OperationalAction;
}

/**
 * Declarative synthetic risk scenario for deterministic product evaluation.
 * Fixtures are data only — no callback assertions.
 */
export interface RiskScenario {
  id: string;
  name: string;
  description: string;
  previousState: RiskState;
  currentState: RiskState;
  expectations: RiskScenarioExpectations;
  knownCapabilityGaps?: readonly KnownCapabilityGap[];
}

export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | readonly SerializableValue[]
  | { readonly [key: string]: SerializableValue };

export interface EvaluationCheck {
  name: string;
  passed: boolean;
  expected: SerializableValue;
  actual: SerializableValue;
}

export interface ScenarioEvaluationResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  checks: readonly EvaluationCheck[];
  knownCapabilityGaps: readonly KnownCapabilityGap[];
}

export interface DeterministicEvaluationMetrics {
  reassessmentExpectationAccuracy: number;
  reassessmentReasonAccuracy: number;
  triggerConceptExactMatchRate: number;
  activeConcernCarryForwardAccuracy: number;
  falseEscalationCount: number;
  missedReassessmentCount: number;
  scenariosWithKnownCapabilityGaps: number;
  knownCapabilityGapCounts: Readonly<Record<KnownCapabilityGap, number>>;
}

export interface ScenarioSuiteEvaluation {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  /** Fraction of scenarios that passed, in the range 0–1 (not rounded). */
  scenarioPassRate: number;
  results: readonly ScenarioEvaluationResult[];
  metrics: DeterministicEvaluationMetrics;
}
