"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { AssessmentResponse } from "@/lib/types";
import type { SubmittedContext } from "@/hooks/use-assessment-workflow";
import { postureTone, statusColor } from "@/lib/status-colors";
import { PostureInstrument } from "@/components/workspace/posture-instrument";
import { CriticalSignals } from "@/components/workspace/critical-signals";
import { MarineConditionsPanel } from "@/components/workspace/marine-conditions-panel";
import { TripContextPanel } from "@/components/workspace/trip-context-panel";
import { ImmediateActionsPanel } from "@/components/workspace/immediate-actions-panel";

interface Props {
  result: AssessmentResponse;
  submittedContext: SubmittedContext;
  onReset: () => void;
  tripBridge?: React.ReactNode;
}

const reveal = (delay: number, reduced: boolean) =>
  reduced
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: {
          duration: 0.42,
          delay,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        },
      };

export function AssessmentDashboard({
  result,
  submittedContext,
  onReset,
  tripBridge,
}: Props) {
  const reducedMotion = Boolean(useReducedMotion());
  const { assessment, marineContext } = result;
  const tone = postureTone(assessment.actionPosture);
  const postureColor = statusColor(tone);

  return (
    <article className="assessment-dashboard" aria-labelledby="dashboard-title">
      <h2 id="dashboard-title" className="sr-only">
        Departure readiness brief
      </h2>

      <div className="assessment-dashboard__grid">
        <motion.section
          className="assessment-dashboard__posture sea-glass"
          style={{ "--posture-color": postureColor } as CSSProperties}
          {...reveal(0, reducedMotion)}
        >
          <h3 className="panel-heading">DEPARTURE POSTURE</h3>
          <div className="assessment-dashboard__posture-body">
            <PostureInstrument assessment={assessment} />
            <div className="assessment-dashboard__posture-copy">
              <p
                className="assessment-dashboard__urgency"
                style={{ color: postureColor }}
              >
                {assessment.urgency} URGENCY
              </p>
              <p
                className="assessment-dashboard__summary"
                title={assessment.situationSummary}
              >
                {assessment.situationSummary}
              </p>
              <details className="assessment-dashboard__details">
                <summary>Why this matters</summary>
                <p>{assessment.whyThisMatters}</p>
              </details>
            </div>
          </div>
        </motion.section>

        <motion.div className="assessment-dashboard__marine" {...reveal(0.16, reducedMotion)}>
          <MarineConditionsPanel
            context={marineContext}
            explanation={assessment.marineContextExplanation}
          />
        </motion.div>

        <motion.div className="assessment-dashboard__signals" {...reveal(0.28, reducedMotion)}>
          <CriticalSignals assessment={assessment} />
        </motion.div>

        <motion.div className="assessment-dashboard__actions" {...reveal(0.4, reducedMotion)}>
          <ImmediateActionsPanel actions={assessment.immediateActions} />
        </motion.div>

        <motion.div className="assessment-dashboard__trip" {...reveal(0.52, reducedMotion)}>
          <TripContextPanel context={submittedContext} />
        </motion.div>
      </div>

      <details className="assessment-dashboard__guidance">
        <summary>Additional guidance</summary>
        <GuidanceList title="Before you leave" items={assessment.preDepartureChecklist} />
        <GuidanceList
          title="If conditions change at sea"
          items={assessment.atSeaActions}
        />
        <GuidanceList title="After return" items={assessment.afterReturnActions} />
      </details>

      <aside className="assessment-dashboard__disclaimer">
        AAZHI provides preparedness and readiness assistance, not official
        maritime clearance. Follow local and maritime authority instructions.
      </aside>

      {tripBridge}

      <button className="workspace-secondary-button" type="button" onClick={onReset}>
        NEW ASSESSMENT
      </button>
    </article>
  );
}

function GuidanceList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
