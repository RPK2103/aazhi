import type { AssessmentResponse } from "@/lib/types";
import { MarineContextCard } from "@/components/marine-context-card";

interface Props {
  result: AssessmentResponse;
  onReset: () => void;
}

function ActionList({
  title,
  items,
  ordered = false,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <section className="brief-section">
      <h2>{title}</h2>
      {items.length > 0 ? (
        <List className={ordered ? "numbered-actions" : "check-list"}>
          {items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </List>
      ) : (
        <p className="muted">No additional actions generated.</p>
      )}
    </section>
  );
}

export function AssessmentResult({ result, onReset }: Props) {
  const { assessment, marineContext } = result;
  const blockerCount = assessment.departureBlockers.length;

  return (
    <article className="result-shell" aria-labelledby="posture-title">
      <header className={`posture-card urgency-${assessment.urgency.toLowerCase()}`}>
        <p className="eyebrow">ACTION POSTURE · {assessment.urgency} URGENCY</p>
        <h1 id="posture-title">{assessment.actionPosture}</h1>
        <p className="blocker-count">
          {blockerCount} DEPARTURE {blockerCount === 1 ? "BLOCKER" : "BLOCKERS"} FOUND
        </p>
        <p className="situation-summary">{assessment.situationSummary}</p>
      </header>

      <section className="brief-section" aria-labelledby="blockers-title">
        <h2 id="blockers-title">DEPARTURE BLOCKERS</h2>
        {blockerCount === 0 ? (
          <p className="empty-state">
            No specific departure blockers were identified from the supplied context.
          </p>
        ) : (
          <div className="blocker-list">
            {assessment.departureBlockers.map((blocker, index) => (
              <article className="blocker-card" key={`${index}-${blocker.title}`}>
                <p className="priority">PRIORITY: {blocker.priority}</p>
                <h3>{blocker.title}</h3>
                <p>{blocker.reason}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {assessment.conditionConflict.detected && (
        <section className="brief-section conflict-panel">
          <p className="eyebrow">RECONCILIATION FLAG</p>
          <h2>CONDITION CONFLICT</h2>
          <p>{assessment.conditionConflict.explanation}</p>
        </section>
      )}

      <section className="brief-section">
        <h2>WHY THIS MATTERS</h2>
        <p>{assessment.whyThisMatters}</p>
      </section>

      <ActionList
        title="DO THESE 3 THINGS NOW"
        items={assessment.immediateActions}
        ordered
      />

      <MarineContextCard
        context={marineContext}
        explanation={assessment.marineContextExplanation}
      />

      <ActionList
        title="BEFORE YOU LEAVE"
        items={assessment.preDepartureChecklist}
      />
      <ActionList
        title="IF CONDITIONS CHANGE AT SEA"
        items={assessment.atSeaActions}
      />
      <ActionList title="AFTER RETURN" items={assessment.afterReturnActions} />

      <aside className="disclaimer">
        AAZHI provides preparedness and readiness assistance, not official
        maritime clearance. Follow local and maritime authority instructions.
      </aside>

      <button className="secondary-button" type="button" onClick={onReset}>
        NEW ASSESSMENT
      </button>
    </article>
  );
}
