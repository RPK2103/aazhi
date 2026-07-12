# Golden Scenario S003 — Unresolved Engine + Worsening Marine Conditions

**Scenario ID:** S003  
**Vessel:** TN-04  
**Type:** Synthetic operational scenario (not field-validated)

## Purpose

Golden deterministic product scenario for Phase 2/3 evaluation. Tests whether AAZHI detects material marine change while preserving an active engine concern and triggers reassessment with the correct bounded reason and trigger concepts.

## Initial Risk State

- **Vessel concern:** `ENGINE_RELIABILITY` / `OPEN`
- **Marine:** wave height `0.8 m`, wind speed `13 km/h`
- **Posture:** `CAUTION` (unchanged across snapshots)

## Updated Risk State

- **Vessel concern:** same ID, `ENGINE_RELIABILITY` / `OPEN` (unchanged)
- **Marine:** wave height `1.5 m`, wind speed `18 km/h`
- **Posture:** `CAUTION` (unchanged)

## Expected Deterministic Outputs

| Check | Expected |
| --- | --- |
| Wave delta | `+0.7 m`, `reassessmentRelevant: true` |
| Wind delta | `+5 km/h`, `reassessmentRelevant: false` |
| Concern delta | None (unchanged `OPEN`) |
| Active concern | `ENGINE_RELIABILITY` |
| Reassessment | `required: true` |
| Reason | `MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN` |
| Trigger concepts | `ENGINE_RELIABILITY`, `WAVE_CONDITIONS` |

## Evaluation Notes

- Gemini is not invoked in Phase 2 or Phase 3 deterministic evaluation.
- Posture is not mutated by the delta engine.
- Wind change is detected but below the `10 km/h` reassessment sensitivity threshold.
- Wave change exceeds the `0.5 m` reassessment sensitivity threshold.

## Harness Reference

Implemented as `S003_ENGINE_WAVE_DETERIORATION` in `src/evals/scenarios/S003-engine-wave-deterioration.ts`.
