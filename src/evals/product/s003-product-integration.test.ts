import { describe, expect, it } from "vitest";
import { createTestActiveTripHarness } from "@/test-support/active-trip/active-trip-test-harness";

describe("S003 product integration (application layer)", () => {
  it("runs full lifecycle without external providers", async () => {
    const harness = createTestActiveTripHarness();
    const start = await harness.activeTripService.startTrip({
      vessel: { displayName: "TN-04", vesselType: "Small fibre boat" },
      crewCount: 5,
      plannedDurationHours: 8,
      marineReferenceLocation: {
        latitude: 13.125,
        longitude: 80.3,
        label: "Chennai / Kasimedu",
      },
      assessmentPosture: "PROCEED WITH CAUTION",
      confirmedConcern: {
        concept: "ENGINE_RELIABILITY",
        summary: "Engine stopped twice and required restart.",
      },
    });

    expect(start.currentPosture).toBe("CAUTION");
    expect(start.stateVersion).toBe(1);

    const refresh = await harness.activeTripService.refreshMarine(start.tripId);
    expect(refresh.processingResult.reassessmentDecision.reason).toBe(
      "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
    );
    expect(refresh.activeTrip.stateVersion).toBe(2);
    expect(harness.getInterpreterInvocationCount()).toBe(1);
    expect(harness.getMarineFetchCount()).toBe(2);
  });
});

describe("production composition wiring", () => {
  it("uses fake interpreter provider in test harness", () => {
    const harness = createTestActiveTripHarness();
    expect(harness.interpreter).toBeTruthy();
  });
});
