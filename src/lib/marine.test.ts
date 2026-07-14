import { describe, expect, it } from "vitest";
import {
  findNearestMarineIndex,
  normalizeMarineResponse,
  type MarineApiResponse,
} from "@/lib/marine-normalize";

const times = [
  "2026-07-11T06:00",
  "2026-07-11T07:00",
  "2026-07-11T08:00",
];

describe("findNearestMarineIndex", () => {
  it("selects the nearest hourly timestamp", () => {
    expect(
      findNearestMarineIndex(times, Date.parse("2026-07-11T07:40")),
    ).toBe(2);
  });

  it("selects an exact timestamp match", () => {
    expect(
      findNearestMarineIndex(times, Date.parse("2026-07-11T07:00")),
    ).toBe(1);
  });

  it("returns -1 when no timestamp is usable", () => {
    expect(findNearestMarineIndex(["invalid"], Date.now())).toBe(-1);
  });
});

describe("normalizeMarineResponse", () => {
  it("normalizes values from the nearest hourly entry", () => {
    const response: MarineApiResponse = {
      hourly: {
        time: times,
        wave_height: [0.8, 1.1, 1.5],
        wave_period: [6, 7, 8],
        wind_wave_height: [0.2, 0.3, 0.4],
        swell_wave_height: [0.6, 0.8, 1.1],
      },
    };

    const normalized = normalizeMarineResponse(
      response,
      Date.parse("2026-07-11T07:40"),
    );

    expect(normalized).toMatchObject({
      waveHeight: 1.5,
      wavePeriod: 8,
      windWaveHeight: 0.4,
      swellWaveHeight: 1.1,
      source: "Open-Meteo Marine Forecast",
    });
  });

  it("prefers usable current readings", () => {
    const normalized = normalizeMarineResponse(
      {
        current: {
          time: "2026-07-11T07:00",
          wave_height: 1.2,
          wave_period: 7,
          wind_wave_height: 0.3,
          swell_wave_height: 0.9,
        },
        hourly: {
          time: times,
          wave_height: [9, 9, 9],
        },
      },
      Date.parse("2026-07-11T07:00"),
    );

    expect(normalized.waveHeight).toBe(1.2);
    expect(normalized.wavePeriod).toBe(7);
  });

  it("keeps unavailable individual readings as null", () => {
    const normalized = normalizeMarineResponse(
      {
        current: {
          time: "2026-07-11T07:00",
          wave_height: null,
          wave_period: 7,
          wind_wave_height: null,
          swell_wave_height: 0.9,
        },
      },
      Date.parse("2026-07-11T07:00"),
    );

    expect(normalized.waveHeight).toBeNull();
    expect(normalized.windWaveHeight).toBeNull();
    expect(normalized.wavePeriod).toBe(7);
  });

  it("preserves a valid zero reading", () => {
    const normalized = normalizeMarineResponse(
      {
        current: {
          time: "2026-07-11T07:00",
          wave_height: 0,
          wave_period: 0,
          wind_wave_height: 0,
          swell_wave_height: 0,
        },
      },
      Date.parse("2026-07-11T07:00"),
    );

    expect(normalized.waveHeight).toBe(0);
    expect(normalized.wavePeriod).toBe(0);
    expect(normalized.windWaveHeight).toBe(0);
    expect(normalized.swellWaveHeight).toBe(0);
  });

  it("fails safely for malformed or missing hourly arrays", () => {
    const now = Date.parse("2026-07-11T07:00:00Z");
    const normalized = normalizeMarineResponse(
      {
        hourly: {
          time: ["invalid"],
          wave_height: [1.2],
        },
      },
      now,
    );

    expect(normalized).toEqual({
      waveHeight: null,
      wavePeriod: null,
      windWaveHeight: null,
      swellWaveHeight: null,
      checkedAt: new Date(now).toISOString(),
      source: "Open-Meteo Marine Forecast",
    });
  });
});
