"use client";

import { useState } from "react";
import { isProceedWithCautionPosture } from "@/application/active-trip";
import type { ConfirmedCarryForwardConcern } from "@/components/workspace/concern-carry-forward-panel";
import type {
  ActiveTripStartResponse,
  StartTripRequestBody,
} from "@/application/active-trip";
import { readVesselId } from "@/lib/active-trip-storage";

interface Props {
  assessmentPosture: string;
  buildStartPayload: (
    confirmedConcern: ConfirmedCarryForwardConcern | null,
    vesselId: string | null,
  ) => StartTripRequestBody;
  confirmedConcern: ConfirmedCarryForwardConcern | null;
  isStarting: boolean;
  onStart: (payload: StartTripRequestBody) => Promise<ActiveTripStartResponse>;
}

export function RecordTripStartPanel({
  assessmentPosture,
  buildStartPayload,
  confirmedConcern,
  isStarting,
  onStart,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const requiresAcknowledgement = !isProceedWithCautionPosture(assessmentPosture);

  return (
    <section className="trip-bridge-panel sea-glass" aria-labelledby="record-trip-title">
      <h3 id="record-trip-title" className="panel-heading">
        RECORD TRIP START
      </h3>
      <p className="trip-bridge-panel__copy">
        Record this trip as active in AAZHI&apos;s vessel risk record. This does not provide
        departure clearance or continuous monitoring.
      </p>
      {requiresAcknowledgement && (
        <label className="trip-bridge-panel__ack">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>
            Your current assessment still indicates action or reassessment is required.
            Recording a trip start does not override that assessment or provide departure
            clearance.
          </span>
        </label>
      )}
      <button
        type="button"
        className="workspace-primary-button"
        disabled={isStarting || (requiresAcknowledgement && !acknowledged)}
        onClick={() =>
          void onStart(
            buildStartPayload(confirmedConcern, readVesselId()),
          )
        }
      >
        {isStarting ? "Recording trip start…" : "RECORD TRIP START"}
      </button>
    </section>
  );
}
