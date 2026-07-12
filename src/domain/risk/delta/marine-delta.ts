import type { RiskConcept } from "../risk-concepts";
import type { MarineRiskState } from "../marine-risk-state";
import {
  DEFAULT_REASSESSMENT_SENSITIVITY,
  type ReassessmentSensitivity,
} from "./reassessment-sensitivity";
import type { MarineMeasurement, RiskDelta, RiskDeltaType } from "./delta-types";

/** Decimal places used when normalizing marine measurement deltas. */
const MARINE_DELTA_DECIMALS = 6;

/**
 * Normalizes floating-point marine arithmetic so values like 0.7 do not leak
 * as 0.7000000000000001 into domain results.
 */
export function normalizeMarineNumber(value: number): number {
  const factor = 10 ** MARINE_DELTA_DECIMALS;
  return Math.round(value * factor) / factor;
}

/**
 * Shortest angular distance on a 0–360 degree circle.
 * Signed representation is omitted to avoid wrap ambiguity.
 */
export function shortestAngularDistanceDeg(
  previousDeg: number,
  currentDeg: number,
): number {
  const rawDiff = Math.abs(currentDeg - previousDeg) % 360;
  return normalizeMarineNumber(rawDiff > 180 ? 360 - rawDiff : rawDiff);
}

interface MarineMeasurementDefinition {
  readonly measurement: MarineMeasurement;
  readonly concept: RiskConcept;
  readonly field: keyof Pick<
    MarineRiskState,
    "waveHeightM" | "wavePeriodS" | "windSpeedKmh" | "windDirectionDeg"
  >;
}

/** Fixed comparison order for aggregate delta output. */
export const MARINE_MEASUREMENT_ORDER: readonly MarineMeasurementDefinition[] = [
  { measurement: "WAVE_HEIGHT_M", concept: "WAVE_CONDITIONS", field: "waveHeightM" },
  { measurement: "WAVE_PERIOD_S", concept: "WAVE_CONDITIONS", field: "wavePeriodS" },
  { measurement: "WIND_SPEED_KMH", concept: "WIND_CONDITIONS", field: "windSpeedKmh" },
  {
    measurement: "WIND_DIRECTION_DEG",
    concept: "WIND_CONDITIONS",
    field: "windDirectionDeg",
  },
];

function classifyNumericDelta(
  signedChange: number,
): "VALUE_INCREASED" | "VALUE_DECREASED" | "VALUE_UNCHANGED" {
  if (signedChange > 0) {
    return "VALUE_INCREASED";
  }
  if (signedChange < 0) {
    return "VALUE_DECREASED";
  }
  return "VALUE_UNCHANGED";
}

function isReassessmentRelevantMarineChange(
  measurement: MarineMeasurement,
  type: RiskDeltaType,
  absoluteChange: number | undefined,
  sensitivity: ReassessmentSensitivity,
): boolean {
  if (type === "VALUE_BECAME_AVAILABLE" || type === "VALUE_BECAME_UNAVAILABLE") {
    return measurement === "WAVE_HEIGHT_M" || measurement === "WIND_SPEED_KMH";
  }

  if (absoluteChange === undefined) {
    return false;
  }

  if (measurement === "WAVE_HEIGHT_M") {
    return absoluteChange >= sensitivity.waveHeightAbsoluteChangeM;
  }

  if (measurement === "WIND_SPEED_KMH") {
    return absoluteChange >= sensitivity.windSpeedAbsoluteChangeKmh;
  }

  return false;
}

function buildMarineDeltaId(
  measurement: MarineMeasurement,
  type: RiskDeltaType,
): string {
  return `marine:${measurement}:${type}`;
}

/**
 * Compares one marine measurement between two snapshots.
 * Returns null when the measurement is unchanged (including null → null).
 */
export function compareMarineMeasurement(
  definition: MarineMeasurementDefinition,
  previous: MarineRiskState,
  current: MarineRiskState,
  detectedAt: string,
  sensitivity: ReassessmentSensitivity = DEFAULT_REASSESSMENT_SENSITIVITY,
): RiskDelta | null {
  const previousValue = previous[definition.field];
  const currentValue = current[definition.field];

  if (previousValue === null && currentValue === null) {
    return null;
  }

  if (previousValue === null && currentValue !== null) {
    const type = "VALUE_BECAME_AVAILABLE" as const;
    return {
      id: buildMarineDeltaId(definition.measurement, type),
      type,
      concept: definition.concept,
      measurement: definition.measurement,
      previousValue: null,
      currentValue: normalizeMarineNumber(currentValue),
      reassessmentRelevant: isReassessmentRelevantMarineChange(
        definition.measurement,
        type,
        undefined,
        sensitivity,
      ),
      detectedAt,
    };
  }

  if (previousValue !== null && currentValue === null) {
    const type = "VALUE_BECAME_UNAVAILABLE" as const;
    return {
      id: buildMarineDeltaId(definition.measurement, type),
      type,
      concept: definition.concept,
      measurement: definition.measurement,
      previousValue: normalizeMarineNumber(previousValue),
      currentValue: null,
      reassessmentRelevant: isReassessmentRelevantMarineChange(
        definition.measurement,
        type,
        undefined,
        sensitivity,
      ),
      detectedAt,
    };
  }

  if (previousValue !== null && currentValue !== null) {
    if (definition.measurement === "WIND_DIRECTION_DEG") {
      const absoluteChange = shortestAngularDistanceDeg(previousValue, currentValue);
      if (absoluteChange === 0) {
        return null;
      }

      const type = "VALUE_INCREASED" as const;
      return {
        id: buildMarineDeltaId(definition.measurement, type),
        type,
        concept: definition.concept,
        measurement: definition.measurement,
        previousValue: normalizeMarineNumber(previousValue),
        currentValue: normalizeMarineNumber(currentValue),
        absoluteChange,
        reassessmentRelevant: isReassessmentRelevantMarineChange(
          definition.measurement,
          type,
          absoluteChange,
          sensitivity,
        ),
        detectedAt,
      };
    }

    const signedChange = normalizeMarineNumber(currentValue - previousValue);
    const absoluteChange = normalizeMarineNumber(Math.abs(signedChange));
    const type = classifyNumericDelta(signedChange);

    if (type === "VALUE_UNCHANGED") {
      return null;
    }

    return {
      id: buildMarineDeltaId(definition.measurement, type),
      type,
      concept: definition.concept,
      measurement: definition.measurement,
      previousValue: normalizeMarineNumber(previousValue),
      currentValue: normalizeMarineNumber(currentValue),
      absoluteChange,
      reassessmentRelevant: isReassessmentRelevantMarineChange(
        definition.measurement,
        type,
        absoluteChange,
        sensitivity,
      ),
      detectedAt,
    };
  }

  return null;
}

/**
 * Compares all configured marine measurements between two snapshots.
 * Unchanged measurements are omitted from the result.
 */
export function calculateMarineDeltas(
  previous: MarineRiskState,
  current: MarineRiskState,
  detectedAt: string,
  sensitivity: ReassessmentSensitivity = DEFAULT_REASSESSMENT_SENSITIVITY,
): readonly RiskDelta[] {
  const deltas: RiskDelta[] = [];

  for (const definition of MARINE_MEASUREMENT_ORDER) {
    const delta = compareMarineMeasurement(
      definition,
      previous,
      current,
      detectedAt,
      sensitivity,
    );
    if (delta !== null) {
      deltas.push(delta);
    }
  }

  return deltas;
}
