"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { CoordinatorTripAttentionDTO } from "@/application/coordinator-attention";
import {
  COORDINATOR_VIEW_HEADING,
  COORDINATOR_VIEW_SUBHEADING,
  ATTENTION_REQUIRED_SECTION_COPY,
  WATCH_SECTION_COPY,
  STABLE_SECTION_COPY,
  EMPTY_ATTENTION_REQUIRED_COPY,
  EMPTY_ATTENTION_REQUIRED_SUPPORT,
  EMPTY_ACTIVE_TRIPS_COPY,
  EMPTY_ACTIVE_TRIPS_SUPPORT,
  REFRESH_VIEW_COPY,
  formatConcernStatusLabel,
  formatCoordinatorManualCheck,
  formatMaterialDeltasForDisplay,
  getAttentionBasisActionStateLabel,
  getAttentionBasisExplanation,
  getAttentionBasisInterpretationPresentation,
  getLatestActionStateLabel,
  getVesselIdentityLabel,
} from "@/lib/coordinator-display";
import { formatRiskPostureLabel } from "@/lib/active-trip-display";
import { STATUS_COLORS, type StatusTone } from "@/lib/status-colors";
import type { useCoordinatorAttention } from "@/hooks/use-coordinator-attention";

type CoordinatorWorkflow = ReturnType<typeof useCoordinatorAttention>;

interface Props {
  workflow: CoordinatorWorkflow;
}

function riskPostureTone(posture: CoordinatorTripAttentionDTO["currentPosture"]): StatusTone {
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

function AttentionTripCard({
  trip,
  compact = false,
}: {
  trip: CoordinatorTripAttentionDTO;
  compact?: boolean;
}) {
  const postureColor = STATUS_COLORS[riskPostureTone(trip.currentPosture)];
  const basisExplanation = getAttentionBasisExplanation(trip.attentionBasis);
  const interpretation = getAttentionBasisInterpretationPresentation(trip.attentionBasis);
  const materialDeltas = formatMaterialDeltasForDisplay(trip.attentionBasis);
  const basisAction = getAttentionBasisActionStateLabel(trip.attentionBasis);

  return (
    <article className={`coordinator-card sea-glass${compact ? " coordinator-card--compact" : ""}`}>
      <header className="coordinator-card__header">
        <div>
          <h3 className="coordinator-card__vessel">{getVesselIdentityLabel(trip)}</h3>
          {trip.registrationReference ? (
            <p className="coordinator-card__registration">{trip.registrationReference}</p>
          ) : null}
          {trip.marineReferenceLocation.label ? (
            <p className="coordinator-card__location">{trip.marineReferenceLocation.label}</p>
          ) : null}
        </div>
        <p
          className="coordinator-card__posture"
          style={{ color: postureColor }}
        >
          {formatRiskPostureLabel(trip.currentPosture)}
        </p>
      </header>

      {trip.activeConcerns.length > 0 ? (
        <section className="coordinator-card__section">
          <h4 className="coordinator-card__label">UNRESOLVED CONTEXT</h4>
          <ul className="coordinator-card__concerns">
            {trip.activeConcerns.map((concern) => (
              <li key={concern.id}>
                <strong>{concern.concept.replaceAll("_", " ")}</strong>{" "}
                {formatConcernStatusLabel(concern.status)}
                <p>{concern.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="coordinator-card__section">
        <h4 className="coordinator-card__label">WHY THIS NEEDS ATTENTION</h4>
        {basisExplanation ? <p>{basisExplanation}</p> : null}
        {materialDeltas.length > 0 ? (
          <ul className="coordinator-card__deltas">
            {materialDeltas.map((delta, index) => (
              <li key={`${trip.tripId}-delta-${index}`}>
                <strong>{delta.label}</strong> {delta.previous} → {delta.current}
                <span> CHANGE {delta.change}</span>
                {delta.reassessmentCopy ? <p>{delta.reassessmentCopy}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="coordinator-card__section">
        <h4 className="coordinator-card__label">ACTION STATE</h4>
        {basisAction ? <p>{basisAction}</p> : null}
        <p className="coordinator-card__latest-action">
          <span>LATEST ACTION STATE</span> {getLatestActionStateLabel(trip.latestPolicyAction)}
        </p>
      </section>

      {interpretation.body ? (
        <section className="coordinator-card__section coordinator-card__interpretation">
          <h4 className="coordinator-card__label">{interpretation.heading}</h4>
          <p>{interpretation.body}</p>
          {interpretation.groundingLines.length > 0 ? (
            <div>
              <p className="coordinator-card__label">GROUNDED CONTEXT</p>
              <ul>
                {interpretation.groundingLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <footer className="coordinator-card__footer">
        <p>
          <span className="coordinator-card__label">LATEST MANUAL CHECK</span>{" "}
          {formatCoordinatorManualCheck(trip.latestManualCheckAt)}
        </p>
        <p className="coordinator-card__meta">State version {trip.stateVersion}</p>
      </footer>
    </article>
  );
}

function SummaryStrip({
  summary,
}: {
  summary: NonNullable<CoordinatorWorkflow["data"]>["summary"];
}) {
  return (
    <div className="coordinator-summary sea-glass">
      <div>
        <span className="coordinator-summary__value">{summary.totalActiveTrips}</span>
        <span className="coordinator-summary__label">ACTIVE TRIPS</span>
      </div>
      <div>
        <span className="coordinator-summary__value">{summary.attentionRequiredCount}</span>
        <span className="coordinator-summary__label">ATTENTION REQUIRED</span>
      </div>
      <div>
        <span className="coordinator-summary__value">{summary.watchCount}</span>
        <span className="coordinator-summary__label">WATCH</span>
      </div>
      <div>
        <span className="coordinator-summary__value">{summary.notCheckedYetCount}</span>
        <span className="coordinator-summary__label">NOT CHECKED YET</span>
      </div>
      <div className="coordinator-summary__stable">
        <span className="coordinator-summary__value">{summary.stableCount}</span>
        <span className="coordinator-summary__label">STABLE</span>
      </div>
    </div>
  );
}

export function CoordinatorView({ workflow }: Props) {
  const reducedMotion = Boolean(useReducedMotion());
  const { data, isLoading, error, refresh } = workflow;

  return (
    <div className="coordinator-view">
      <header className="coordinator-view__header sea-glass">
        <div>
          <Link href="/" className="coordinator-view__back">
            BACK TO TRIP ASSESSMENT
          </Link>
          <h1 className="panel-heading">{COORDINATOR_VIEW_HEADING}</h1>
          <p className="coordinator-view__subheading">{COORDINATOR_VIEW_SUBHEADING}</p>
        </div>
        <p className="coordinator-view__notice" role="note">
          {data?.manualMonitoringNotice ??
            "AAZHI is not continuously monitoring these trips. Attention reflects recorded trip state and manually processed updates."}
        </p>
      </header>

      <div className="coordinator-view__actions">
        <button
          type="button"
          className="coordinator-view__refresh"
          onClick={() => void refresh()}
          disabled={isLoading}
        >
          REFRESH VIEW
        </button>
        <p className="coordinator-view__refresh-copy">{REFRESH_VIEW_COPY}</p>
      </div>

      {error ? <p className="coordinator-view__error">{error}</p> : null}
      {isLoading && !data ? <p className="coordinator-view__loading">Loading coordinator view…</p> : null}

      {data ? (
        <motion.div
          className="coordinator-view__content"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.35 }}
        >
          <SummaryStrip summary={data.summary} />

          {data.summary.totalActiveTrips === 0 ? (
            <section className="coordinator-empty sea-glass">
              <h2>{EMPTY_ACTIVE_TRIPS_COPY}</h2>
              <p>{EMPTY_ACTIVE_TRIPS_SUPPORT}</p>
            </section>
          ) : (
            <>
              <section className="coordinator-section">
                <header>
                  <h2 className="panel-heading">ATTENTION REQUIRED</h2>
                  <p>{ATTENTION_REQUIRED_SECTION_COPY}</p>
                </header>
                {data.attentionRequired.length === 0 ? (
                  <div className="coordinator-empty coordinator-empty--inline sea-glass">
                    <p>{EMPTY_ATTENTION_REQUIRED_COPY}</p>
                    <p>{EMPTY_ATTENTION_REQUIRED_SUPPORT}</p>
                  </div>
                ) : (
                  <div className="coordinator-section__grid">
                    {data.attentionRequired.map((trip) => (
                      <AttentionTripCard key={trip.tripId} trip={trip} />
                    ))}
                  </div>
                )}
              </section>

              {data.watch.length > 0 ? (
                <section className="coordinator-section">
                  <header>
                    <h2 className="panel-heading">WATCH</h2>
                    <p>{WATCH_SECTION_COPY}</p>
                  </header>
                  <div className="coordinator-section__grid coordinator-section__grid--compact">
                    {data.watch.map((trip) => (
                      <AttentionTripCard key={trip.tripId} trip={trip} compact />
                    ))}
                  </div>
                </section>
              ) : null}

              {data.stable.length > 0 ? (
                <section className="coordinator-section">
                  <header>
                    <h2 className="panel-heading">STABLE RECORDED STATE</h2>
                    <p>{STABLE_SECTION_COPY}</p>
                  </header>
                  <div className="coordinator-section__grid coordinator-section__grid--compact">
                    {data.stable.map((trip) => (
                      <AttentionTripCard key={trip.tripId} trip={trip} compact />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
