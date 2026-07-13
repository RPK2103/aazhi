"use client";

import { type RefObject, useEffect, useRef } from "react";
import { motion, type MotionValue } from "motion/react";
import type { useAssessmentWorkflow } from "@/hooks/use-assessment-workflow";
import type { useActiveTripWorkflow } from "@/hooks/use-active-trip-workflow";
import { useClientDate } from "@/hooks/use-client-date";
import { WorkspaceContextBar } from "@/components/workspace/workspace-context-bar";
import { ObservationPanel } from "@/components/workspace/observation-panel";
import { AssessmentWorkspace } from "@/components/workspace/assessment-workspace";
import { TripBridgeSection } from "@/components/workspace/trip-bridge-section";

type Workflow = ReturnType<typeof useAssessmentWorkflow>;
type ActiveTripWorkflow = ReturnType<typeof useActiveTripWorkflow>;

interface Props {
  workflow: Workflow;
  activeTripWorkflow: ActiveTripWorkflow;
  workspaceRef: RefObject<HTMLElement | null>;
  workspaceReveal: MotionValue<number>;
}

export function DecisionWorkspace({
  workflow,
  activeTripWorkflow,
  workspaceRef,
  workspaceReveal,
}: Props) {
  const currentDate = useClientDate();
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!workflow.result) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    resultRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [workflow.result]);

  return (
    <motion.section
      ref={workspaceRef}
      className="decision-workspace"
      style={{ opacity: workspaceReveal }}
      aria-label="Underwater decision workspace"
    >
      <WorkspaceContextBar
        locationName={workflow.selectedLocationName}
        currentDate={currentDate ?? "—"}
        result={workflow.result}
      />
      <div className="decision-workspace__grid">
        <ObservationPanel workflow={workflow} />
        <AssessmentWorkspace
          resultRef={resultRef}
          isLoading={workflow.isLoading}
          result={workflow.result}
          submittedContext={workflow.submittedContext}
          onReset={() => workflow.resetAssessment(workspaceRef.current)}
          activeTrip={activeTripWorkflow.activeTrip}
          isRestoringTrip={activeTripWorkflow.isRestoring}
          isRefreshingMarine={activeTripWorkflow.isRefreshing}
          activeTripError={activeTripWorkflow.error}
          onRefreshMarine={() => void activeTripWorkflow.refreshMarine()}
          tripBridge={
            workflow.result && workflow.submittedContext ? (
              <TripBridgeSection
                result={workflow.result}
                submittedContext={workflow.submittedContext}
                isStartingTrip={activeTripWorkflow.isStarting}
                onStartTrip={activeTripWorkflow.startTrip}
              />
            ) : null
          }
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {workflow.result ? "Assessment complete. Readiness brief follows." : ""}
      </p>
    </motion.section>
  );
}
