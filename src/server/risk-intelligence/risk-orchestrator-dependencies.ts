import "server-only";

import { INITIAL_SAFETY_KNOWLEDGE } from "@/data/safety";
import type { RiskOrchestratorDependencies } from "@/application/risk-orchestrator";
import { createGeminiRiskInterpreterProvider } from "@/lib/ai";
import {
  PrismaTimelineEventRepository,
  PrismaTripRiskStateRepository,
} from "@/infrastructure/persistence/prisma";

export function createRiskOrchestratorDependencies(): RiskOrchestratorDependencies {
  return {
    tripRiskStates: new PrismaTripRiskStateRepository(),
    timeline: new PrismaTimelineEventRepository(),
    riskInterpreter: createGeminiRiskInterpreterProvider(),
    safetyKnowledge: INITIAL_SAFETY_KNOWLEDGE,
  };
}
