import "server-only";

import { CoordinatorAttentionService } from "@/application/coordinator-attention";
import {
  PrismaTimelineEventRepository,
  PrismaTripRepository,
  PrismaTripRiskStateRepository,
  PrismaVesselRepository,
} from "@/infrastructure/persistence/prisma";

export function createCoordinatorAttentionService(): CoordinatorAttentionService {
  return new CoordinatorAttentionService({
    trips: new PrismaTripRepository(),
    vessels: new PrismaVesselRepository(),
    riskStates: new PrismaTripRiskStateRepository(),
    timeline: new PrismaTimelineEventRepository(),
    now: () => new Date().toISOString(),
  });
}
