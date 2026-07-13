import "server-only";

import { VesselRiskRecordService } from "@/application/vessel-risk-record";
import {
  PrismaTimelineEventRepository,
  PrismaTripRepository,
  PrismaTripRiskStateRepository,
  PrismaVesselConcernRepository,
  PrismaVesselRepository,
} from "@/infrastructure/persistence/prisma";

export function createVesselRiskRecordService(): VesselRiskRecordService {
  return new VesselRiskRecordService({
    vessels: new PrismaVesselRepository(),
    concerns: new PrismaVesselConcernRepository(),
    trips: new PrismaTripRepository(),
    riskStates: new PrismaTripRiskStateRepository(),
    timeline: new PrismaTimelineEventRepository(),
  });
}
