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

## AI Boundary Evaluation (Phase 4)

Phase 4 evaluates whether deterministic facts reach the AI boundary correctly. It does **not** claim natural-language interpretation quality or field accuracy. No LLM-as-judge system exists. No real Gemini calls occur during evaluation.

Metrics are computed by `evaluateInterpreterBoundary` in `src/evals/ai/`:

| Metric | Definition |
| --- | --- |
| Interpreter eligibility count | Scenarios where `shouldInvokeRiskInterpreter` returns true |
| Interpreter skip count | Scenarios where it returns false |
| Input construction success rate | Eligible scenarios with valid `RiskInterpretationInput` |
| Active concern input accuracy | Eligible scenarios where input active concerns match current state |
| Delta preservation rate | Eligible scenarios where input deltas match `calculateRiskDeltas` output |
| Reassessment decision preservation rate | Eligible scenarios where input decision matches `evaluateReassessmentNeed` |

### Phase 4 calculated results (initial 15-scenario suite)

| Metric | Value |
| --- | --- |
| Interpreter eligibility count | 4 |
| Interpreter skip count | 11 |
| Input construction success rate | 1 |
| Active concern input accuracy | 1 |
| Delta preservation rate | 1 |
| Reassessment decision preservation rate | 1 |

Eligible scenarios: S003, S004, S008, S009.

## Operational Policy Evaluation

Phase 5 evaluates deterministic operational policy behaviour. Gemini is not invoked. Policy does not use AI natural-language fields.

Metrics are computed by `evaluateOperationalPolicySuite` in `src/evals/policy/`:

| Metric | Definition |
| --- | --- |
| Policy action exact-match rate | Fraction of scenarios where deterministic policy action matches `expectedOperationalAction` |
| Policy violation rate | Fraction of synthetic candidate-validation fixtures rejected by policy validator |
| Unsupported action rejection count | Candidates rejected with `UNSUPPORTED_ACTION` |
| Action policy mismatch count | Supported candidates rejected with `ACTION_POLICY_MISMATCH` |
| Policy fallback correctness rate | Fraction of invalid validation cases where `fallbackAction` equals deterministic expected action |

### Synthetic validation cases

Six deterministic candidate-validation fixtures (CASE 1–6) test valid acceptance, unsupported rejection, and policy mismatch detection. Candidates are synthetic — not Gemini output.

### Capability-gap scenario semantics

`NO_ACTION_REQUIRED` means no action is required by **current represented AAZHI state-change logic**. It does **not** mean the vessel, trip, or environmental conditions are safe.

- S011 and S012 remain `NO_ACTION_REQUIRED` under current semantics (`CHECK_IN_EVENT_NOT_YET_MODELLED`).
- S014 remains `NO_ACTION_REQUIRED` (`OFFICIAL_ALERT_STATE_NOT_YET_MODELLED` — do not fabricate `OFFICIAL_ALERT_PRIORITY`).

### Phase 5 calculated results (initial 15-scenario suite)

| Metric | Value |
| --- | --- |
| Policy action exact-match rate | 1 |
| Policy violation rate | 0.5 (3 of 6 synthetic validation fixtures intentionally invalid) |
| Unsupported action rejection count | 1 |
| Action policy mismatch count | 2 |
| Policy fallback correctness rate | 1 |

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
