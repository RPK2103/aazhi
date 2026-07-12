"use client";

import { type RefObject } from "react";
import type { AssessmentResponse } from "@/lib/types";
import type { SubmittedContext } from "@/hooks/use-assessment-workflow";
import { DormantAssessmentState } from "@/components/workspace/dormant-assessment-state";
import { AssessingState } from "@/components/workspace/assessing-state";
import { AssessmentDashboard } from "@/components/workspace/assessment-dashboard";

interface Props {
  isLoading: boolean;
  result: AssessmentResponse | null;
  submittedContext: SubmittedContext | null;
  onReset: () => void;
  resultRef: RefObject<HTMLDivElement | null>;
}

export function AssessmentWorkspace({
  isLoading,
  result,
  submittedContext,
  onReset,
  resultRef,
}: Props) {
  return (
    <div className="assessment-workspace sea-glass" aria-live="polite">
      {isLoading && <AssessingState key="assessing" />}
      {!isLoading && result && submittedContext && (
        <div ref={resultRef}>
          <AssessmentDashboard
            result={result}
            submittedContext={submittedContext}
            onReset={onReset}
          />
        </div>
      )}
      {!isLoading && !result && <DormantAssessmentState />}
    </div>
  );
}
