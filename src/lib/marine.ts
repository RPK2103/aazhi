import type { MarineContext } from "@/lib/types";

const MARINE_FIELDS = [
  "wave_height",
  "wave_period",
  "wind_wave_height",
  "swell_wave_height",
] as const;

type MarineField = (typeof MARINE_FIELDS)[number];

interface MarineApiResponse {
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

function nearestHourlyIndex(times: string[], now: number) {
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

export async function fetchMarineContext(
  latitude: number,
  longitude: number,
): Promise<MarineContext> {
  const fields = MARINE_FIELDS.join(",");
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: fields,
    hourly: fields,
    timezone: "UTC",
    forecast_days: "2",
  });

  try {
    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?${params.toString()}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      const providerMessage = (await response.text()).slice(0, 500);
      console.error("[AAZHI_ASSESSMENT_FAILURE]", {
        stage: "MARINE_FETCH",
        errorName: "MarineProviderError",
        status: response.status,
        message: providerMessage || response.statusText,
      });
      throw new MarineContextError();
    }

    const data = (await response.json()) as MarineApiResponse;
    const times = Array.isArray(data.hourly?.time) ? data.hourly.time : [];
    const hourlyIndex = nearestHourlyIndex(times, Date.now());

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
        : new Date().toISOString();

    return {
      waveHeight: valueFor("wave_height"),
      wavePeriod: valueFor("wave_period"),
      windWaveHeight: valueFor("wind_wave_height"),
      swellWaveHeight: valueFor("swell_wave_height"),
      checkedAt,
      source: "Open-Meteo Marine Forecast",
    };
  } catch (error) {
    if (error instanceof MarineContextError) throw error;
    console.error("[AAZHI_ASSESSMENT_FAILURE]", {
      stage: "MARINE_FETCH",
      errorName: error instanceof Error ? error.name : "UnknownError",
      message:
        error instanceof Error
          ? error.message.slice(0, 500)
          : "Unknown marine fetch failure",
    });
    throw new MarineContextError();
  }
}
