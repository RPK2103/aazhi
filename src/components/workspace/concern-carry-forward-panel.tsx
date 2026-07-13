"use client";

import { MANUAL_CARRY_FORWARD_CONCEPTS } from "@/application/active-trip";
import type { ManualCarryForwardConcept } from "@/application/active-trip";

export interface ConfirmedCarryForwardConcern {
  concept: ManualCarryForwardConcept;
  summary: string;
}

interface Props {
  defaultSummary?: string;
  confirmedConcern: ConfirmedCarryForwardConcern | null;
  onConfirm: (concern: ConfirmedCarryForwardConcern) => void;
  onClear: () => void;
}

function formatConcept(concept: ManualCarryForwardConcept): string {
  return concept.replaceAll("_", " ");
}

export function ConcernCarryForwardPanel({
  defaultSummary = "",
  confirmedConcern,
  onConfirm,
  onClear,
}: Props) {
  return (
    <section className="trip-bridge-panel glass-quiet" aria-labelledby="carry-forward-title">
      <h3 id="carry-forward-title" className="panel-heading">
        KNOWN CONCERN TO CARRY FORWARD
      </h3>
      <p className="trip-bridge-panel__copy">
        Select one operational concern to carry into this trip&apos;s persistent risk record.
        Confirmation stores the choice locally until you record trip start.
      </p>
      <form
        className="trip-bridge-panel__form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          const concept = formData.get("concept");
          const summary = String(formData.get("summary") ?? "").trim();
          if (
            typeof concept !== "string" ||
            !MANUAL_CARRY_FORWARD_CONCEPTS.includes(concept as ManualCarryForwardConcept) ||
            !summary
          ) {
            return;
          }
          onConfirm({
            concept: concept as ManualCarryForwardConcept,
            summary,
          });
        }}
      >
        <label className="trip-bridge-panel__field">
          <span>Concern type</span>
          <select name="concept" defaultValue={confirmedConcern?.concept ?? "ENGINE_RELIABILITY"}>
            {MANUAL_CARRY_FORWARD_CONCEPTS.map((concept) => (
              <option key={concept} value={concept}>
                {formatConcept(concept)}
              </option>
            ))}
          </select>
        </label>
        <label className="trip-bridge-panel__field">
          <span>Concern summary</span>
          <textarea
            name="summary"
            rows={3}
            defaultValue={confirmedConcern?.summary ?? defaultSummary}
            maxLength={1500}
          />
        </label>
        <div className="trip-bridge-panel__actions">
          <button type="submit" className="workspace-secondary-button">
            CARRY INTO TRIP RISK RECORD
          </button>
          {confirmedConcern && (
            <button type="button" className="workspace-text-button" onClick={onClear}>
              Clear confirmed concern
            </button>
          )}
        </div>
      </form>
      {confirmedConcern && (
        <p className="trip-bridge-panel__status" role="status">
          Confirmed for trip start: {formatConcept(confirmedConcern.concept)} —{" "}
          {confirmedConcern.summary}
        </p>
      )}
    </section>
  );
}
