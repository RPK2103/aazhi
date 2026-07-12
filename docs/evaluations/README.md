# AAZHI Evaluation Scenarios

Operational scenarios for evaluating AAZHI deterministic product behaviour. These are **synthetic** fixtures — field validation is not claimed.

## Purpose

AAZHI must be evaluated using operational scenarios, not only unit tests or LLM output snapshots. Each scenario represents:

- **Initial risk state**
- **Updated risk state**
- **Expected deterministic deltas**
- **Expected reassessment behaviour**

The evaluation harness (`src/evals/`) executes scenarios against the real Phase 2 domain functions (`calculateRiskDeltas`, `evaluateReassessmentNeed`) and compares actual outputs to declared expectations.

## Deterministic Evaluation (Phase 3)

Phase 3 evaluates deterministic product behaviour only. Gemini is not invoked. Metrics measure **conformance to synthetic scenarios**, not real-world safety accuracy, accident prediction, or maritime outcomes.

## Golden Scenarios

| ID | Description |
| --- | --- |
| S003 | Unresolved `ENGINE_RELIABILITY` concern with worsening wave and wind conditions — primary golden scenario |

See [S003-unresolved-engine-worsening-marine-conditions.md](./S003-unresolved-engine-worsening-marine-conditions.md) for full expected outputs.

## Capability-Gap Scenarios

Some scenarios document product boundaries not yet represented in `RiskState`. These scenarios **pass** under current semantics but expose known gaps:

| Gap | Scenarios |
| --- | --- |
| `TRIP_DURATION_NOT_YET_COMPARED` | S006 |
| `CHECK_IN_EVENT_NOT_YET_MODELLED` | S010, S011, S012 |
| `OFFICIAL_ALERT_STATE_NOT_YET_MODELLED` | S014 |

Capability gaps do not fail scenarios automatically. They are aggregated in suite metrics to make evaluation boundaries visible.

## Later AI Interpretation Evaluation

Gemini evaluation (Risk Interpreter) is planned for a later phase. Phase 3 establishes the deterministic baseline that future AI interpretation must respect.

## Initial Scenario Suite (S001–S015)

| ID | One-line description |
| --- | --- |
| S001 | Stable sea, no concerns — zero deltas, no reassessment |
| S002 | Stable sea with persistent OPEN engine concern — no repeated reassessment |
| S003 | Wave increase + active engine concern — golden reassessment scenario |
| S004 | Wave increase, no concern — material environmental change only |
| S005 | Communication concern on short trip — concern retained, no reassessment |
| S006 | Communication concern on long trip — documents trip-duration capability gap |
| S007 | Unresolved concern carried forward — active concern representation |
| S008 | Concern resolved OPEN→RESOLVED — CONCERN_CLOSED, reassessment required |
| S009 | Resolution reported OPEN→RESOLUTION_REPORTED — concern remains active |
| S010 | Normal check-in placeholder — check-in not yet modelled |
| S011 | Missed check-in placeholder — check-in not yet modelled |
| S012 | Missed check-in + communication concern — future regression target |
| S013 | Version-only state change — irrelevant field does not trigger reassessment |
| S014 | Official alert placeholder — alert state not yet modelled |
| S015 | Identical risk state — zero deltas, no reassessment |

## Running Evaluations

Scenarios are executed via Vitest tests in `src/evals/evals.test.ts` and programmatically through:

```typescript
import { evaluateRiskScenarioSuite, INITIAL_RISK_SCENARIOS } from "@/evals";

const suite = evaluateRiskScenarioSuite(INITIAL_RISK_SCENARIOS);
```

## Limitations

- Scenarios use deterministic synthetic timestamps and stable IDs.
- No external provider calls are made during evaluation.
- Scenario conformance does not imply real-world safety accuracy or field effectiveness.
