import { beforeEach, describe, expect, it } from "vitest";
import {
  ACTIVE_TRIP_STORAGE_KEYS,
  clearActiveTripId,
  clearVesselId,
  readActiveTripId,
  readVesselId,
  writeActiveTripId,
  writeVesselId,
} from "@/lib/active-trip-storage";

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    store,
  };
}

describe("active-trip storage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: createStorageMock() },
    });
  });

  it("uses only vessel and active trip keys", () => {
    expect(Object.values(ACTIVE_TRIP_STORAGE_KEYS)).toEqual([
      "aazhi:vessel-id",
      "aazhi:active-trip-id",
    ]);
  });

  it("persists and reads vessel id", () => {
    writeVesselId("vessel-1");
    expect(readVesselId()).toBe("vessel-1");
  });

  it("persists and reads active trip id", () => {
    writeActiveTripId("trip-1");
    expect(readActiveTripId()).toBe("trip-1");
  });

  it("clears invalid active trip reference", () => {
    writeActiveTripId("trip-stale");
    clearActiveTripId();
    expect(readActiveTripId()).toBeNull();
  });

  it("does not write risk state to localStorage", () => {
    writeVesselId("vessel-1");
    writeActiveTripId("trip-1");
    const storage = window.localStorage as unknown as ReturnType<typeof createStorageMock>;
    expect(storage.store.has("aazhi:risk-state")).toBe(false);
    expect(storage.store.has("aazhi:marine-state")).toBe(false);
  });

  it("restore helper clears stale vessel id", () => {
    writeVesselId("stale");
    clearVesselId();
    expect(readVesselId()).toBeNull();
  });

  it("only stores the two MVP continuity keys", () => {
    writeVesselId("vessel-1");
    writeActiveTripId("trip-1");
    const storage = window.localStorage as unknown as ReturnType<typeof createStorageMock>;
    expect([...storage.store.keys()].sort()).toEqual([
      "aazhi:active-trip-id",
      "aazhi:vessel-id",
    ]);
  });
});
