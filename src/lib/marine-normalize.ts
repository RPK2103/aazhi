import type { MarineContext } from "@/lib/types";

type MarineField =
  | "wave_height"
  | "wave_period"
  | "wind_wave_height"
  | "swell_wave_height";

export interface MarineApiResponse {
  current?: Partial<Record<MarineField, number | null>> & { time?: string };
  hourly?: Partial<Record<MarineField, Array<number | null>>> & {
    time?: string[];
  };
}

export class MarineContextError extends Error {
  constructor() {
    super("Live marine context is temporarily unavailable.");
    this.name = "MarineContextError";
  }
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function findNearestMarineIndex(times: string[], now: number) {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  times.forEach((time, index) => {
    const timestamp = Date.parse(time);
    if (!Number.isNaN(timestamp)) {
      const distance = Math.abs(timestamp - now);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
  });

  return bestIndex;
}

export function normalizeMarineResponse(
  data: MarineApiResponse,
  now = Date.now(),
): MarineContext {
  const times = Array.isArray(data.hourly?.time) ? data.hourly.time : [];
  const hourlyIndex = findNearestMarineIndex(times, now);

  const valueFor = (field: MarineField) => {
    const currentValue = finiteOrNull(data.current?.[field]);
    if (currentValue !== null) return currentValue;
    if (hourlyIndex < 0) return null;
    return finiteOrNull(data.hourly?.[field]?.[hourlyIndex]);
  };

  const currentTime = data.current?.time;
  const hourlyTime = hourlyIndex >= 0 ? times[hourlyIndex] : undefined;
  const checkedAtCandidate = currentTime ?? hourlyTime;
  const checkedAt =
    checkedAtCandidate && !Number.isNaN(Date.parse(checkedAtCandidate))
      ? new Date(checkedAtCandidate).toISOString()
      : new Date(now).toISOString();

  return {
    waveHeight: valueFor("wave_height"),
    wavePeriod: valueFor("wave_period"),
    windWaveHeight: valueFor("wind_wave_height"),
    swellWaveHeight: valueFor("swell_wave_height"),
    checkedAt,
    source: "Open-Meteo Marine Forecast",
  };
}
