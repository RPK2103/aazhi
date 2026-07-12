interface Props {
  actions: string[];
}

export function ImmediateActionsPanel({ actions }: Props) {
  const primary = actions.slice(0, 3);
  const remainder = actions.slice(3);

  if (actions.length === 0) {
    return (
      <section
        className="immediate-actions glass-quiet"
        aria-labelledby="immediate-actions-title"
      >
        <h3 id="immediate-actions-title" className="panel-heading">
          BEFORE YOU LEAVE
        </h3>
        <p className="panel-muted">No additional actions generated.</p>
      </section>
    );
  }

  return (
    <section
      className="immediate-actions glass-quiet"
      aria-labelledby="immediate-actions-title"
    >
      <h3 id="immediate-actions-title" className="panel-heading">
        BEFORE YOU LEAVE
      </h3>
      <ol className="immediate-actions__primary">
        {primary.map((action, index) => (
          <li key={`${index}-${action}`} className="immediate-actions__card">
            <span className="immediate-actions__index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="immediate-actions__text" title={action}>
              {action}
            </p>
          </li>
        ))}
      </ol>
      {remainder.length > 0 && (
        <details className="immediate-actions__more">
          <summary>{remainder.length} more actions</summary>
          <ol>
            {remainder.map((action, index) => (
              <li key={`${index + 3}-${action}`}>{action}</li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
