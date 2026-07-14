import { describe, expect, it } from "vitest";
import {
  createTestActiveTripHarness,
  VALID_START_TRIP_BODY,
} from "@/test-support/active-trip/active-trip-test-harness";
import { InvalidVesselReferenceError } from "@/application/active-trip/active-trip-errors";

describe("ActiveTripService", () => {
  it("starts a trip with version 1 and optional concern", async () => {
    const harness = createTestActiveTripHarness();
    const result = await harness.activeTripService.startTrip({
      ...VALID_START_TRIP_BODY,
      confirmedConcern: {
        concept: "ENGINE_RELIABILITY",
        summary: "Engine stopped twice yesterday.",
      },
    });

    expect(result.stateVersion).toBe(1);
    expect(result.activeConcerns).toHaveLength(1);
    expect(result.activeConcerns[0]?.status).toBe("OPEN");
  });

  it("throws for stale vessel reference", async () => {
    const harness = createTestActiveTripHarness();
    await expect(
      harness.activeTripService.startTrip({
        ...VALID_START_TRIP_BODY,
        vesselId: crypto.randomUUID(),
      }),
    ).rejects.toBeInstanceOf(InvalidVesselReferenceError);
  });

  it("returns null when restoring a missing trip", async () => {
    const harness = createTestActiveTripHarness();
    const missing = await harness.activeTripService.getActiveTrip(
      crypto.randomUUID(),
    );
    expect(missing).toBeNull();
  });

  it("restores an active trip after start", async () => {
    const harness = createTestActiveTripHarness();
    const started = await harness.activeTripService.startTrip(VALID_START_TRIP_BODY);
    const restored = await harness.activeTripService.getActiveTrip(started.tripId);
    expect(restored?.tripId).toBe(started.tripId);
    expect(restored?.stateVersion).toBe(1);
  });
});
