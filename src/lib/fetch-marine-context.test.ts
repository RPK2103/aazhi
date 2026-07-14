import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMarineContext } from "@/lib/fetch-marine-context";
import { MarineContextError } from "@/lib/marine-normalize";

describe("fetchMarineContext", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns normalized marine context for a successful provider response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            wave_height: 0.8,
            wave_period: 7,
            wind_wave_height: 0.3,
            swell_wave_height: 0.4,
            time: "2026-07-11T08:00",
          },
        }),
      }),
    );

    const context = await fetchMarineContext(13.1, 80.3);

    expect(context.waveHeight).toBe(0.8);
    expect(context.source).toBe("Open-Meteo Marine Forecast");
  });

  it("throws MarineContextError when the provider response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: async () => "upstream failure",
      }),
    );

    await expect(fetchMarineContext(13.1, 80.3)).rejects.toBeInstanceOf(
      MarineContextError,
    );
  });

  it("throws MarineContextError when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(fetchMarineContext(13.1, 80.3)).rejects.toBeInstanceOf(
      MarineContextError,
    );
  });
});
