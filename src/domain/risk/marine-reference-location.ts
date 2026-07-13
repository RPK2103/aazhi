/**
 * Marine forecast reference location recorded for a trip.
 *
 * This is not live vessel tracking, AIS, or an automatically updated position.
 */
export interface MarineReferenceLocation {
  latitude: number;
  longitude: number;
  label: string | null;
}

export class InvalidMarineReferenceLocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMarineReferenceLocationError";
  }
}

export function validateMarineReferenceLocation(
  location: MarineReferenceLocation,
): MarineReferenceLocation {
  if (
    !Number.isFinite(location.latitude) ||
    location.latitude < -90 ||
    location.latitude > 90
  ) {
    throw new InvalidMarineReferenceLocationError(
      "marineReferenceLocation.latitude must be a finite number between -90 and 90",
    );
  }

  if (
    !Number.isFinite(location.longitude) ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new InvalidMarineReferenceLocationError(
      "marineReferenceLocation.longitude must be a finite number between -180 and 180",
    );
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    label: location.label,
  };
}
