import type { ConcernStatus, RiskConcept } from "@/domain/risk";

export interface PersistenceScenarioFixture {
  id: string;
  vesselId: string;
  concerns: Array<{
    id: string;
    concept: RiskConcept;
    status: ConcernStatus;
    active: boolean;
  }>;
  expectedCarriedConcepts: RiskConcept[];
  expectedExcludedConcepts: RiskConcept[];
}

export interface PersistenceEvaluationMetrics {
  activeConcernCarryForwardAccuracy: number;
  inactiveConcernExclusionAccuracy: number;
  riskStateRoundTripAccuracy: number;
  historicalSnapshotImmutabilityAccuracy: number;
  invalidDomainValueRejectionRate: number;
}

export interface PersistenceEvaluationResult {
  metrics: PersistenceEvaluationMetrics;
  scenarioCount: number;
}
