import "server-only";

import {
  MarineContextError,
  normalizeMarineResponse,
  type MarineApiResponse,
} from "@/lib/marine-normalize";

const MARINE_FIELDS = [
  "wave_height",
  "wave_period",
  "wind_wave_height",
  "swell_wave_height",
] as const;

export async function fetchMarineContext(
  latitude: number,
  longitude: number,
) {
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
    return normalizeMarineResponse(data);
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
