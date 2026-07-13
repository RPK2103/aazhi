import "server-only";

import { marineContextToMarineRiskState } from "@/application/marine-risk";
import {
  ActiveTripService,
  type ActiveTripServiceDependencies,
} from "@/application/active-trip";
import { fetchMarineContext } from "@/lib/marine";
import { createRiskOrchestratorDependencies } from "./risk-orchestrator-dependencies";
import { createVesselRiskRecordService } from "./create-vessel-risk-record-service";

async function fetchProductionMarineRiskState(
  latitude: number,
  longitude: number,
) {
  const context = await fetchMarineContext(latitude, longitude);
  return marineContextToMarineRiskState(context);
}

export function createActiveTripService(
  overrides?: Partial<ActiveTripServiceDependencies>,
): ActiveTripService {
  return new ActiveTripService({
    vesselRiskRecord: createVesselRiskRecordService(),
    orchestrator: createRiskOrchestratorDependencies(),
    fetchMarineRiskState: fetchProductionMarineRiskState,
    createId: () => crypto.randomUUID(),
    now: () => new Date().toISOString(),
    ...overrides,
  });
}
