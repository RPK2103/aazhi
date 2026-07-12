export function DormantAssessmentState() {
  const signals = ["ENVIRONMENT", "VESSEL", "TRIP"] as const;

  return (
    <div className="dormant-assessment" aria-label="Assessment awaiting observations">
      <p className="dormant-assessment__copy">
        Your observations shape the assessment.
      </p>
      <div className="dormant-assessment__signals">
        {signals.map((signal) => (
          <div key={signal} className="dormant-assessment__signal">
            <svg
              className="dormant-assessment__arc"
              viewBox="0 0 80 80"
              aria-hidden="true"
            >
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="80 120"
                strokeLinecap="round"
              />
            </svg>
            <span className="dormant-assessment__label">{signal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
