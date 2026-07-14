import {
  ActiveTripService,
  type ActiveTripServiceDependencies,
} from "@/application/active-trip";
import { VesselRiskRecordService } from "@/application/vessel-risk-record";
import type { MarineRiskState } from "@/domain/risk";
import type { RiskInterpreterProvider } from "@/lib/ai";
import { INITIAL_SAFETY_KNOWLEDGE } from "@/data/safety";
import { createInMemoryPersistenceRepositories } from "@/test-support/persistence";
import {
  buildS003ValidInterpretationResponse,
  createCountingInterpreterProvider,
} from "@/test-support/orchestration/orchestration-fixtures";

const DEFAULT_NOW = "2026-07-13T08:00:00.000Z";
const DEFAULT_MARINE_CAPTURED_AT = "2026-07-13T07:55:00.000Z";

export const S003_INITIAL_MARINE: MarineRiskState = {
  waveHeightM: 0.8,
  wavePeriodS: null,
  windSpeedKmh: 13,
  windDirectionDeg: null,
  capturedAt: DEFAULT_MARINE_CAPTURED_AT,
};

export const S003_REFRESH_MARINE: MarineRiskState = {
  waveHeightM: 1.5,
  wavePeriodS: null,
  windSpeedKmh: 18,
  windDirectionDeg: null,
  capturedAt: "2026-07-13T10:25:00.000Z",
};

export function createS003MarineFetcher() {
  let callCount = 0;
  return {
    fetchMarineRiskState: async () => {
      callCount += 1;
      return callCount === 1 ? S003_INITIAL_MARINE : S003_REFRESH_MARINE;
    },
    getCallCount: () => callCount,
  };
}

export interface TestActiveTripHarness {
  activeTripService: ActiveTripService;
  vesselRiskRecord: VesselRiskRecordService;
  interpreter: RiskInterpreterProvider;
  getInterpreterInvocationCount: () => number;
  getMarineFetchCount: () => number;
  ids: string[];
  now: string;
}

export function createTestActiveTripHarness(options?: {
  interpreterResponse?: unknown;
  marineSequence?: MarineRiskState[];
  now?: string;
}): TestActiveTripHarness {
  const repos = createInMemoryPersistenceRepositories();
  const vesselRiskRecord = new VesselRiskRecordService(repos);
  const ids: string[] = [];
  const now = options?.now ?? DEFAULT_NOW;
  const marineSequence = options?.marineSequence ?? [S003_INITIAL_MARINE, S003_REFRESH_MARINE];
  let marineFetchCount = 0;

  const { provider, getInvocationCount } = createCountingInterpreterProvider(
    options?.interpreterResponse ?? buildS003ValidInterpretationResponse(),
  );

  const deps: ActiveTripServiceDependencies = {
    vesselRiskRecord,
    orchestrator: {
      tripRiskStates: repos.riskStates,
      timeline: repos.timeline,
      riskInterpreter: provider,
      safetyKnowledge: INITIAL_SAFETY_KNOWLEDGE,
    },
    fetchMarineRiskState: async () => {
      marineFetchCount += 1;
      return marineSequence[Math.min(marineFetchCount - 1, marineSequence.length - 1)]!;
    },
    createId: () => {
      const id = crypto.randomUUID();
      ids.push(id);
      return id;
    },
    now: () => now,
  };

  return {
    activeTripService: new ActiveTripService(deps),
    vesselRiskRecord,
    interpreter: provider,
    getInterpreterInvocationCount: getInvocationCount,
    getMarineFetchCount: () => marineFetchCount,
    ids,
    now,
  };
}

export const VALID_START_TRIP_BODY = {
  vessel: {
    displayName: "TN-04",
    vesselType: "Small fibre boat" as const,
  },
  crewCount: 5,
  plannedDurationHours: 8,
  marineReferenceLocation: {
    latitude: 13.125,
    longitude: 80.3,
    label: "Chennai / Kasimedu",
  },
  assessmentPosture: "PROCEED WITH CAUTION" as const,
};
