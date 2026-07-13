# Coordinator Attention View

AAZHI Phase 10 adds a shore-side coordinator projection over persisted active-trip intelligence.

## Product question

**Which active trips need attention now, and why?**

This is an MVP hypothesis for shore cooperative coordinators, boat-owner coordinators, and organized small fishing operation coordinators. Buyer validation is not claimed.

## Flow

```text
ACTIVE TRIPS
↓
LATEST RISK STATE
↓
VALIDATED PROCESSING TIMELINE
↓
DETERMINISTIC ATTENTION PROJECTION
↓
ATTENTION REQUIRED / WATCH / STABLE
↓
COORDINATOR VIEW
```

## What Coordinator View does

- Loads **ACTIVE** trips from persistent storage
- Reads latest **RiskState** and validated **timeline** per trip
- Derives attention groups deterministically from **RiskPosture**
- Selects **attention basis** from latest attention-relevant processing trace or persisted state
- Orders trips deterministically — no AI ranking
- Renders `/coordinator`

## What Coordinator View does not do

- Does **not** continuously monitor trips
- Does **not** fetch marine data
- Does **not** process `RiskEvent`s
- Does **not** call Gemini
- Does **not** mutate risk state, create snapshots, or append timeline events
- Does **not** provide fleet tracking, GPS, AIS, maps, or notifications

## Manual monitoring notice

> AAZHI is not continuously monitoring these trips. Attention reflects recorded trip state and manually processed updates.

**REFRESH VIEW** reloads `GET /api/risk/coordinator/attention` only. It is not the same as active-trip **CHECK LATEST SEA CONDITIONS**.

## Attention groups

| Group | Postures |
| --- | --- |
| ATTENTION REQUIRED | `OFFICIAL_ALERT_PRIORITY`, `COORDINATOR_REVIEW_REQUIRED`, `REASSESSMENT_REQUIRED` |
| WATCH | `CAUTION` |
| STABLE RECORDED STATE | `BASELINE` |

## Attention basis

| Kind | Meaning |
| --- | --- |
| `PROCESSING_TRACE` | Latest attention-relevant `RISK_EVENT_PROCESSED` trace supplies deltas, reassessment, policy, and interpretation |
| `PERSISTED_STATE` | Current recorded posture requires attention/watch but no later material processing trace established a different basis |

Latest `NO_ACTION_REQUIRED` processing does **not** clear an existing reassessment posture in the coordinator card.

## API

| Route | Method | Response |
| --- | --- | --- |
| `/api/risk/coordinator/attention` | GET | `CoordinatorAttentionDTO` |

## MVP limitations

- No authentication or organizational tenancy boundary
- No coordinator identity or RBAC
- Read projection only — attention state is not persisted separately

## Architecture

- Application: `src/application/coordinator-attention/`
- Server composition: `src/server/risk-intelligence/create-coordinator-attention-service.ts`
- UI: `src/app/coordinator/page.tsx`, `src/components/coordinator/`
