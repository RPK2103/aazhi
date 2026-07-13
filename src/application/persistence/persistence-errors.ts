export class PersistenceMappingError extends Error {
  readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = "PersistenceMappingError";
    this.field = field;
  }
}

export class PersistenceConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersistenceConflictError";
  }
}

export class ConcernTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConcernTransitionError";
  }
}

export class VesselNotFoundError extends Error {
  constructor(vesselId: string) {
    super(`Vessel not found: ${vesselId}`);
    this.name = "VesselNotFoundError";
  }
}

export class TripNotFoundError extends Error {
  constructor(tripId: string) {
    super(`Trip not found: ${tripId}`);
    this.name = "TripNotFoundError";
  }
}

export class ConcernNotFoundError extends Error {
  constructor(concernId: string) {
    super(`Concern not found: ${concernId}`);
    this.name = "ConcernNotFoundError";
  }
}
