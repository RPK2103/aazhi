import { describe, expect, it } from "vitest";
import {
  calculateConcernDeltas,
  compareConcernById,
  type VesselConcern,
} from "@/domain/risk";

const DETECTED_AT = "2026-07-12T07:00:00.000Z";

function concern(
  partial: Partial<VesselConcern> & Pick<VesselConcern, "id" | "status">,
): VesselConcern {
  return {
    vesselId: "TN-04",
    concept: "ENGINE_RELIABILITY",
    summary: "Engine stopped twice and required restart.",
    reportedAt: "2026-07-12T05:30:00.000Z",
    ...partial,
  };
}

describe("compareConcernById", () => {
  it("concern absent → OPEN gives CONCERN_OPENED", () => {
    const opened = concern({ id: "c-new", status: "OPEN" });
    const delta = compareConcernById("c-new", undefined, opened, DETECTED_AT);

    expect(delta).toMatchObject({
      type: "CONCERN_OPENED",
      concernId: "c-new",
      previousValue: null,
      currentValue: "OPEN",
      reassessmentRelevant: true,
    });
  });

  it("OPEN → RESOLUTION_REPORTED gives CONCERN_STATUS_CHANGED", () => {
    const previous = concern({ id: "c-1", status: "OPEN" });
    const current = concern({ id: "c-1", status: "RESOLUTION_REPORTED" });
    const delta = compareConcernById("c-1", previous, current, DETECTED_AT);

    expect(delta).toMatchObject({
      type: "CONCERN_STATUS_CHANGED",
      previousValue: "OPEN",
      currentValue: "RESOLUTION_REPORTED",
    });
  });

  it("OPEN → RESOLVED gives CONCERN_CLOSED", () => {
    const previous = concern({ id: "c-1", status: "OPEN" });
    const current = concern({ id: "c-1", status: "RESOLVED" });
    const delta = compareConcernById("c-1", previous, current, DETECTED_AT);

    expect(delta).toMatchObject({
      type: "CONCERN_CLOSED",
      previousValue: "OPEN",
      currentValue: "RESOLVED",
    });
  });

  it("OPEN → OPEN produces no aggregate concern delta", () => {
    const previous = concern({ id: "c-1", status: "OPEN" });
    const current = concern({ id: "c-1", status: "OPEN" });
    const delta = compareConcernById("c-1", previous, current, DETECTED_AT);

    expect(delta).toBeNull();
  });

  it("RESOLVED → OPEN gives CONCERN_OPENED", () => {
    const previous = concern({ id: "c-1", status: "RESOLVED" });
    const current = concern({ id: "c-1", status: "OPEN" });
    const delta = compareConcernById("c-1", previous, current, DETECTED_AT);

    expect(delta).toMatchObject({
      type: "CONCERN_OPENED",
      previousValue: "RESOLVED",
      currentValue: "OPEN",
    });
  });

  it("active concern removed from current set gives CONCERN_CLOSED", () => {
    const previous = concern({ id: "c-1", status: "OPEN" });
    const delta = compareConcernById("c-1", previous, undefined, DETECTED_AT);

    expect(delta?.type).toBe("CONCERN_CLOSED");
  });
});

describe("calculateConcernDeltas", () => {
  it("sorts concern deltas by concern ID", () => {
    const previous = [
      concern({ id: "c-b", status: "OPEN", concept: "HULL_INTEGRITY" }),
      concern({ id: "c-a", status: "OPEN", concept: "ENGINE_RELIABILITY" }),
    ];
    const current = [
      concern({ id: "c-b", status: "RESOLVED", concept: "HULL_INTEGRITY" }),
      concern({ id: "c-a", status: "RESOLUTION_REPORTED", concept: "ENGINE_RELIABILITY" }),
    ];

    const deltas = calculateConcernDeltas(previous, current, DETECTED_AT);

    expect(deltas.map((delta) => delta.concernId)).toEqual(["c-a", "c-b"]);
  });

  it("does not mutate concern objects", () => {
    const previous = [concern({ id: "c-1", status: "OPEN" })];
    const current = [concern({ id: "c-1", status: "RESOLUTION_REPORTED" })];
    const beforePrevious = structuredClone(previous);
    const beforeCurrent = structuredClone(current);

    calculateConcernDeltas(previous, current, DETECTED_AT);

    expect(previous).toEqual(beforePrevious);
    expect(current).toEqual(beforeCurrent);
  });
});
