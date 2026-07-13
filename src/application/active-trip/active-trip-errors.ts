export class InvalidVesselReferenceError extends Error {
  readonly code = "INVALID_VESSEL_REFERENCE" as const;

  constructor(vesselId: string) {
    super(`Vessel reference is invalid or no longer exists: ${vesselId}`);
    this.name = "InvalidVesselReferenceError";
  }
}

export class ActiveTripNotFoundError extends Error {
  constructor(tripId: string) {
    super(`Active trip not found: ${tripId}`);
    this.name = "ActiveTripNotFoundError";
  }
}
