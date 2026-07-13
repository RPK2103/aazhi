import type { AttentionBasisKind, AttentionGroup } from "@/application/coordinator-attention";
import type { OperationalAction } from "@/domain/policy/operational-actions";

export interface CoordinatorScenarioExpectation {
  id: string;
  vesselDisplayName: string;
  expectedAttentionGroup: AttentionGroup;
  expectedAttentionBasisKind: AttentionBasisKind;
  expectedLatestPolicyAction?: OperationalAction | null;
  expectedAttentionBasisPolicyAction?: OperationalAction | null;
  expectedLatestManualCheckAt?: string | null;
  expectedActiveConcernStatuses?: readonly string[];
  expectedOrderingRank?: number;
}

export interface CoordinatorEvaluationMetrics {
  attentionClassificationAccuracy: number;
  attentionOrderingAccuracy: number;
  attentionBasisSelectionAccuracy: number;
  latestManualCheckSelectionAccuracy: number;
  latestPolicyActionPreservationRate: number;
  attentionBasisPolicyPreservationRate: number;
  activeConcernPreservationRate: number;
  timelineValidationRate: number;
  aiRankingInvocationCount: number;
  failedInterpretationFabricationCount: number;
}

export interface CoordinatorScenarioResult {
  scenarioId: string;
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; expected: unknown; actual: unknown }>;
}

export interface CoordinatorEvaluationResult {
  scenarioCount: number;
  scenarioResults: CoordinatorScenarioResult[];
  metrics: CoordinatorEvaluationMetrics;
}
