import type { MarineContext } from "@/lib/types";

interface Props {
  context: MarineContext;
  explanation: string;
}

function reading(value: number | null, unit: string) {
  return value === null ? "Unavailable" : `${value.toFixed(1)} ${unit}`;
}

export function MarineContextCard({ context, explanation }: Props) {
  const checkedDate = new Date(context.checkedAt);
  const checkedAt = Number.isNaN(checkedDate.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(checkedDate);

  return (
    <section className="brief-section marine-panel" aria-labelledby="marine-title">
      <div className="section-heading">
        <p className="eyebrow">VERIFIED EXTERNAL CONTEXT</p>
        <h2 id="marine-title">LIVE MARINE CONTEXT</h2>
      </div>
      <dl className="marine-grid">
        <div>
          <dt>Wave height</dt>
          <dd>{reading(context.waveHeight, "m")}</dd>
        </div>
        <div>
          <dt>Wave period</dt>
          <dd>{reading(context.wavePeriod, "s")}</dd>
        </div>
        <div>
          <dt>Wind-wave height</dt>
          <dd>{reading(context.windWaveHeight, "m")}</dd>
        </div>
        <div>
          <dt>Swell-wave height</dt>
          <dd>{reading(context.swellWaveHeight, "m")}</dd>
        </div>
      </dl>
      <p className="marine-explanation">{explanation}</p>
      <div className="source-line">
        <span>Source: {context.source}</span>
        <span>Checked: {checkedAt}</span>
      </div>
    </section>
  );
}
