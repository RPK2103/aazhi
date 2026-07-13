import { describe, expect, it } from "vitest";
import type { MarineContext } from "@/lib/types";
import {
  marineContextToMarineRiskState,
  marineContextToNormalizationInput,
  toMarineRiskState,
} from "./marine-risk-normalizer";

describe("marine risk normalizer", () => {
  const marineContext: MarineContext = {
    waveHeight: 0.8,
    wavePeriod: 6,
    windWaveHeight: 0.2,
    swellWaveHeight: 0.5,
    checkedAt: "2026-07-13T06:00:00.000Z",
    source: "Open-Meteo Marine Forecast",
  };

  it("maps MarineContext wave fields to MarineRiskState", () => {
    const result = marineContextToMarineRiskState(marineContext);

    expect(result.waveHeightM).toBe(0.8);
    expect(result.wavePeriodS).toBe(6);
    expect(result.capturedAt).toBe("2026-07-13T06:00:00.000Z");
  });

  it("leaves wind fields null when provider does not supply them", () => {
    const input = marineContextToNormalizationInput(marineContext);
    const result = toMarineRiskState(input);

    expect(result.windSpeedKmh).toBeNull();
    expect(result.windDirectionDeg).toBeNull();
  });

  it("preserves null wave measurements without coercing to zero", () => {
    const result = toMarineRiskState({
      waveHeightM: null,
      wavePeriodS: null,
      windSpeedKmh: null,
      windDirectionDeg: null,
      capturedAt: "2026-07-13T06:00:00.000Z",
    });

    expect(result.waveHeightM).toBeNull();
    expect(result.wavePeriodS).toBeNull();
  });

  it("maps explicit wind values when supplied in normalization input", () => {
    const result = toMarineRiskState({
      waveHeightM: 0.8,
      wavePeriodS: null,
      windSpeedKmh: 13,
      windDirectionDeg: 180,
      capturedAt: "2026-07-13T06:00:00.000Z",
    });

    expect(result.windSpeedKmh).toBe(13);
    expect(result.windDirectionDeg).toBe(180);
  });
});
