import type { MarineRiskState } from "@/domain/risk";
import type { MarineContext } from "@/lib/types";
import type { MarineNormalizationInput } from "./marine-normalization-input";

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function marineContextToNormalizationInput(
  context: MarineContext,
): MarineNormalizationInput {
  return {
    waveHeightM: finiteOrNull(context.waveHeight),
    wavePeriodS: finiteOrNull(context.wavePeriod),
    windSpeedKmh: null,
    windDirectionDeg: null,
    capturedAt: context.checkedAt,
  };
}

export function toMarineRiskState(input: MarineNormalizationInput): MarineRiskState {
  return {
    waveHeightM: finiteOrNull(input.waveHeightM),
    wavePeriodS: finiteOrNull(input.wavePeriodS),
    windSpeedKmh: finiteOrNull(input.windSpeedKmh),
    windDirectionDeg: finiteOrNull(input.windDirectionDeg),
    capturedAt: input.capturedAt,
  };
}

export function marineContextToMarineRiskState(context: MarineContext): MarineRiskState {
  return toMarineRiskState(marineContextToNormalizationInput(context));
}
