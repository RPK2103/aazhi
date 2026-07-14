import { describe, expect, it } from "vitest";
import { createStartTripHandler } from "@/app/api/risk/trips/start/start-trip-handler";
import { createGetTripHandler } from "@/app/api/risk/trips/[tripId]/get-trip-handler";
import { createRefreshMarineHandler } from "@/app/api/risk/trips/[tripId]/refresh-marine/refresh-marine-handler";
import {
  createTestActiveTripHarness,
  S003_INITIAL_MARINE,
  VALID_START_TRIP_BODY,
} from "@/test-support/active-trip/active-trip-test-harness";

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/risk/trips/start", () => {
  it("rejects malformed input", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(jsonRequest("http://localhost/api/risk/trips/start", {}));
    expect(response.status).toBe(400);
  });

  it("rejects invalid latitude", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", {
        ...VALID_START_TRIP_BODY,
        marineReferenceLocation: {
          latitude: 95,
          longitude: 80.3,
          label: null,
        },
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects invalid longitude", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", {
        ...VALID_START_TRIP_BODY,
        marineReferenceLocation: {
          latitude: 13.125,
          longitude: 200,
          label: null,
        },
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects non-finite coordinates", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", {
        ...VALID_START_TRIP_BODY,
        marineReferenceLocation: {
          latitude: Number.NaN,
          longitude: 80.3,
          label: null,
        },
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects unsupported manual concern concept", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", {
        ...VALID_START_TRIP_BODY,
        confirmedConcern: {
          concept: "WAVE_CONDITIONS",
          summary: "Should not persist",
        },
      }),
    );
    expect(response.status).toBe(400);
  });

  it("reuses existing valid vessel ID", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const first = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", VALID_START_TRIP_BODY),
    );
    const firstBody = await first.json();
    const second = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", {
        ...VALID_START_TRIP_BODY,
        vesselId: firstBody.vesselId,
        vessel: undefined,
      }),
    );
    const secondBody = await second.json();
    expect(secondBody.vesselId).toBe(firstBody.vesselId);
  });

  it("fails cleanly on invalid vessel ID", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", {
        ...VALID_START_TRIP_BODY,
        vesselId: "missing-vessel",
        vessel: undefined,
      }),
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("INVALID_VESSEL_REFERENCE");
  });

  it("creates new vessel when vessel ID absent", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", VALID_START_TRIP_BODY),
    );
    const body = await response.json();
    expect(body.vesselId).toBeTruthy();
  });

  it("persists confirmed concern OPEN", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", {
        ...VALID_START_TRIP_BODY,
        confirmedConcern: {
          concept: "ENGINE_RELIABILITY",
          summary: "Engine stopped twice and required restart.",
        },
      }),
    );
    const body = await response.json();
    expect(body.activeConcerns).toHaveLength(1);
    expect(body.activeConcerns[0].concept).toBe("ENGINE_RELIABILITY");
    expect(body.activeConcerns[0].status).toBe("OPEN");
  });

  it("creates no concern when confirmedConcern absent", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", VALID_START_TRIP_BODY),
    );
    const body = await response.json();
    expect(body.activeConcerns).toHaveLength(0);
  });

  it("maps PROCEED WITH CAUTION to CAUTION", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", VALID_START_TRIP_BODY),
    );
    const body = await response.json();
    expect(body.currentPosture).toBe("CAUTION");
  });

  it("maps other assessment postures to REASSESSMENT_REQUIRED", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", {
        ...VALID_START_TRIP_BODY,
        assessmentPosture: "DO NOT DEPART YET",
      }),
    );
    const body = await response.json();
    expect(body.currentPosture).toBe("REASSESSMENT_REQUIRED");
  });

  it("creates initial RiskState version 1", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", VALID_START_TRIP_BODY),
    );
    const body = await response.json();
    expect(body.stateVersion).toBe(1);
  });

  it("returns UI-safe DTO without prisma fields", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", VALID_START_TRIP_BODY),
    );
    const body = await response.json();
    expect(body).not.toHaveProperty("stateJson");
    expect(body.manualMonitoringNotice).toContain("not continuously monitoring");
  });

  it("fetches marine context server-side", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    await POST(jsonRequest("http://localhost/api/risk/trips/start", VALID_START_TRIP_BODY));
    expect(harness.getMarineFetchCount()).toBe(1);
  });

  it("normalizes marine context into currentMarineState", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", VALID_START_TRIP_BODY),
    );
    const body = await response.json();
    expect(body.currentMarineState.waveHeightM).toBe(S003_INITIAL_MARINE.waveHeightM);
  });

  it("persists marine reference location", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const response = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", VALID_START_TRIP_BODY),
    );
    const body = await response.json();
    expect(body.marineReferenceLocation.label).toBe("Chennai / Kasimedu");
  });
});

describe("active trip lifecycle API", () => {
  it("rejects malformed tripId on GET", async () => {
    const harness = createTestActiveTripHarness();
    const GET = createGetTripHandler(harness.activeTripService);
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ tripId: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
  });

  it("rejects malformed tripId on refresh-marine", async () => {
    const harness = createTestActiveTripHarness();
    const REFRESH = createRefreshMarineHandler(harness.activeTripService);
    const response = await REFRESH(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ tripId: "invalid-trip-id" }),
    });
    expect(response.status).toBe(400);
  });

  it("carries forward existing OPEN concern", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const first = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", {
        ...VALID_START_TRIP_BODY,
        confirmedConcern: {
          concept: "ENGINE_RELIABILITY",
          summary: "Existing open concern",
        },
      }),
    );
    const firstBody = await first.json();
    const second = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", {
        ...VALID_START_TRIP_BODY,
        vesselId: firstBody.vesselId,
        vessel: undefined,
      }),
    );
    const secondBody = await second.json();
    expect(secondBody.activeConcerns.some((c: { status: string }) => c.status === "OPEN")).toBe(
      true,
    );
  });

  it("GET returns latest risk state and safe timeline DTO", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const GET = createGetTripHandler(harness.activeTripService);
    const startResponse = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", VALID_START_TRIP_BODY),
    );
    const startBody = await startResponse.json();
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ tripId: startBody.tripId }),
    });
    const body = await response.json();
    expect(body.stateVersion).toBe(1);
    expect(Array.isArray(body.timeline)).toBe(true);
  });

  it("manual refresh creates MARINE_STATE_UPDATED processing trace", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const REFRESH = createRefreshMarineHandler(harness.activeTripService);
    const startResponse = await POST(
      jsonRequest("http://localhost/api/risk/trips/start", {
        ...VALID_START_TRIP_BODY,
        confirmedConcern: {
          concept: "ENGINE_RELIABILITY",
          summary: "Engine stopped twice and required restart.",
        },
      }),
    );
    const startBody = await startResponse.json();
    const refreshResponse = await REFRESH(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ tripId: startBody.tripId }),
    });
    const refreshBody = await refreshResponse.json();
    expect(refreshBody.activeTrip.stateVersion).toBe(2);
    expect(refreshBody.processingResult.deltas.some((d: { absoluteChange?: number }) => d.absoluteChange === 0.7)).toBe(true);
    expect(refreshBody.processingResult.policyDecision.action).toBe("COORDINATOR_REVIEW_REQUIRED");
    expect(refreshBody.processingResult.interpretationStatus).toBe("SUCCEEDED");
    expect(harness.getInterpreterInvocationCount()).toBe(1);
    expect(harness.getMarineFetchCount()).toBe(2);
  });

  it("validates processing timeline payload on read", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const GET = createGetTripHandler(harness.activeTripService);
    const REFRESH = createRefreshMarineHandler(harness.activeTripService);
    const startBody = await (
      await POST(
        jsonRequest("http://localhost/api/risk/trips/start", {
          ...VALID_START_TRIP_BODY,
          confirmedConcern: {
            concept: "ENGINE_RELIABILITY",
            summary: "Engine stopped twice and required restart.",
          },
        }),
      )
    ).json();
    await REFRESH(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ tripId: startBody.tripId }),
    });
    const trip = await (
      await GET(new Request("http://localhost"), {
        params: Promise.resolve({ tripId: startBody.tripId }),
      })
    ).json();
    const processed = trip.timeline.find(
      (entry: { type: string }) => entry.type === "RISK_EVENT_PROCESSED",
    );
    expect(processed?.processingTrace).toBeTruthy();
    expect(processed.processingTrace.deltas.length).toBeGreaterThan(0);
    expect(trip.latestProcessingTrace?.policyDecision.action).toBe("COORDINATOR_REVIEW_REQUIRED");
  });
});

describe("S003 product integration", () => {
  it("completes start and manual refresh lifecycle", async () => {
    const harness = createTestActiveTripHarness();
    const POST = createStartTripHandler(harness.activeTripService);
    const REFRESH = createRefreshMarineHandler(harness.activeTripService);

    const startBody = await (
      await POST(
        jsonRequest("http://localhost/api/risk/trips/start", {
          ...VALID_START_TRIP_BODY,
          vessel: { displayName: "TN-04", vesselType: "Small fibre boat" },
          confirmedConcern: {
            concept: "ENGINE_RELIABILITY",
            summary: "Engine stopped twice and required restart.",
          },
        }),
      )
    ).json();

    expect(startBody.currentPosture).toBe("CAUTION");
    expect(startBody.stateVersion).toBe(1);
    expect(startBody.activeConcerns[0]?.concept).toBe("ENGINE_RELIABILITY");

    const refreshBody = await (
      await REFRESH(new Request("http://localhost", { method: "POST" }), {
        params: Promise.resolve({ tripId: startBody.tripId }),
      })
    ).json();

    const waveDelta = refreshBody.processingResult.deltas.find(
      (d: { measurement?: string }) => d.measurement === "WAVE_HEIGHT_M",
    );
    const windDelta = refreshBody.processingResult.deltas.find(
      (d: { measurement?: string }) => d.measurement === "WIND_SPEED_KMH",
    );

    expect(waveDelta?.absoluteChange).toBe(0.7);
    expect(windDelta?.absoluteChange).toBe(5);
    expect(refreshBody.processingResult.reassessmentDecision.reason).toBe(
      "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
    );
    expect(refreshBody.processingResult.policyDecision.action).toBe("COORDINATOR_REVIEW_REQUIRED");
    expect(refreshBody.processingResult.interpretationStatus).toBe("SUCCEEDED");
    expect(refreshBody.activeTrip.currentPosture).toBe("COORDINATOR_REVIEW_REQUIRED");
    expect(refreshBody.activeTrip.stateVersion).toBe(2);
    expect(refreshBody.processingResult.duplicateEvent).toBe(false);
  });
});
