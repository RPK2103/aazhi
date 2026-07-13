const VESSEL_ID_KEY = "aazhi:vessel-id";
const ACTIVE_TRIP_ID_KEY = "aazhi:active-trip-id";

export const ACTIVE_TRIP_STORAGE_KEYS = {
  vesselId: VESSEL_ID_KEY,
  activeTripId: ACTIVE_TRIP_ID_KEY,
} as const;

export function readVesselId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(VESSEL_ID_KEY);
}

export function writeVesselId(vesselId: string): void {
  window.localStorage.setItem(VESSEL_ID_KEY, vesselId);
}

export function clearVesselId(): void {
  window.localStorage.removeItem(VESSEL_ID_KEY);
}

export function readActiveTripId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_TRIP_ID_KEY);
}

export function writeActiveTripId(tripId: string): void {
  window.localStorage.setItem(ACTIVE_TRIP_ID_KEY, tripId);
}

export function clearActiveTripId(): void {
  window.localStorage.removeItem(ACTIVE_TRIP_ID_KEY);
}

export function clearActiveTripReferences(): void {
  clearActiveTripId();
}
