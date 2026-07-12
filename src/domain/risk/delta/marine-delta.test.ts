import { describe, expect, it } from "vitest";
import {
  DEFAULT_REASSESSMENT_SENSITIVITY,
  MARINE_MEASUREMENT_ORDER,
  calculateMarineDeltas,
  compareMarineMeasurement,
  normalizeMarineNumber,
  shortestAngularDistanceDeg,
  type MarineRiskState,
} from "@/domain/risk";

const DETECTED_AT = "2026-07-12T07:00:00.000Z";

function marineState(
  partial: Partial<MarineRiskState> = {},
): MarineRiskState {
  return {
    waveHeightM: null,
    wavePeriodS: null,
    windSpeedKmh: null,
    windDirectionDeg: null,
    capturedAt: DETECTED_AT,
    ...partial,
  };
}

describe("normalizeMarineNumber", () => {
  it("avoids floating-point leakage for 0.8 → 1.5 wave change", () => {
    const signed = normalizeMarineNumber(1.5 - 0.8);
    expect(signed).toBe(0.7);
    expect(String(signed)).not.toContain("0000000000001");
  });
});

describe("compareMarineMeasurement wave height", () => {
  const definition = MARINE_MEASUREMENT_ORDER[0]!;

  it("0.8 → 1.5 gives +0.7 signed and absolute change", () => {
    const delta = compareMarineMeasurement(
      definition,
      marineState({ waveHeightM: 0.8 }),
      marineState({ waveHeightM: 1.5 }),
      DETECTED_AT,
    );

    expect(delta).toMatchObject({
      type: "VALUE_INCREASED",
      concept: "WAVE_CONDITIONS",
      measurement: "WAVE_HEIGHT_M",
      previousValue: 0.8,
      currentValue: 1.5,
      absoluteChange: 0.7,
      reassessmentRelevant: true,
    });
  });

  it("1.5 → 0.8 gives -0.7 signed change and 0.7 absolute change", () => {
    const delta = compareMarineMeasurement(
      definition,
      marineState({ waveHeightM: 1.5 }),
      marineState({ waveHeightM: 0.8 }),
      DETECTED_AT,
    );

    expect(delta).toMatchObject({
      type: "VALUE_DECREASED",
      absoluteChange: 0.7,
    });
    expect(delta?.previousValue).toBe(1.5);
    expect(delta?.currentValue).toBe(0.8);
  });
});

describe("compareMarineMeasurement wind speed", () => {
  const definition = MARINE_MEASUREMENT_ORDER[2]!;

  it("13 → 18 wind speed gives +5", () => {
    const delta = compareMarineMeasurement(
      definition,
      marineState({ windSpeedKmh: 13 }),
      marineState({ windSpeedKmh: 18 }),
      DETECTED_AT,
    );

    expect(delta).toMatchObject({
      type: "VALUE_INCREASED",
      concept: "WIND_CONDITIONS",
      measurement: "WIND_SPEED_KMH",
      previousValue: 13,
      currentValue: 18,
      absoluteChange: 5,
      reassessmentRelevant: false,
    });
  });
});

describe("compareMarineMeasurement availability transitions", () => {
  it("null → number creates VALUE_BECAME_AVAILABLE", () => {
    const definition = MARINE_MEASUREMENT_ORDER[0]!;
    const delta = compareMarineMeasurement(
      definition,
      marineState({ waveHeightM: null }),
      marineState({ waveHeightM: 1.2 }),
      DETECTED_AT,
    );

    expect(delta?.type).toBe("VALUE_BECAME_AVAILABLE");
    expect(delta?.previousValue).toBeNull();
    expect(delta?.currentValue).toBe(1.2);
    expect(delta?.reassessmentRelevant).toBe(true);
  });

  it("number → null creates VALUE_BECAME_UNAVAILABLE", () => {
    const definition = MARINE_MEASUREMENT_ORDER[2]!;
    const delta = compareMarineMeasurement(
      definition,
      marineState({ windSpeedKmh: 15 }),
      marineState({ windSpeedKmh: null }),
      DETECTED_AT,
    );

    expect(delta?.type).toBe("VALUE_BECAME_UNAVAILABLE");
    expect(delta?.previousValue).toBe(15);
    expect(delta?.currentValue).toBeNull();
    expect(delta?.reassessmentRelevant).toBe(true);
  });

  it("null → null produces no delta", () => {
    const definition = MARINE_MEASUREMENT_ORDER[1]!;
    const delta = compareMarineMeasurement(
      definition,
      marineState({ wavePeriodS: null }),
      marineState({ wavePeriodS: null }),
      DETECTED_AT,
    );

    expect(delta).toBeNull();
  });
});

describe("compareMarineMeasurement wind direction", () => {
  const definition = MARINE_MEASUREMENT_ORDER[3]!;

  it("350° → 10° gives 20° shortest angular change", () => {
    expect(shortestAngularDistanceDeg(350, 10)).toBe(20);

    const delta = compareMarineMeasurement(
      definition,
      marineState({ windDirectionDeg: 350 }),
      marineState({ windDirectionDeg: 10 }),
      DETECTED_AT,
    );

    expect(delta?.absoluteChange).toBe(20);
    expect(delta?.reassessmentRelevant).toBe(false);
  });

  it("10° → 350° gives 20° shortest angular change", () => {
    expect(shortestAngularDistanceDeg(10, 350)).toBe(20);

    const delta = compareMarineMeasurement(
      definition,
      marineState({ windDirectionDeg: 10 }),
      marineState({ windDirectionDeg: 350 }),
      DETECTED_AT,
    );

    expect(delta?.absoluteChange).toBe(20);
  });
});

describe("calculateMarineDeltas sensitivity", () => {
  it("marks wave change below sensitivity as not reassessment-relevant", () => {
    const deltas = calculateMarineDeltas(
      marineState({ waveHeightM: 1.0 }),
      marineState({ waveHeightM: 1.3 }),
      DETECTED_AT,
      DEFAULT_REASSESSMENT_SENSITIVITY,
    );

    expect(deltas).toHaveLength(1);
    expect(deltas[0]?.absoluteChange).toBe(0.3);
    expect(deltas[0]?.reassessmentRelevant).toBe(false);
  });

  it("returns no deltas for identical marine state", () => {
    const state = marineState({
      waveHeightM: 0.8,
      windSpeedKmh: 13,
    });

    expect(calculateMarineDeltas(state, state, DETECTED_AT)).toEqual([]);
  });
});
