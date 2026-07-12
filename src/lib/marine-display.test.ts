import { describe, expect, it } from "vitest";
import { normalizeMarineMetricForDisplay } from "@/lib/marine-display";

describe("normalizeMarineMetricForDisplay", () => {
  it("returns a low marker for unavailable values", () => {
    expect(normalizeMarineMetricForDisplay("waveHeight", null)).toBe(0.12);
  });

  it("clamps wave height into the display domain", () => {
    expect(normalizeMarineMetricForDisplay("waveHeight", 2)).toBe(0.5);
    expect(normalizeMarineMetricForDisplay("waveHeight", 8)).toBe(1);
  });

  it("normalizes wave period within bounds", () => {
    expect(normalizeMarineMetricForDisplay("wavePeriod", 7)).toBeCloseTo(0.5, 1);
  });
});
