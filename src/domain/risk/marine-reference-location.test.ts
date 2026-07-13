import { describe, expect, it } from "vitest";
import {
  InvalidMarineReferenceLocationError,
  validateMarineReferenceLocation,
} from "./marine-reference-location";

describe("validateMarineReferenceLocation", () => {
  it("accepts valid coordinates and label", () => {
    const result = validateMarineReferenceLocation({
      latitude: 13.125,
      longitude: 80.3,
      label: "Chennai / Kasimedu",
    });

    expect(result.label).toBe("Chennai / Kasimedu");
  });

  it("accepts null label", () => {
    const result = validateMarineReferenceLocation({
      latitude: 0,
      longitude: 0,
      label: null,
    });

    expect(result.label).toBeNull();
  });

  it("rejects latitude below -90", () => {
    expect(() =>
      validateMarineReferenceLocation({
        latitude: -91,
        longitude: 0,
        label: null,
      }),
    ).toThrow(InvalidMarineReferenceLocationError);
  });

  it("rejects non-finite longitude", () => {
    expect(() =>
      validateMarineReferenceLocation({
        latitude: 0,
        longitude: Number.NaN,
        label: null,
      }),
    ).toThrow(InvalidMarineReferenceLocationError);
  });
});
