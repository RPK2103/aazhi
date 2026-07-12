"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "OBSERVATION",
  "MARINE CONTEXT",
  "SIGNAL CHECK",
  "ASSESSMENT",
] as const;

export function AssessingState() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) =>
        current < STAGES.length - 1 ? current + 1 : current,
      );
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="assessing-state" aria-live="polite" aria-busy="true">
      <p className="assessing-state__heading">Reconciling context</p>
      <ol className="assessing-state__stages">
        {STAGES.map((stage, index) => (
          <li
            key={stage}
            className={
              index <= activeIndex
                ? "assessing-state__stage is-active"
                : "assessing-state__stage"
            }
          >
            {stage}
          </li>
        ))}
      </ol>
    </div>
  );
}
