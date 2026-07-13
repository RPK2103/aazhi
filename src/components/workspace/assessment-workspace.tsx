"use client";

import { type RefObject, type ReactNode } from "react";
import type { AssessmentResponse } from "@/lib/types";
import type { SubmittedContext } from "@/hooks/use-assessment-workflow";
import type { ActiveTripDto } from "@/application/active-trip";
import { DormantAssessmentState } from "@/components/workspace/dormant-assessment-state";
import { AssessingState } from "@/components/workspace/assessing-state";
import { AssessmentDashboard } from "@/components/workspace/assessment-dashboard";
import { ActiveTripWorkspace } from "@/components/workspace/active-trip-workspace";

interface Props {
  isLoading: boolean;
  result: AssessmentResponse | null;
  submittedContext: SubmittedContext | null;
  onReset: () => void;
  resultRef: RefObject<HTMLDivElement | null>;
  activeTrip: ActiveTripDto | null;
  isRestoringTrip: boolean;
  isRefreshingMarine: boolean;
  activeTripError: string;
  onRefreshMarine: () => void;
  tripBridge?: ReactNode;
}

export function AssessmentWorkspace({
  isLoading,
  result,
  submittedContext,
  onReset,
  resultRef,
  activeTrip,
  isRestoringTrip,
  isRefreshingMarine,
  activeTripError,
  onRefreshMarine,
  tripBridge,
}: Props) {
  if (isRestoringTrip) {
    return (
      <div className="assessment-workspace sea-glass" aria-live="polite">
        <AssessingState key="restoring-trip" />
      </div>
    );
  }

  if (activeTrip) {
    return (
      <div className="assessment-workspace sea-glass" aria-live="polite">
        <ActiveTripWorkspace
          activeTrip={activeTrip}
          isRefreshing={isRefreshingMarine}
          error={activeTripError}
          onRefreshMarine={onRefreshMarine}
        />
      </div>
    );
  }

  return (
    <div className="assessment-workspace sea-glass" aria-live="polite">
      {isLoading && <AssessingState key="assessing" />}
      {!isLoading && result && submittedContext && (
        <div ref={resultRef}>
          <AssessmentDashboard
            result={result}
            submittedContext={submittedContext}
            onReset={onReset}
            tripBridge={tripBridge}
          />
        </div>
      )}
      {!isLoading && !result && <DormantAssessmentState />}
    </div>
  );
}
