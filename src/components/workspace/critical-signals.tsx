import type { CSSProperties } from "react";
import type { AazhiAssessment, DepartureBlocker } from "@/lib/types";
import { blockerTone, statusColor } from "@/lib/status-colors";

interface Props {
  assessment: AazhiAssessment;
}

const PRIORITY_ORDER: Record<DepartureBlocker["priority"], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export function CriticalSignals({ assessment }: Props) {
  const blockers = [...assessment.departureBlockers].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
  const hasConflict = assessment.conditionConflict.detected;

  if (blockers.length === 0 && !hasConflict) {
    return (
      <section className="critical-signals glass-quiet" aria-labelledby="critical-signals-title">
        <h3 id="critical-signals-title" className="panel-heading">
          CRITICAL SIGNALS
        </h3>
        <p className="panel-muted">
          No specific departure blockers were identified from the supplied context.
        </p>
      </section>
    );
  }

  return (
    <section className="critical-signals glass-quiet" aria-labelledby="critical-signals-title">
      <h3 id="critical-signals-title" className="panel-heading">
        CRITICAL SIGNALS
      </h3>
      <ul className="critical-signals__list">
        {hasConflict && (
          <SignalRow
            tone="caution"
            title="Condition conflict"
            meta="RECONCILIATION"
            reason={assessment.conditionConflict.explanation}
            icon="!"
          />
        )}
        {blockers.map((blocker, index) => (
          <SignalRow
            key={`${index}-${blocker.title}`}
            tone={blockerTone(blocker.priority)}
            title={blocker.title}
            meta={blocker.priority}
            reason={blocker.reason}
            icon={blocker.priority === "HIGH" ? "!" : "·"}
          />
        ))}
      </ul>
    </section>
  );
}

function SignalRow({
  tone,
  title,
  meta,
  reason,
  icon,
}: {
  tone: ReturnType<typeof blockerTone>;
  title: string;
  meta: string;
  reason: string;
  icon: string;
}) {
  const color = statusColor(tone);
  return (
    <li
      className={`critical-signal critical-signal--${tone}`}
      style={
        {
          "--signal-color": color,
          borderLeftColor: color,
        } as CSSProperties
      }
    >
      <span className="critical-signal__icon" aria-hidden="true" style={{ color }}>
        {icon}
      </span>
      <div className="critical-signal__content">
        <p className="critical-signal__title">{title}</p>
        <p className="critical-signal__reason" title={reason}>
          {reason}
        </p>
      </div>
      <p className="critical-signal__meta" style={{ color }}>
        {meta}
      </p>
    </li>
  );
}
