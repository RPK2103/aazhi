import type { AssessmentResponse } from "@/lib/types";

interface Props {
  locationName: string;
  currentDate: string;
  result: AssessmentResponse | null;
}

export function WorkspaceContextBar({
  locationName,
  currentDate,
  result,
}: Props) {
  const checkedAt = result?.marineContext.checkedAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(result.marineContext.checkedAt))
    : null;

  return (
    <div className="workspace-context-bar" role="region" aria-label="Workspace context">
      <div className="workspace-context-bar__meta">
        {locationName ? (
          <span className="workspace-context-bar__location">{locationName}</span>
        ) : (
          <span className="workspace-context-bar__location workspace-context-bar__location--muted">
            Select coastal location
          </span>
        )}
        <span className="workspace-context-bar__date">{currentDate}</span>
        {checkedAt && (
          <span className="workspace-context-bar__assessed">
            Assessed {checkedAt}
          </span>
        )}
      </div>
    </div>
  );
}
