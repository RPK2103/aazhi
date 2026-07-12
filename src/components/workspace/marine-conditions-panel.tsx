"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  SwellIcon,
  WaveHeightIcon,
  WavePeriodIcon,
  WindWaveIcon,
} from "@/components/icons/marine-icons";
import {
  normalizeMarineMetricForDisplay,
  type MarineMetricKey,
} from "@/lib/marine-display";
import type { MarineContext } from "@/lib/types";

interface Props {
  context: MarineContext;
  explanation: string;
}

function reading(value: number | null, unit: string) {
  return value === null ? "Unavailable" : `${value.toFixed(1)} ${unit}`;
}

const METRICS: Array<{
  key: MarineMetricKey;
  label: string;
  unit: string;
  Icon: typeof WaveHeightIcon;
}> = [
  { key: "waveHeight", label: "Wave height", unit: "m", Icon: WaveHeightIcon },
  { key: "wavePeriod", label: "Wave period", unit: "s", Icon: WavePeriodIcon },
  { key: "windWaveHeight", label: "Wind-wave", unit: "m", Icon: WindWaveIcon },
  { key: "swellWaveHeight", label: "Swell", unit: "m", Icon: SwellIcon },
];

function MetricBar({
  height,
  delay,
  reducedMotion,
}: {
  height: number;
  delay: number;
  reducedMotion: boolean;
}) {
  return (
    <div className="marine-metric__bar-track" aria-hidden="true">
      <motion.span
        className="marine-metric__bar"
        initial={{ scaleY: reducedMotion ? 1 : 0 }}
        animate={{ scaleY: Math.max(0.1, height) }}
        transition={
          reducedMotion
            ? { duration: 0.01 }
            : {
                duration: 0.58,
                delay,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }
        }
        style={{ transformOrigin: "bottom" }}
      />
    </div>
  );
}

export function MarineConditionsPanel({ context, explanation }: Props) {
  const reducedMotion = Boolean(useReducedMotion());
  const checkedDate = new Date(context.checkedAt);
  const checkedAt = Number.isNaN(checkedDate.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en-IN", {
        timeStyle: "short",
      }).format(checkedDate);

  return (
    <section
      className="marine-conditions glass-quiet"
      aria-labelledby="marine-conditions-title"
    >
      <h3 id="marine-conditions-title" className="panel-heading">
        MARINE CONDITIONS
      </h3>
      <div className="marine-conditions__metrics">
        {METRICS.map((metric, index) => {
          const value = context[metric.key];
          const barHeight = normalizeMarineMetricForDisplay(metric.key, value);
          const Icon = metric.Icon;
          return (
            <article key={metric.key} className="marine-metric">
              <Icon className="marine-metric__icon" aria-hidden="true" />
              <span className="marine-metric__label">{metric.label}</span>
              <p className="marine-metric__value">
                {reading(value, metric.unit)}
              </p>
              <MetricBar
                height={barHeight}
                delay={0.18 + index * 0.08}
                reducedMotion={reducedMotion}
              />
            </article>
          );
        })}
      </div>
      <p className="marine-conditions__explanation" title={explanation}>
        {explanation}
      </p>
      {explanation.length > 120 && (
        <details className="marine-conditions__more">
          <summary>More context</summary>
          <p>{explanation}</p>
        </details>
      )}
      <p className="marine-conditions__source">
        <span>{context.source}</span>
        <span>Checked {checkedAt}</span>
      </p>
    </section>
  );
}
