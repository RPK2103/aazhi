"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ActiveTripDto } from "@/application/active-trip";
import {
  expandTimelineForDisplay,
  formatMarineDelta,
  formatLatestManualCheck,
  formatMarineMeasurement,
  formatOperationalActionLabel,
  formatRiskPostureLabel,
  formatWindDirection,
  getInterpretationPresentation,
  MANUAL_MONITORING_NOTICE,
} from "@/lib/active-trip-display";
import { STATUS_COLORS, type StatusTone } from "@/lib/status-colors";

interface Props {
  activeTrip: ActiveTripDto;
  isRefreshing: boolean;
  error: string;
  onRefreshMarine: () => void;
}

function riskPostureTone(posture: ActiveTripDto["currentPosture"]): StatusTone {
  switch (posture) {
    case "OFFICIAL_ALERT_PRIORITY":
      return "critical";
    case "COORDINATOR_REVIEW_REQUIRED":
    case "REASSESSMENT_REQUIRED":
      return "caution";
    case "CAUTION":
      return "watch";
    case "BASELINE":
      return "ready";
    default:
      return "neutral";
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ActiveTripWorkspace({
  activeTrip,
  isRefreshing,
  error,
  onRefreshMarine,
}: Props) {
  const reducedMotion = Boolean(useReducedMotion());
  const postureColor = STATUS_COLORS[riskPostureTone(activeTrip.currentPosture)];
  const trace = activeTrip.latestProcessingTrace;
  const interpretation = getInterpretationPresentation(trace);
  const timeline = expandTimelineForDisplay(activeTrip.timeline);

  return (
    <article className="active-trip-workspace" aria-labelledby="active-trip-title">
      <header className="active-trip-workspace__header sea-glass">
        <div>
          <h2 id="active-trip-title" className="panel-heading">
            ACTIVE TRIP
          </h2>
          <p className="active-trip-workspace__meta">
            Started {formatDateTime(activeTrip.startedAt)} · Planned{" "}
            {activeTrip.plannedDurationHours} h · Crew {activeTrip.crewCount}
            {activeTrip.marineReferenceLocation.label
              ? ` · ${activeTrip.marineReferenceLocation.label}`
              : ""}
          </p>
        </div>
        <p className="active-trip-workspace__notice" role="note">
          <strong>MANUAL UPDATE</strong> {MANUAL_MONITORING_NOTICE}
        </p>
      </header>

      <div className="active-trip-workspace__grid">
        <motion.section
          className="active-trip-card sea-glass"
          style={{ "--posture-color": postureColor } as CSSProperties}
          {...(reducedMotion
            ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
            : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } })}
        >
          <h3 className="panel-heading">CURRENT POSTURE</h3>
          <p className="active-trip-card__posture" style={{ color: postureColor }}>
            {formatRiskPostureLabel(activeTrip.currentPosture)}
          </p>
          <p className="active-trip-card__meta">
            State version {activeTrip.stateVersion} · RISK STATE RECORDED{" "}
            {formatDateTime(activeTrip.lastEvaluatedAt)} · LATEST MANUAL CHECK{" "}
            {formatLatestManualCheck(activeTrip.timeline)}
          </p>
        </motion.section>

        <section className="active-trip-card glass-quiet">
          <h3 className="panel-heading">MARINE CONDITIONS</h3>
          <ul className="active-trip-list">
            <li>
              Wave height:{" "}
              {formatMarineMeasurement(activeTrip.currentMarineState.waveHeightM, "m")}
            </li>
            <li>
              Wave period:{" "}
              {formatMarineMeasurement(activeTrip.currentMarineState.wavePeriodS, "s")}
            </li>
            <li>
              Wind speed:{" "}
              {formatMarineMeasurement(activeTrip.currentMarineState.windSpeedKmh, "km/h")}
            </li>
            <li>
              Wind direction:{" "}
              {formatWindDirection(activeTrip.currentMarineState.windDirectionDeg)}
            </li>
          </ul>
        </section>

        <section className="active-trip-card glass-quiet">
          <h3 className="panel-heading">ACTIVE CONCERNS</h3>
          {activeTrip.activeConcerns.length === 0 ? (
            <p className="active-trip-card__empty">No active concerns recorded.</p>
          ) : (
            <ul className="active-trip-concerns">
              {activeTrip.activeConcerns.map((concern) => (
                <li key={concern.id}>
                  <strong>{concern.concept.replaceAll("_", " ")}</strong>
                  <span>{concern.status === "RESOLUTION_REPORTED" ? "RESOLUTION REPORTED" : concern.status}</span>
                  <p>{concern.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="active-trip-card glass-quiet">
          <h3 className="panel-heading">WHAT CHANGED</h3>
          {!trace || trace.deltas.length === 0 ? (
            <p className="active-trip-card__empty">No recorded state changes yet.</p>
          ) : (
            <ul className="active-trip-deltas">
              {trace.deltas.map((delta) => {
                const formatted = formatMarineDelta(delta);
                return (
                  <li key={delta.id}>
                    <strong>{formatted.label}</strong>
                    <span>
                      {formatted.previous} → {formatted.current}
                    </span>
                    <span>CHANGE {formatted.change}</span>
                    <span>RECORDED STATE CHANGE</span>
                    {formatted.reassessmentCopy && <em>{formatted.reassessmentCopy}</em>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="active-trip-card glass-quiet">
          <h3 className="panel-heading">ACTION STATE</h3>
          <p className="active-trip-card__action">
            {activeTrip.latestPolicyAction
              ? formatOperationalActionLabel(activeTrip.latestPolicyAction)
              : "NO NEW AAZHI ACTION"}
          </p>
        </section>

        <section className="active-trip-card glass-quiet">
          <h3 className="panel-heading">{interpretation.heading}</h3>
          {interpretation.body && <p>{interpretation.body}</p>}
          {interpretation.groundingLines.length > 0 && (
            <div className="active-trip-grounding">
              <p className="panel-heading">Grounded context</p>
              <ul>
                {interpretation.groundingLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="active-trip-card sea-glass active-trip-card--refresh">
          <h3 className="panel-heading">CHECK LATEST SEA CONDITIONS</h3>
          <p className="active-trip-card__copy">
            Fetch the latest available marine context and compare it with this trip&apos;s last
            recorded risk state.
          </p>
          <button
            type="button"
            className="workspace-primary-button"
            disabled={isRefreshing}
            onClick={onRefreshMarine}
          >
            {isRefreshing
              ? "Comparing the latest available marine context with this trip's recorded risk state…"
              : "CHECK LATEST SEA CONDITIONS"}
          </button>
          {error && (
            <p className="active-trip-workspace__error" role="alert">
              {error}
            </p>
          )}
        </section>

        <section className="active-trip-card glass-quiet active-trip-card--timeline">
          <h3 className="panel-heading">TRIP TIMELINE</h3>
          <ol className="active-trip-timeline">
            {timeline.map((entry) => (
              <li key={entry.id}>
                <time dateTime={entry.occurredAt}>{formatDateTime(entry.occurredAt)}</time>
                <strong>{entry.title}</strong>
                <span>{entry.summary}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}
