import { describe, expect, it } from "vitest";
import {
  ACTIVE_CONCERN_STATUSES,
  CONCERN_STATUSES,
  canTransitionConcernStatus,
  isActiveConcern,
  type ConcernStatus,
  type VesselConcern,
} from "./concern";
import { RISK_CONCEPTS, isRiskConcept } from "./risk-concepts";

describe("RiskConcept vocabulary", () => {
  it("is bounded to the allowed runtime vocabulary", () => {
    expect(RISK_CONCEPTS).toEqual([
      "ENGINE_RELIABILITY",
      "HULL_INTEGRITY",
      "VESSEL_STABILITY",
      "PRIMARY_COMMUNICATION",
      "COMMUNICATION_REDUNDANCY",
      "SAFETY_EQUIPMENT",
      "WAVE_CONDITIONS",
      "WIND_CONDITIONS",
      "OFFICIAL_ALERT",
      "TRIP_DURATION",
      "CHECK_IN_STATUS",
    ]);
    expect(RISK_CONCEPTS).toHaveLength(11);

    for (const concept of RISK_CONCEPTS) {
      expect(isRiskConcept(concept)).toBe(true);
    }

    expect(isRiskConcept("ENGINE_FAILURE")).toBe(false);
    expect(isRiskConcept("")).toBe(false);
    expect(isRiskConcept("wave_conditions")).toBe(false);
  });
});

describe("isActiveConcern", () => {
  it("treats OPEN as an active concern", () => {
    expect(isActiveConcern({ status: "OPEN" })).toBe(true);
  });

  it("treats RESOLUTION_REPORTED as an active concern", () => {
    expect(isActiveConcern({ status: "RESOLUTION_REPORTED" })).toBe(true);
  });

  it("does not treat RESOLVED as an active concern", () => {
    expect(isActiveConcern({ status: "RESOLVED" })).toBe(false);
  });

  it("does not treat DISMISSED as an active concern", () => {
    expect(isActiveConcern({ status: "DISMISSED" })).toBe(false);
  });

  it("matches ACTIVE_CONCERN_STATUSES exactly", () => {
    expect(ACTIVE_CONCERN_STATUSES).toEqual(["OPEN", "RESOLUTION_REPORTED"]);
    for (const status of CONCERN_STATUSES) {
      const expected = (ACTIVE_CONCERN_STATUSES as readonly string[]).includes(
        status,
      );
      expect(isActiveConcern({ status })).toBe(expected);
    }
  });
});

describe("canTransitionConcernStatus", () => {
  it("allows OPEN → RESOLUTION_REPORTED", () => {
    expect(canTransitionConcernStatus("OPEN", "RESOLUTION_REPORTED")).toBe(
      true,
    );
  });

  it("allows OPEN → RESOLVED as an explicit confirmed transition", () => {
    expect(canTransitionConcernStatus("OPEN", "RESOLVED")).toBe(true);
  });

  it("allows OPEN → DISMISSED", () => {
    expect(canTransitionConcernStatus("OPEN", "DISMISSED")).toBe(true);
  });

  it("allows RESOLUTION_REPORTED → RESOLVED", () => {
    expect(
      canTransitionConcernStatus("RESOLUTION_REPORTED", "RESOLVED"),
    ).toBe(true);
  });

  it("allows RESOLUTION_REPORTED → OPEN", () => {
    expect(canTransitionConcernStatus("RESOLUTION_REPORTED", "OPEN")).toBe(
      true,
    );
  });

  it("allows RESOLUTION_REPORTED → DISMISSED", () => {
    expect(
      canTransitionConcernStatus("RESOLUTION_REPORTED", "DISMISSED"),
    ).toBe(true);
  });

  it("allows RESOLVED → OPEN", () => {
    expect(canTransitionConcernStatus("RESOLVED", "OPEN")).toBe(true);
  });

  it("allows DISMISSED → OPEN", () => {
    expect(canTransitionConcernStatus("DISMISSED", "OPEN")).toBe(true);
  });

  it("allows same-state transitions as idempotent no-ops", () => {
    for (const status of CONCERN_STATUSES) {
      expect(canTransitionConcernStatus(status, status)).toBe(true);
    }
  });

  it("rejects disallowed terminal-to-terminal transitions", () => {
    expect(canTransitionConcernStatus("RESOLVED", "DISMISSED")).toBe(false);
    expect(canTransitionConcernStatus("RESOLVED", "RESOLUTION_REPORTED")).toBe(
      false,
    );
    expect(canTransitionConcernStatus("DISMISSED", "RESOLVED")).toBe(false);
    expect(
      canTransitionConcernStatus("DISMISSED", "RESOLUTION_REPORTED"),
    ).toBe(false);
  });

  it("does not mutate concern objects", () => {
    const concern: VesselConcern = {
      id: "c-1",
      vesselId: "TN-04",
      concept: "ENGINE_RELIABILITY",
      summary: "Engine stopped twice and required restart.",
      status: "OPEN",
      reportedAt: "2026-07-12T06:00:00.000Z",
    };
    const before = structuredClone(concern);
    const allowed = canTransitionConcernStatus(
      concern.status,
      "RESOLUTION_REPORTED" as ConcernStatus,
    );
    expect(allowed).toBe(true);
    expect(concern).toEqual(before);
  });
});
