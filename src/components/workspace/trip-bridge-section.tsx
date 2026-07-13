"use client";

import { useMemo, useState } from "react";
import type { AssessmentResponse } from "@/lib/types";
import type { SubmittedContext } from "@/hooks/use-assessment-workflow";
import type {
  ActiveTripStartResponse,
  StartTripRequestBody,
} from "@/application/active-trip";
import { getLocation } from "@/lib/locations";
import { BOAT_TYPES } from "@/lib/types";
import { ConcernCarryForwardPanel, type ConfirmedCarryForwardConcern } from "@/components/workspace/concern-carry-forward-panel";
import { RecordTripStartPanel } from "@/components/workspace/record-trip-start-panel";

interface Props {
  result: AssessmentResponse;
  submittedContext: SubmittedContext;
  onStartTrip: (payload: StartTripRequestBody) => Promise<ActiveTripStartResponse>;
  isStartingTrip: boolean;
}

function isBoatType(value: string): value is (typeof BOAT_TYPES)[number] {
  return (BOAT_TYPES as readonly string[]).includes(value);
}

export function TripBridgeSection({
  result,
  submittedContext,
  onStartTrip,
  isStartingTrip,
}: Props) {
  const [confirmedConcern, setConfirmedConcern] =
    useState<ConfirmedCarryForwardConcern | null>(null);

  const defaultSummary = useMemo(() => {
    const blocker = result.assessment.departureBlockers[0];
    return submittedContext.typedObservation || blocker?.reason || "";
  }, [result.assessment.departureBlockers, submittedContext.typedObservation]);

  const buildStartPayload = (
    concern: ConfirmedCarryForwardConcern | null,
    vesselId: string | null,
  ): StartTripRequestBody => {
    const location = getLocation(submittedContext.locationId);
    if (!location) {
      throw new Error("Select a supported coastal location.");
    }
    if (!isBoatType(submittedContext.boatType)) {
      throw new Error("Unsupported vessel type.");
    }

    return {
      vesselId: vesselId ?? undefined,
      vessel: vesselId
        ? undefined
        : {
            displayName: submittedContext.boatType,
            vesselType: submittedContext.boatType,
          },
      crewCount: Number(submittedContext.crewCount),
      plannedDurationHours: Number(submittedContext.tripDuration),
      marineReferenceLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        label: location.name,
      },
      assessmentPosture: result.assessment.actionPosture,
      confirmedConcern: concern ?? undefined,
    };
  };

  return (
    <div className="trip-bridge">
      <ConcernCarryForwardPanel
        defaultSummary={defaultSummary}
        confirmedConcern={confirmedConcern}
        onConfirm={setConfirmedConcern}
        onClear={() => setConfirmedConcern(null)}
      />
      <RecordTripStartPanel
        assessmentPosture={result.assessment.actionPosture}
        buildStartPayload={buildStartPayload}
        confirmedConcern={confirmedConcern}
        isStarting={isStartingTrip}
        onStart={onStartTrip}
      />
    </div>
  );
}
