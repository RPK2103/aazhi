# Active Trip Workflow

AAZHI connects pre-departure assessment to persisted active-trip risk intelligence.

## Lifecycle

```text
ASSESSMENT
↓
CONFIRM CONCERN (client-only until trip start)
↓
RECORD TRIP START
↓
INITIAL RISK STATE (version 1)
↓
ACTIVE TRIP WORKSPACE
↓
CHECK LATEST SEA CONDITIONS (manual)
↓
MARINE_STATE_UPDATED
↓
RISK ORCHESTRATOR (processRiskEvent)
↓
UPDATED ACTIVE TRIP
```

## Manual monitoring

**Check latest sea conditions** is a manual request initiated by the user.

AAZHI does **not** continuously monitor the trip. The active trip workspace displays:

> Manual update — AAZHI is not continuously monitoring this trip.

## Concern confirmation

The user may confirm one operational concern to carry forward. Confirmation is stored in client workflow state only until **RECORD TRIP START**.

`POST /api/risk/trips/start` is the sole persistence point for newly confirmed concerns.

Gemini assessment blockers are never auto-persisted.

## Device-local continuity (MVP)

| Key | Purpose |
| --- | --- |
| `aazhi:vessel-id` | Opaque vessel reference for repeat trips |
| `aazhi:active-trip-id` | Restore active trip workspace on reload |

Risk state, marine values, and AI interpretation are **not** stored in `localStorage`.

## Marine reference location

Each trip stores a marine forecast reference location (`latitude`, `longitude`, `label`).

This is the forecast reference point for manual marine checks — not live vessel tracking, AIS, or GPS.

## APIs

| Route | Purpose |
| --- | --- |
| `POST /api/risk/trips/start` | Record trip start + initial risk state |
| `GET /api/risk/trips/[tripId]` | Read active trip DTO |
| `POST /api/risk/trips/[tripId]/refresh-marine` | Manual marine refresh + orchestration |

## Architecture boundary

- UI calls narrow API routes only
- Server composes Prisma persistence, marine provider, `processRiskEvent`, selective Gemini Risk Interpreter, and curated safety corpus
- UI displays deterministic posture, action state, deltas, and grounded explanation separately
