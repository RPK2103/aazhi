"use client";

import { type RefObject, useEffect, useRef } from "react";
import { motion, type MotionValue } from "motion/react";
import type { useAssessmentWorkflow } from "@/hooks/use-assessment-workflow";
import { useClientDate } from "@/hooks/use-client-date";
import { WorkspaceContextBar } from "@/components/workspace/workspace-context-bar";
import { ObservationPanel } from "@/components/workspace/observation-panel";
import { AssessmentWorkspace } from "@/components/workspace/assessment-workspace";

type Workflow = ReturnType<typeof useAssessmentWorkflow>;

interface Props {
  workflow: Workflow;
  workspaceRef: RefObject<HTMLElement | null>;
  workspaceReveal: MotionValue<number>;
}

export function DecisionWorkspace({
  workflow,
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
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {workflow.result ? "Assessment complete. Readiness brief follows." : ""}
      </p>
    </motion.section>
  );
}
