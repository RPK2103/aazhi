import { describe, expect, it } from "vitest";
import { COASTAL_LOCATIONS, getLocation } from "@/lib/locations";

describe("coastal location configuration", () => {
  it.each([
    ["chennai-kasimedu", "Chennai / Kasimedu"],
    ["kochi", "Kochi"],
    ["mangaluru", "Mangaluru"],
  ])("contains %s as %s", (id, name) => {
    expect(getLocation(id)?.name).toBe(name);
  });

  it("contains finite coordinates for every location", () => {
    for (const location of COASTAL_LOCATIONS) {
      expect(Number.isFinite(location.latitude)).toBe(true);
      expect(Number.isFinite(location.longitude)).toBe(true);
    }
  });

  it("uses unique location IDs", () => {
    const ids = COASTAL_LOCATIONS.map((location) => location.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
