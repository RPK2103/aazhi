# AAZHI Contextual Risk Intelligence Baseline

Phase 0 re-baseline of the repository after the immersive React Three Fiber / Three.js ocean redesign. This document describes the **current** architecture only. No Contextual Risk Intelligence product capability was implemented in this phase.

**Inspection branch:** `feat/contextual-risk-intelligence`  
**Product thesis (future):** Forecasts describe the environment. AAZHI maintains the operational risk state of a trip and explains when that state materially changes.  
**Current product reality:** Stateless pre-departure multimodal assessment. Each request fetches marine context, invokes Gemini, and returns a one-shot readiness brief. No risk state is retained across assessments, refreshes, trips, or days.

**Note on layout:** There is no `src/types` directory. Domain types live in `src/lib/types.ts`. There is no Prisma, database client, or persistence layer.

---

## Current Architecture

### Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript |
| AI provider | `@google/genai` → Gemini (`gemini-3.1-flash-lite`) |
| Marine data | Open-Meteo Marine Forecast API |
| Validation | Zod |
| 3D UI | `@react-three/fiber`, `three`, `motion` |
| Tests | Vitest + `@vitest/coverage-v8` |

### Source layout (post-redesign)

```text
src/
  app/
    page.tsx                          # mounts AazhiPage
    layout.tsx
    api/assess/route.ts               # sole assessment API
  components/
    aazhi-page.tsx                    # page shell: ocean + brand + workspace
    fisher-intake.tsx                 # LEGACY — not mounted by current page
    assessment-result.tsx             # LEGACY — used only by fisher-intake
    brand/persistent-brand.tsx        # visual brand chrome (not data persistence)
    hero/                             # surface descent UI
    ocean/                            # R3F scene (presentation only)
    workspace/                        # decision workspace + result dashboard
  hooks/
    use-assessment-workflow.ts        # form state, media, POST /api/assess
    use-descent-scroll.ts             # scroll/depth animation
    use-client-date.ts
    use-page-visibility.ts
    use-ocean-capabilities.ts
  lib/
    types.ts                          # domain enums + interfaces
    validation.ts                     # request + AI output Zod schemas
    locations.ts                      # coastal location registry
    marine.ts                         # Open-Meteo fetch + normalize
    marine-display.ts                 # UI-only metric bar normalization
    gemini.ts                         # Gemini boundary
    posture-display.ts                # posture ring copy/progress
    status-colors.ts                  # posture/blocker tone mapping
```

### Architectural character

- **Request-scoped orchestration** in `POST` (`src/app/api/assess/route.ts`).
- **Clear provider boundaries** for Gemini (`src/lib/gemini.ts`) and marine data (`src/lib/marine.ts`).
- **UI redesign** changed presentation and intake composition; the assessment API contract and Gemini/marine boundaries remain the core product path.
- **Legacy intake** (`FisherIntake` / `AssessmentResult`) still exists on disk but is **not** wired into `src/app/page.tsx`.

---

## Assessment Request Flow

Exact current file-by-file path from UI input to rendered output:

```text
src/app/page.tsx
  → Home()
  → src/components/aazhi-page.tsx :: AazhiPage()
       uses useAssessmentWorkflow()
       renders DecisionWorkspace({ workflow })

src/components/workspace/decision-workspace.tsx :: DecisionWorkspace
  → ObservationPanel({ workflow })     # intake form
  → AssessmentWorkspace(...)           # dormant / assessing / result

src/components/workspace/observation-panel.tsx :: ObservationPanel
  → form onSubmit → workflow.handleSubmit

src/hooks/use-assessment-workflow.ts :: handleSubmit
  → client checks typedObservation || audioFile
  → builds FormData (location, boatType, crewCount, tripDuration, language,
                     typedObservation, optional audio/image)
  → fetch("POST", "/api/assess")
  → shallow isAssessmentResponse() guard
  → setResult(AssessmentResponse)

src/app/api/assess/route.ts :: POST
  → assessmentInputSchema.parse(...)           # src/lib/validation.ts
  → validateUpload(...) → validateUploadMetadata()
  → hasFieldObservation(...)
  → getLocation(input.location)                # src/lib/locations.ts
  → fetchMarineContext(lat, lon)               # src/lib/marine.ts
  → toInlineData(audio/image) → base64
  → generateAssessment({...})                  # src/lib/gemini.ts
  → NextResponse.json({ assessment, marineContext })

src/lib/gemini.ts :: generateAssessment
  → builds SYSTEM_INSTRUCTION + user factual/marine JSON parts
  → GoogleGenAI.models.generateContent (structured JSON schema)
  → parseAssessmentResponse → aazhiAssessmentSchema.safeParse
  → returns AazhiAssessment

UI render path for success:
  AssessmentWorkspace
  → AssessmentDashboard({ result, submittedContext })
       → PostureInstrument / CriticalSignals / MarineConditionsPanel
       → ImmediateActionsPanel / TripContextPanel
       → additional guidance lists from assessment fields
```

### Primary exports involved

| Stage | File | Export |
| --- | --- | --- |
| Page | `src/app/page.tsx` | `Home` (default) |
| Shell | `src/components/aazhi-page.tsx` | `AazhiPage` |
| Workflow | `src/hooks/use-assessment-workflow.ts` | `useAssessmentWorkflow`, `SubmittedContext` |
| Intake UI | `src/components/workspace/observation-panel.tsx` | `ObservationPanel` |
| Workspace | `src/components/workspace/decision-workspace.tsx` | `DecisionWorkspace` |
| Result host | `src/components/workspace/assessment-workspace.tsx` | `AssessmentWorkspace` |
| Result UI | `src/components/workspace/assessment-dashboard.tsx` | `AssessmentDashboard` |
| API | `src/app/api/assess/route.ts` | `POST` |
| Validation | `src/lib/validation.ts` | `assessmentInputSchema`, `validateUploadMetadata`, `hasFieldObservation`, `aazhiAssessmentSchema` |
| Locations | `src/lib/locations.ts` | `getLocation`, `COASTAL_LOCATIONS` |
| Marine | `src/lib/marine.ts` | `fetchMarineContext`, `normalizeMarineResponse` |
| Gemini | `src/lib/gemini.ts` | `generateAssessment`, `parseAssessmentResponse` |

---

## Current Domain Types

All major assessment-related types (exact names and files):

| Name | File | Responsibility |
| --- | --- | --- |
| `ACTION_POSTURES` | `src/lib/types.ts` | Canonical departure posture enum values |
| `URGENCY_LEVELS` | `src/lib/types.ts` | Canonical urgency enum values |
| `PRIORITY_LEVELS` | `src/lib/types.ts` | Departure blocker priority enum |
| `LANGUAGES` | `src/lib/types.ts` | Output language enum (`English` \| `Tamil`) |
| `BOAT_TYPES` | `src/lib/types.ts` | Allowed vessel type strings |
| `MarineContext` | `src/lib/types.ts` | Normalized marine readings returned with assessment |
| `DepartureBlocker` | `src/lib/types.ts` | AI-identified blocker title/reason/priority |
| `AazhiAssessment` | `src/lib/types.ts` | Full structured Gemini assessment payload |
| `AssessmentResponse` | `src/lib/types.ts` | API response: `{ assessment, marineContext }` |
| `LocationId` | `src/lib/locations.ts` | Union of coastal location IDs |
| `MarineApiResponse` | `src/lib/marine.ts` | Raw Open-Meteo response shape used before normalize |
| `MarineContextError` | `src/lib/marine.ts` | Typed marine provider failure |
| `GenerateAssessmentInput` | `src/lib/gemini.ts` (non-exported) | Internal Gemini call input (trip + marine + media) |
| `AssessmentMedia` | `src/lib/gemini.ts` (non-exported) | Base64 + MIME for audio/image inline parts |
| `AssessmentGenerationError` | `src/lib/gemini.ts` | Typed Gemini/assessment failure |
| `AssessmentResponseParseResult` | `src/lib/gemini.ts` | Parse/Zod outcome for structured AI text |
| `SubmittedContext` | `src/hooks/use-assessment-workflow.ts` | Client snapshot of submitted trip/observation metadata for result UI |
| `PostureDisplay` | `src/lib/posture-display.ts` | Presentation split of posture into ring lines/progress |
| `StatusTone` | `src/lib/status-colors.ts` | Visual tone for posture/blocker coloring |
| `MarineMetricKey` | `src/lib/marine-display.ts` | Keys for UI micro-bar normalization |
| `UploadKind` | `src/lib/validation.ts` | `"audio"` \| `"image"` upload kind |

### How contexts map today

- **Assessment request:** multipart form fields validated by `assessmentInputSchema` (+ uploads).
- **Trip context:** `boatType`, `crewCount`, `tripDuration`, `language`, `location` → passed into Gemini as factual JSON; also mirrored client-side as `SubmittedContext`.
- **Vessel context:** only `boatType` (no vessel ID, concern history, or equipment inventory).
- **Marine conditions:** `MarineContext` after `normalizeMarineResponse`.
- **Observations:** `typedObservation` string + optional audio file; image is optional situational context.
- **Images:** validated MIME/size; base64 inline to Gemini; never a substitute for field observation.
- **Gemini input:** `GenerateAssessmentInput` (internal).
- **Assessment response:** `AssessmentResponse`.
- **Action/posture:** `AazhiAssessment.actionPosture` from `ACTION_POSTURES`.
- **Urgency:** `AazhiAssessment.urgency` from `URGENCY_LEVELS`.

There is **no** persisted vessel concern type, risk state type, timeline event type, or marine delta type in the current codebase.

---

## Gemini Boundary

### Provider / library

- Package: `@google/genai`
- Client: `GoogleGenAI`
- Entry function: **`generateAssessment`** in `src/lib/gemini.ts`
- Model constant: **`GEMINI_MODEL = "gemini-3.1-flash-lite"`**

### Model configuration

```text
systemInstruction: SYSTEM_INSTRUCTION
responseMimeType: "application/json"
responseJsonSchema: RESPONSE_JSON_SCHEMA
temperature: 0.2
maxOutputTokens: 3000
```

### Prompt construction

1. Fixed `SYSTEM_INSTRUCTION` (readiness reasoning rules, trust boundaries, bilingual style constraints).
2. User text part containing:
   - `EXTERNAL MARINE CONTEXT` = `JSON.stringify(input.marineContext)` (full normalized object, including `source` / `checkedAt`)
   - `FISHER FIELD CONTEXT` = location, boat, crew, duration, language, typed observation, media attachment flags
3. Optional `inlineData` parts for audio and/or image.

### Structured output mechanism

- Provider-enforced JSON schema via `responseJsonSchema` (`RESPONSE_JSON_SCHEMA` in `gemini.ts`).
- Post-response validation via `parseAssessmentResponse` → `aazhiAssessmentSchema` (Zod) in `validation.ts`.

### Response parsing / schema validation

- `JSON.parse` failure → stage `GEMINI_PARSE` → `AssessmentGenerationError`
- Zod failure → stage `GEMINI_ZOD_VALIDATION` (logged issues/keys) → `AssessmentGenerationError`
- Success → typed `AazhiAssessment`

### Fallback / retry / errors

| Behavior | Current state |
| --- | --- |
| Missing `GEMINI_API_KEY` | Fail immediately with `AssessmentGenerationError` |
| Provider/network failure | Mapped to `AssessmentGenerationError` (502 at route) |
| Malformed / invalid JSON | Same safe error; no partial UI payload |
| Retry | **None** |
| Deterministic fallback assessment | **None** |

Route mapping (`src/app/api/assess/route.ts`): `AssessmentGenerationError` → HTTP **502**.

### Test mocking strategy

- `src/lib/gemini.test.ts` mocks `@google/genai` (`GoogleGenAI` / `generateContent`) — no real provider calls.
- `src/app/api/assess/route.test.ts` mocks `generateAssessment` at the module boundary.
- Coverage include list explicitly targets `src/lib/gemini.ts`.

### Logic Gemini currently owns (future deterministic candidates)

Gemini currently owns essentially all operational judgment:

1. **Action posture selection** (`actionPosture`)
2. **Urgency classification** (`urgency`)
3. **Condition conflict detection** (`conditionConflict.detected` + explanation)
4. **Departure blocker identification** (title/reason/priority)
5. **Immediate / checklist / at-sea / after-return action lists**
6. **Situation summary and “why this matters” narrative**
7. **Marine context explanation** (interpretation of readings vs observations)
8. **Implicit concern prioritization** across vessel, communication, exposure, and local observations

For Contextual Risk Intelligence, items 1–4 (and any numeric marine deltas) are the primary candidates to move into deterministic code. Gemini should later become a **Risk Interpreter** over already-calculated deltas and known concerns — not the owner of delta calculation.

---

## Marine Data Boundary

### Provider

- **Open-Meteo Marine Forecast:** `https://marine-api.open-meteo.com/v1/marine`
- Entry function: **`fetchMarineContext(latitude, longitude)`** in `src/lib/marine.ts`

### Request flow

1. Route resolves location via `getLocation`.
2. `fetchMarineContext(lat, lon)` builds query:
   - `current` + `hourly` fields: `wave_height`, `wave_period`, `wind_wave_height`, `swell_wave_height`
   - `timezone=UTC`, `forecast_days=2`
   - `cache: "no-store"`, `AbortSignal.timeout(8000)`
3. On non-OK or network failure → `MarineContextError` (route → HTTP **503**).
4. On success → `normalizeMarineResponse(data)`.

### Normalization logic

- Prefer finite **current** reading per field; else nearest **hourly** index via `findNearestMarineIndex`.
- Individual missing values stay **`null`** (never coerced to `0` unless provider returns `0`).
- `checkedAt`: provider current/hourly time if parseable, else `now` ISO string.
- `source`: always `"Open-Meteo Marine Forecast"`.

### Types

- Raw: `MarineApiResponse`
- Normalized: `MarineContext` (`waveHeight`, `wavePeriod`, `windWaveHeight`, `swellWaveHeight`, `checkedAt`, `source`)

### Units (UI presentation)

`MarineConditionsPanel` displays:

| Field | Unit shown |
| --- | --- |
| waveHeight | m |
| wavePeriod | s |
| windWaveHeight | m |
| swellWaveHeight | m |

Units are not stored on `MarineContext`; they are assumed Open-Meteo defaults and labeled only in UI.

### Null / missing / timestamp / caching

- Nulls preserved and treated as unknown in Gemini prompt copy (“unavailable … not zero”).
- Timestamps selected by nearest hourly match when current is absent.
- **No application-level cache**; fetch uses `cache: "no-store"`.
- **No previous marine state** is stored for comparison.

### Tests

- `src/lib/marine.test.ts` — unit tests for `findNearestMarineIndex` and `normalizeMarineResponse` (no live HTTP).
- Route tests mock `fetchMarineContext`.
- `src/lib/marine-display.test.ts` — presentation-only bar normalization (not risk scoring).
- **`fetchMarineContext` network path is not directly unit-tested** (mocked at route).

### Safest future extension point for marine state comparison

Do **not** compare inside the Gemini prompt or UI display helpers.

Lowest-risk insertion point:

1. Keep `fetchMarineContext` / `normalizeMarineResponse` as the **current snapshot** producer.
2. Add a pure domain function later (recommended location: `src/domain/risk/delta/`) that accepts:
   - `previous: MarineContext | null`
   - `current: MarineContext`
3. Call that function in a future orchestrator **after** marine fetch and **before** Gemini interpretation.
4. Persist previous snapshot only when Vessel Risk Record / trip state exists (not present today).

`normalizeMarineResponse` already yields a stable, null-safe `MarineContext`, which is the correct comparison unit. `marine-display.ts` must remain presentation-only.

---

## Validation Boundary

All assessment-relevant validation:

| Concern | File | Function / schema |
| --- | --- | --- |
| Request scalars (location, boat, crew, duration, language, typed text) | `src/lib/validation.ts` | `assessmentInputSchema` |
| Field observation required (typed **or** audio) | `src/lib/validation.ts` | `hasFieldObservation` |
| Image / audio MIME + size | `src/lib/validation.ts` | `validateUploadMetadata`, `normalizeMimeType` |
| Upload error mapping in route | `src/app/api/assess/route.ts` | `validateUpload`, `optionalFile` |
| Location existence / coordinates | `src/lib/locations.ts` + route | `getLocation` (after schema enum check) |
| Structured AI output | `src/lib/validation.ts` | `aazhiAssessmentSchema` |
| AI parse orchestration | `src/lib/gemini.ts` | `parseAssessmentResponse` |
| Client image pre-check | `src/hooks/use-assessment-workflow.ts` | `validateUploadMetadata("image", ...)` |
| Client observation pre-check | `src/hooks/use-assessment-workflow.ts` | `typedObservation.trim() \|\| audioFile` |
| Client response shape guard | `src/hooks/use-assessment-workflow.ts` | `isAssessmentResponse` (shallow) |

### Limits (current)

- Typed observation max **1500** chars
- Image max **5 MB**; MIME jpeg/png/webp
- Audio max **8 MB**; MIME webm/ogg/mp4/mpeg/wav/x-wav
- Crew **1–30**; trip duration **>0–72** hours
- Immediate actions max **3**; blockers max **6**; checklist max **5**; at-sea/after-return max **3**

There is no dedicated “trip concern state” validator — concerns are free-text / multimodal and interpreted by Gemini.

---

## Existing Stateful Behaviour

### Inspection summary

| Mechanism | Present? | Used for assessment state? |
| --- | --- | --- |
| React `useState` in `useAssessmentWorkflow` | Yes | In-session form + latest result only |
| `localStorage` / `sessionStorage` | **No** | — |
| IndexedDB | **No** | — |
| Server session / cookies for risk | **No** | — |
| Database / Prisma / ORM | **No** | — |
| File-backed vessel records | **No** | — |
| `PersistentBrand` | Visual chrome only | Not data persistence |

`resetAssessment` clears the in-memory result and form. Refreshing the browser discards all assessment state.

### Conclusion

**STATELESS**

Each assessment is an independent request/response cycle. The product does not preserve risk state, vessel concerns, marine history, or trip timeline across assessments, refreshes, separate trips, or days. In-memory React state exists only for the active browser session until reset or unload.

---

## Test Architecture

### Test files

| File | Protects |
| --- | --- |
| `src/app/api/assess/route.test.ts` | Assessment route orchestration, validation errors, marine/Gemini failure mapping, multipart happy path |
| `src/lib/gemini.test.ts` | `parseAssessmentResponse` + `generateAssessment` provider boundary (mocked `@google/genai`) |
| `src/lib/validation.test.ts` | Input schema, AI output schema, upload metadata, field observation rule |
| `src/lib/marine.test.ts` | Nearest-hour selection + marine normalization / null safety |
| `src/lib/locations.test.ts` | Coastal location registry integrity |
| `src/lib/marine-display.test.ts` | UI-only metric display normalization |

### Suite characteristics

- Environment: Vitest `node` (`vitest.config.ts`)
- Include: `src/**/*.test.ts`
- **No real Gemini or Open-Meteo calls** in unit tests (provider modules mocked)
- Coverage include (core boundaries only):
  - `src/app/api/assess/route.ts`
  - `src/lib/gemini.ts`
  - `src/lib/locations.ts`
  - `src/lib/marine.ts`
  - `src/lib/validation.ts`
- Coverage does **not** include UI components, hooks, ocean scene, or `marine-display.ts`

### Important untested boundaries (current)

- `useAssessmentWorkflow` / ObservationPanel submit path
- Assessment dashboard rendering
- Legacy `FisherIntake` / `AssessmentResult` (orphaned)
- Live `fetchMarineContext` HTTP behavior
- End-to-end browser assessment flow

### Where future Contextual Risk Intelligence tests should live

| Future concern | Recommended home |
| --- | --- |
| Risk domain model | `src/domain/risk/**/*.test.ts` (or colocated under `src/domain/risk/`) |
| Marine delta calculation | `src/domain/risk/delta/**/*.test.ts` |
| Concern state transitions | `src/domain/risk/**/*.test.ts` |
| Reassessment gate | `src/domain/risk/**/*.test.ts` and/or `src/services/risk-orchestrator/**/*.test.ts` |
| Action policy validation | `src/domain/policy/**/*.test.ts` |
| Scenario evaluations | `src/evals/**` (harness + fixtures; keep separate from unit coverage include until stable) |
| Risk interpreter (Gemini) | `src/lib/ai/**/*.test.ts` with provider mocks (same pattern as current `gemini.test.ts`) |

Update `vitest.config.ts` coverage `include` when those modules are introduced.

---

## Coupling Risks

Identified without refactoring:

1. **Gemini owns posture, urgency, conflict detection, and blockers** — all future deterministic Risk Delta / policy concerns are currently LLM judgments inside one prompt.
2. **Route is a linear orchestrator tightly sequenced to Gemini** — `POST` always: validate → marine → Gemini → return; no seam for delta engine / reassessment gate / policy validator yet.
3. **Full `MarineContext` JSON is stringified into the Gemini user prompt** — provider-normalized marine object leaks directly into AI context (including `source` / timestamps), rather than a narrower marine-evidence DTO.
4. **Duplicated posture/urgency/priority enums** — canonical constants in `src/lib/types.ts` are re-declared inside `RESPONSE_JSON_SCHEMA` in `src/lib/gemini.ts` (drift risk).
5. **UI consumes `AazhiAssessment` fields directly** — dashboard/panels bind tightly to Gemini output schema (`actionPosture`, `departureBlockers`, `conditionConflict`, action arrays); no view-model boundary.
6. **Shallow client response guard** — `isAssessmentResponse` only checks a few fields; not aligned with full Zod schema.
7. **Legacy duplicate intake path** — `fisher-intake.tsx` + `assessment-result.tsx` duplicate workflow/result concepts but are unused by the redesigned page (maintenance / drift hazard).
8. **Presentation helpers keyed off AI enums** — `posture-display.ts` / `status-colors.ts` hard-map every `ACTION_POSTURES` value; schema changes ripple into UI chrome.
9. **No vessel/trip identity** — cannot attach concerns or risk state without inventing IDs later; current types are anonymous per request.

---

## Recommended Extension Points

Proposed future paths vs current architecture:

| Proposed path | Fits current layout? | Recommendation |
| --- | --- | --- |
| `src/domain/risk/` | **No conflict** — `src/domain/` does not exist | Create for taxonomy, risk state types, concern transitions, reassessment gate |
| `src/domain/risk/delta/` | No conflict | Pure deterministic marine/concern delta functions; keep free of Next/Gemini imports |
| `src/domain/policy/` | No conflict | Action policy validation over proposed actions + posture |
| `src/lib/ai/` | Soft overlap with `src/lib/gemini.ts` | Introduce as Gemini Risk Interpreter home; migrate/wrap current `gemini.ts` later without changing prompts in Phase 0 |
| `src/data/safety/` | No conflict | Grounded safety retrieval corpora/fixtures |
| `src/evals/` | No conflict | Scenario evaluation harness + golden fixtures |
| `src/services/risk-orchestrator/` | No conflict | EVENT → load state → delta → gate → retrieve → interpret → policy → update → timeline |

### Lowest-risk integration order (for later phases; not implemented now)

1. Add domain types under `src/domain/risk/` **without** changing the API response contract.
2. Insert orchestrator behind `POST /api/assess` (or a new route) while keeping `fetchMarineContext` and a narrowed AI interpreter boundary.
3. Keep UI on `AssessmentResponse` until a stable risk-state DTO exists; then introduce an adapter.

**Do not** place deterministic delta logic inside `src/lib/gemini.ts` or UI components.

---

## Phase 1 Domain Foundation

Phase 1 adds a pure TypeScript risk domain boundary under `src/domain/risk/`. It does **not** change assessment behaviour, Gemini prompts/schemas, the assess API, marine fetch, `AazhiAssessment`, or the UI.

### New boundary: `src/domain/risk/`

| File | Responsibility |
| --- | --- |
| `risk-concepts.ts` | Bounded `RISK_CONCEPTS` tuple + `RiskConcept` union + `isRiskConcept` |
| `concern.ts` | `ConcernStatus`, `VesselConcern`, `canTransitionConcernStatus`, `isActiveConcern` |
| `marine-risk-state.ts` | `MarineRiskState` normalized snapshot (`number \| null` measurements) |
| `trip-context.ts` | `TripContext` + `TripStatus` |
| `risk-posture.ts` | Active-trip `RiskPosture` and separate `DeparturePosture` |
| `risk-state.ts` | Complete `RiskState` + `isValidRiskStateVersion` |
| `index.ts` | Public barrel export (`@/domain/risk`) |

No `src/domain/risk/delta/` yet (Phase 2). Domain modules must not import GenAI, React, Next.js, API route types, or UI.

### Bounded RiskConcept vocabulary

Exactly eleven concepts: `ENGINE_RELIABILITY`, `HULL_INTEGRITY`, `VESSEL_STABILITY`, `PRIMARY_COMMUNICATION`, `COMMUNICATION_REDUNDANCY`, `SAFETY_EQUIPMENT`, `WAVE_CONDITIONS`, `WIND_CONDITIONS`, `OFFICIAL_ALERT`, `TRIP_DURATION`, `CHECK_IN_STATUS`. Free strings are not allowed.

### Concern lifecycle semantics

Statuses: `OPEN`, `RESOLUTION_REPORTED`, `RESOLVED`, `DISMISSED`.

- `RESOLUTION_REPORTED` ≠ `RESOLVED` (claimed fix is not confirmed resolution).
- Active concerns: `OPEN` and `RESOLUTION_REPORTED`.
- Inactive: `RESOLVED` and `DISMISSED`.
- Transitions are pure and deterministic via `canTransitionConcernStatus` (same-state allowed as idempotent).

### Active-trip RiskPosture vs DeparturePosture

- **RiskPosture** (operational trip state): `BASELINE`, `CAUTION`, `REASSESSMENT_REQUIRED`, `COORDINATOR_REVIEW_REQUIRED`, `OFFICIAL_ALERT_PRIORITY`.
- **DeparturePosture** (future departure decisions): `DEPARTURE_HOLD`, `PRE_DEPARTURE_ACTION_REQUIRED`, `DELAY_AND_REASSESS`, `CAUTION`.
- Legacy assessment postures remain in `src/lib/types.ts` (`ACTION_POSTURES` / `AazhiAssessment.actionPosture`) and are intentionally unchanged.

### MarineRiskState normalization contract

Fields: `waveHeightM`, `wavePeriodS`, `windSpeedKmh`, `windDirectionDeg` as `number | null`; `capturedAt` as ISO string. Missing provider values stay `null` (never coerced to `0`). No deltas, thresholds, or scores in Phase 1.

### Existing assessment behaviour

Intentionally unchanged: `generateAssessment`, `fetchMarineContext`, `POST /api/assess`, Gemini `RESPONSE_JSON_SCHEMA`, and UI binding to `AazhiAssessment` remain as in Phase 0.

---

## Phase 2 Deterministic Risk Delta Engine

Phase 2 adds a pure deterministic comparison layer under `src/domain/risk/delta/`. It answers **what changed** between two `RiskState` snapshots. It does **not** answer whether the sea is safe, whether the vessel should return, interpret changes in natural language, invoke Gemini, mutate risk posture, or persist state.

Architecture rule preserved: **deterministic systems detect; AI interprets; policy bounds the action.**

### Delta engine boundary

| File | Responsibility |
| --- | --- |
| `delta-types.ts` | Bounded `RiskDeltaType`, `MarineMeasurement`, and `RiskDelta` model |
| `reassessment-sensitivity.ts` | `DEFAULT_REASSESSMENT_SENSITIVITY` — contextual reconsideration thresholds, not safety limits |
| `marine-delta.ts` | Pure marine measurement comparison (`waveHeightM`, `wavePeriodS`, `windSpeedKmh`, `windDirectionDeg`) |
| `concern-delta.ts` | Concern lifecycle comparison by stable concern ID |
| `delta-engine.ts` | `calculateRiskDeltas(previous, current)` — combines marine + concern deltas |
| `reassessment-gate.ts` | `evaluateReassessmentNeed(deltas, activeConcerns)` — deterministic reassessment gate |
| `index.ts` | Public barrel export via `@/domain/risk` |

No imports from GenAI, React, Next.js, API routes, or UI. Gemini remains uninvolved.

### Marine measurement comparison

- Maps `waveHeightM` / `wavePeriodS` → `WAVE_CONDITIONS`; `windSpeedKmh` / `windDirectionDeg` → `WIND_CONDITIONS`.
- Handles `number → number`, `null → number`, `number → null`, and `null → null` (last produces no aggregate delta).
- Numeric signed change = `current − previous`; absolute change = `abs(signed)`.
- Floating-point results are normalized (e.g. `0.8 → 1.5` yields `0.7`, not `0.7000000000000001`).
- Wind direction uses shortest angular distance (e.g. `350° → 10°` = `20°`, not `-340°`). No wind-direction reassessment sensitivity is configured in Phase 2.

### Concern comparison

- Compares concerns by stable ID across `previous.activeConcerns` and `current.activeConcerns`.
- Detects `CONCERN_OPENED`, `CONCERN_STATUS_CHANGED`, `CONCERN_CLOSED`; omits `CONCERN_UNCHANGED` from aggregate output.
- Reuses `isActiveConcern` for lifecycle semantics; does not mutate concern objects.

### Reassessment sensitivity vs safety threshold

`DEFAULT_REASSESSMENT_SENSITIVITY`:

| Measurement | Threshold | Meaning |
| --- | --- | --- |
| Wave height | `0.5 m` absolute change | Large enough for contextual reconsideration |
| Wind speed | `10 km/h` absolute change | Large enough for contextual reconsideration |

These are **not** maritime danger thresholds, official safety limits, or departure limits. `reassessmentRelevant` on each `RiskDelta` marks whether the change meets this product sensitivity — not whether conditions are unsafe.

### Aggregate delta semantics

`calculateRiskDeltas` returns **meaningful changes only**. `VALUE_UNCHANGED` and `CONCERN_UNCHANGED` exist in the vocabulary for focused helpers but do not appear in the aggregate result. Identical risk states return `[]`.

Output order: marine measurement deltas in fixed order (`WAVE_HEIGHT_M`, `WAVE_PERIOD_S`, `WIND_SPEED_KMH`, `WIND_DIRECTION_DEG`), then concern deltas sorted by concern ID.

### Deterministic reassessment gate

`evaluateReassessmentNeed(deltas, currentActiveConcerns)` returns `{ required, reason, triggerConcepts }`.

Bounded `ReassessmentReason` values: `NO_MATERIAL_CHANGE`, `MATERIAL_ENVIRONMENTAL_CHANGE`, `MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN`, `CONCERN_STATE_CHANGED`, `OFFICIAL_ALERT_CHANGED` (vocabulary reserved for a future authoritative alert state; no `OFFICIAL_ALERT` delta is synthesized in Phase 2).

### Reassessment reason precedence

When multiple reasons apply, highest precedence wins:

1. `OFFICIAL_ALERT_CHANGED`
2. `MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN`
3. `CONCERN_STATE_CHANGED`
4. `MATERIAL_ENVIRONMENTAL_CHANGE`
5. `NO_MATERIAL_CHANGE`

`triggerConcepts` includes reassessment-relevant environmental concepts and, for the active-concern interaction case, concepts of current active concerns. Concepts are deduplicated and ordered by `RISK_CONCEPTS` vocabulary order.

### S003 deterministic result (golden scenario)

Scenario: vessel TN-04, `ENGINE_RELIABILITY` concern `OPEN`, marine worsening `0.8 → 1.5 m` waves and `13 → 18 km/h` wind, posture remains `CAUTION`.

| Check | Result |
| --- | --- |
| Wave delta | `+0.7 m`, `reassessmentRelevant: true` |
| Wind delta | `+5 km/h`, `reassessmentRelevant: false` (below 10 km/h sensitivity) |
| Concern delta | None (unchanged `OPEN`) |
| Reassessment | `required: true` |
| Reason | `MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN` |
| Trigger concepts | `ENGINE_RELIABILITY`, `WAVE_CONDITIONS` |
| Gemini | Not invoked |
| Posture mutation | None |

---

## Phase 3 Scenario Evaluation Harness

Phase 3 adds a typed scenario-based evaluation harness under `src/evals/`. It evaluates **deterministic product behaviour** against synthetic operational scenarios. Gemini is not evaluated in this phase.

### Purpose

The harness answers product-level questions for each scenario:

- Did AAZHI detect the expected change?
- Did it preserve the expected operational concern?
- Did it trigger reassessment when expected?
- Did it avoid reassessment for irrelevant or insufficient changes?
- Did it produce the expected bounded trigger concepts?

Scenario conformance measures alignment with **declared synthetic expectations**, not real-world safety accuracy, accident prediction, or field effectiveness.

### Harness structure

| File / area | Responsibility |
| --- | --- |
| `eval-types.ts` | `RiskScenario`, expectations, evaluation results, capability-gap vocabulary |
| `evaluate-scenario.ts` | `evaluateRiskScenario` — calls real `calculateRiskDeltas` and `evaluateReassessmentNeed` |
| `evaluate-suite.ts` | `evaluateRiskScenarioSuite` — runs multiple scenarios |
| `metrics.ts` | Aggregate deterministic metrics and `formatScenarioSuiteReport` |
| `fixtures/` | Deterministic `RiskState` factory helpers (no business-logic duplication) |
| `scenarios/` | 15 declarative synthetic scenario fixtures |
| `evals.test.ts` | Harness and suite verification via Vitest |

### Initial scenario suite

**15 synthetic scenarios** (S001–S015), importable as `INITIAL_RISK_SCENARIOS` from `@/evals`. See `docs/evaluations/README.md` for one-line descriptions.

### Deterministic metrics

| Metric | Definition |
| --- | --- |
| Reassessment expectation accuracy | Fraction of scenarios where actual `required` matches expected |
| Reassessment reason accuracy | Fraction where actual bounded reason matches expected |
| Trigger concept exact match rate | Fraction where trigger concepts exactly match after vocabulary-order normalization |
| Active concern carry-forward accuracy | Fraction of scenarios with expected active-concern concepts that match |
| False escalation count | Scenarios expected `required: false` but actual `true` |
| Missed reassessment count | Scenarios expected `required: true` but actual `false` |

`scenarioPassRate` is reported as a fraction from 0 to 1 (e.g. 15/15 → `1`).

### Known capability gaps exposed

Scenarios document boundaries not yet modelled in `RiskState`:

| Gap | Scenarios |
| --- | --- |
| `TRIP_DURATION_NOT_YET_COMPARED` | S006 |
| `CHECK_IN_EVENT_NOT_YET_MODELLED` | S010, S011, S012 |
| `OFFICIAL_ALERT_STATE_NOT_YET_MODELLED` | S014 |

Capability gaps are surfaced in suite metrics (`scenariosWithKnownCapabilityGaps`, `knownCapabilityGapCounts`) and do not automatically fail scenarios.

### S003 golden scenario result

| Check | Result |
| --- | --- |
| Wave delta | `+0.7 m`, `reassessmentRelevant: true` |
| Wind delta | `+5 km/h`, `reassessmentRelevant: false` |
| Active concern | `ENGINE_RELIABILITY` / `OPEN` |
| Reassessment | `required: true` |
| Reason | `MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN` |
| Trigger concepts | `ENGINE_RELIABILITY`, `WAVE_CONDITIONS` |

### Gemini and external calls

- The evaluation harness does **not** import or invoke Gemini.
- All evaluation is offline; no external provider calls.

### Synthetic limitation

These metrics measure conformance to synthetic deterministic product scenarios. They do **not** measure accident prediction, vessel safety, maritime safety outcomes, or field effectiveness.

---

## Phase 4 AAZHI Risk Interpreter

Phase 4 adds a constrained AI interpretation boundary under `src/lib/ai/`. It implements **AI INTERPRETS** only — deterministic detection (Phase 2) and policy (Phase 5) remain separate.

### AI interpretation boundary

The Risk Interpreter is **not** a chatbot. It receives already-calculated deterministic risk context and explains the interaction between:

- calculated risk deltas
- active operational concerns
- trip context
- the deterministic reassessment decision

It must **not** calculate marine deltas, decide reassessment, modify risk posture, invent concerns or measurements, resolve concerns, provide navigation instructions, issue maritime clearance, or declare a vessel safe or unsafe.

### Selective model invocation

`shouldInvokeRiskInterpreter` returns `true` only when `reassessmentDecision.required === true`. Scenarios with `NO_MATERIAL_CHANGE` (e.g. S001, S015) skip interpreter invocation entirely. No probabilistic invocation logic exists.

### Interpreter input contract

`buildRiskInterpretationInput(currentRiskState, calculatedDeltas, reassessmentDecision)` produces `RiskInterpretationInput` containing:

- `tripContext` — preserved from current state
- `activeConcerns` — filtered via domain `isActiveConcern` (OPEN and RESOLUTION_REPORTED only)
- `calculatedDeltas` — preserved exactly from `calculateRiskDeltas` output
- `reassessmentDecision` — preserved exactly from `evaluateReassessmentNeed` output

The input intentionally excludes previous/current `RiskState` snapshots, raw Open-Meteo JSON, full `MarineContext`, images, base64, UI state, and legacy `AazhiAssessment`.

### Structured output contract

`RiskInterpretation` contains only:

- `interactionSummary`
- `significance`
- `uncertainty`
- `relevantConcepts`

No `materialChange`, `proposedAction`, risk/safety scores, or navigation commands. Action policy is Phase 5; safety retrieval is Phase 6.

### Fail-closed behaviour

`interpretRiskChange` validates provider output with `riskInterpretationSchema`. Provider failure, malformed JSON, and schema validation failure throw `RiskInterpretationError`. No fabricated fallback interpretation is returned.

### AI cannot fill known capability gaps

Scenarios with `knownCapabilityGaps` (e.g. S011 `CHECK_IN_EVENT_NOT_YET_MODELLED`) must not have gap metadata serialized into interpreter input. Gemini cannot invent missed-check-in or official-alert facts absent from `RiskState`.

### Gemini product isolation

Phase 4 creates `createGeminiRiskInterpreterProvider` as a parallel boundary. `generateAssessment` in `src/lib/gemini.ts` is **not** modified. The Risk Interpreter is **not** connected to `POST /api/assess`.

### Phase 4 interpreter eligibility (derived from initial suite)

Evaluated by executing the real 15-scenario harness and reassessment gate:

| Metric | Value |
| --- | --- |
| Interpreter eligibility count | 4 |
| Interpreter skip count | 11 |
| Input construction success rate | 1 |
| Active concern input accuracy | 1 |
| Delta preservation rate | 1 |
| Reassessment decision preservation rate | 1 |

Eligible scenarios: S003, S004, S008, S009.

---

## Phase 5 Bounded Operational Policy

Phase 5 adds a bounded deterministic operational policy under `src/domain/policy/`. The policy controls **AAZHI workflow attention state** — not navigation, vessel seaworthiness, or maritime clearance.

Architecture preserved:

**DETERMINISTIC SYSTEMS DETECT → AI INTERPRETS → DETERMINISTIC POLICY CONTROLS OPERATIONAL ACTION**

The Risk Interpreter (Phase 4) remains explanation-only. Policy does not parse `interactionSummary`, `significance`, or `uncertainty`. Gemini is not required to derive policy actions.

### Policy domain boundary

| File | Responsibility |
| --- | --- |
| `operational-actions.ts` | Bounded `OPERATIONAL_ACTIONS` vocabulary + semantics |
| `policy-types.ts` | `OperationalPolicyDecision`, `PolicyViolationType`, validation result types |
| `action-policy.ts` | `REASSESSMENT_TO_OPERATIONAL_ACTION` mapping + `deriveOperationalPolicyDecision` |
| `policy-validator.ts` | `validateOperationalActionCandidate` — rejects unsupported/mismatched candidates |
| `index.ts` | Public barrel export (`@/domain/policy`) |

### Four bounded operational actions

Workflow attention states only — not maritime commands:

| Action | Meaning |
| --- | --- |
| `NO_ACTION_REQUIRED` | No new represented deterministic risk-state change requires workflow action (does not mean vessel/trip/conditions are safe) |
| `REASSESSMENT_REQUIRED` | Represented state change requires operational context reconsideration |
| `COORDINATOR_REVIEW_REQUIRED` | Environmental change interacting with active concern context requires human coordinator attention |
| `OFFICIAL_ALERT_PRIORITY` | Authoritative alert state requires highest workflow priority (alert state not yet modelled in RiskState) |

Unsupported free-form actions (e.g. `RETURN_TO_SHORE`, `CONTINUE_TRIP`, `VESSEL_SAFE`) are rejected.

### Reassessment-to-action mapping

Single deterministic source (`REASSESSMENT_TO_OPERATIONAL_ACTION`):

| Reassessment reason | Operational action |
| --- | --- |
| `NO_MATERIAL_CHANGE` | `NO_ACTION_REQUIRED` |
| `MATERIAL_ENVIRONMENTAL_CHANGE` | `REASSESSMENT_REQUIRED` |
| `MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN` | `COORDINATOR_REVIEW_REQUIRED` |
| `CONCERN_STATE_CHANGED` | `REASSESSMENT_REQUIRED` |
| `OFFICIAL_ALERT_CHANGED` | `OFFICIAL_ALERT_PRIORITY` |

### Policy validation

`validateOperationalActionCandidate` validates externally supplied action candidates:

- `UNSUPPORTED_ACTION` — candidate is not a bounded operational action
- `ACTION_POLICY_MISMATCH` — supported candidate does not match deterministic expected action
- Deterministic expected action is always returned as `fallbackAction`

### S003 policy result

| Check | Result |
| --- | --- |
| Reassessment reason | `MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN` |
| Policy action | `COORDINATOR_REVIEW_REQUIRED` |
| Trigger concepts | `ENGINE_RELIABILITY`, `WAVE_CONDITIONS` |
| Gemini | Not invoked |
| RiskInterpretation | Not required |

### Policy evaluation harness

`src/evals/policy/` evaluates scenarios through:

`calculateRiskDeltas` → `evaluateReassessmentNeed` → `deriveOperationalPolicyDecision`

All 15 scenarios declare `expectedOperationalAction`. Phase 5 policy is **not** connected to `POST /api/assess`.

### Phase 5 policy metrics (initial 15-scenario suite)

| Metric | Value |
| --- | --- |
| Policy action exact-match rate | 1 |
| Unsupported action rejection count | 1 (synthetic validation fixtures) |
| Action policy mismatch count | 2 (synthetic validation fixtures) |
| Policy fallback correctness rate | 1 |

---

## Phase 6 Grounded Safety Context Retrieval

Phase 6 adds a small, traceable, provider-independent curated safety context retrieval layer under `src/domain/safety/` and `src/data/safety/`. Retrieval grounds the Risk Interpreter without changing operational policy or the legacy assessment route.

Architecture preserved:

**DETERMINISTIC SYSTEMS DETECT → CURATED RETRIEVAL GROUNDS → AI INTERPRETS → DETERMINISTIC POLICY CONTROLS OPERATIONAL ACTION**

### Curated retrieval purpose

Supply authoritative safety context to the Risk Interpreter using exact `RiskConcept` mapping. Gemini explains interactions using retrieved context only — it does not generate source material, derive operational actions, or fill grounding gaps from general model knowledge.

### Authoritative-source allowlist

Bounded `SafetyAuthority` values: `FAO`, `IMO`, `ILO`, `FAO_ILO_IMO`, `INCOIS`, `INDIA_FISHERIES_AUTHORITY`. No blogs, SEO sites, Reddit, Wikipedia, commercial marketing, or LLM-generated guidance.

### Exact RiskConcept retrieval (no embeddings)

Retrieval V1 uses exact concept intersection only. No vector database, embeddings, semantic search, tokenization, or runtime web search. Unknown grounding is preferred over invented grounding.

### Provenance model

Each `SafetyKnowledgeRecord` preserves: `id`, `authority`, `documentTitle`, `jurisdiction`, `section`, `riskConcepts`, `content`, `contentRepresentation`, `sourceUrl`, `sourceLocator`, `version`, `effectiveDate`, `retrievalPriority`, `applicabilityNote`.

### Source applicability (Phase 6.1)

`applicabilityNote` is first-class metadata documenting the vessel or operational scope of each curated record. International guidance must not be generalized outside this documented scope. The Risk Interpreter serializes `applicabilityNote` in safety-context prompt sections and instructs the model to respect it.

Corpus precision is preferred over authority diversity or record count. Records with imprecise concept mapping or weak source-to-record alignment are removed rather than retained for coverage statistics.

### CURATED_PARAPHRASE semantics

Phase 6 seed records use `CURATED_PARAPHRASE` only — conservative factual paraphrases, not verbatim official quotations. `VERBATIM_EXCERPT` exists in the vocabulary but is not used unless exact source text is manually verified.

### Grounded and ungrounded concepts

`SafetyRetrievalResult` exposes `requestedConcepts`, `records`, `groundedConcepts`, and `ungroundedConcepts`. Concepts without a matching corpus record remain explicitly ungrounded.

### Empty retrieval behaviour

When no record matches, retrieval returns `[]`. No fallback safety advice is generated. The interpreter prompt and system instruction require explicit acknowledgement when `safetyContext` is empty.

### Grounding source validation

`RiskInterpretation.groundingSources` references retrieved records. After schema validation, `interpretRiskChange` verifies every `recordId` and provenance field matches the supplied input `safetyContext`. Fabricated metadata fails closed.

### S003 retrieval result (revised Phase 6.1 corpus)

| Check | Result |
| --- | --- |
| Requested concepts | `ENGINE_RELIABILITY`, `WAVE_CONDITIONS` |
| Grounded concepts | `ENGINE_RELIABILITY`, `WAVE_CONDITIONS` |
| Ungrounded concepts | (none for S003 requested set) |
| Retrieved record count | ≥ 2 (engine + INCOIS wave context) |
| INCOIS wave context | Grounds marine parameter meaning, not AAZHI sensitivity thresholds |
| WIND_CONDITIONS from non-relevant wind delta | Not requested |

### Phase 6.1 corpus precision corrections

| Change | Reason |
| --- | --- |
| Added `applicabilityNote` to all seed records | Source applicability is first-class metadata |
| Replaced IMO overview radio record | Primary communication grounded from FAO/ILO/IMO Safety Recommendations (Chapter 9) |
| Corrected FAO communication redundancy provenance | Official Fishing Safety communication resource; no universal second-radio mandate implied |
| Corrected safety equipment source | FAO *Safety at sea for small-scale fishers* (Open Knowledge Repository) |
| Replaced INCOIS PRIMARY_COMMUNICATION record with `sk-incois-wave-context-001` | INCOIS OSF grounds `WAVE_CONDITIONS` parameter meaning only |
| Removed ILO C188 seed record | `SAFETY_EQUIPMENT` taxonomy does not represent occupational/PPE concepts precisely enough |

### Current corpus limitations

The revised 7-record MVP corpus (`INITIAL_SAFETY_KNOWLEDGE`) demonstrates architecture evaluation only. It does not cover all `RiskConcept` values and does not establish jurisdiction-specific legal requirements.

### Product route isolation

Phase 6 retrieval remains disconnected from `POST /api/assess`, `src/lib/gemini.ts`, and the UI.

### Phase 6 retrieval metrics (initial 15-scenario suite)

| Metric | Value |
| --- | --- |
| Retrieval eligibility count | 4 |
| Retrieval execution success rate | 1 |
| Requested concept preservation rate | 1 |
| Grounding coverage rate | Derived from corpus coverage |
| Zero-result retrieval count | Derived |
| Provenance completeness rate | 1 |
| Fabricated source acceptance count | 0 |

---

## Phase 7 Vessel Risk Record Persistence

Phase 7 adds PostgreSQL/Neon persistence for vessel concerns, trips, immutable risk-state snapshots, and timeline events. See `docs/persistence/README.md` for full detail.

| Capability | Status |
| --- | --- |
| Persistent vessel concerns | Yes |
| Active concern carry-forward | Yes |
| Immutable versioned `RiskState` snapshots | Yes |
| Timeline event persistence | Yes |
| Connected to `POST /api/assess` | **No** |

---

## Phase 8 Event-Driven Risk Orchestrator

Phase 8 implements one constrained event-processing loop that composes existing deterministic detection, policy, retrieval, and AI interpretation boundaries against the Phase 7 Vessel Risk Record.

Architecture preserved:

**EVENT ARRIVES → LOAD STATE → APPLY EVENT → DETECT DELTAS → REASSESS → POLICY → SELECTIVE AI → RETRIEVE → INTERPRET → POSTURE → SNAPSHOT → TIMELINE**

The orchestrator is **not** a chatbot, multi-agent system, LangGraph workflow, or named-agent crew. It is a single deterministic lifecycle with selective AI invocation.

### Orchestrator boundary

| Path | Responsibility |
| --- | --- |
| `src/domain/risk/events/` | Bounded `MARINE_STATE_UPDATED` event vocabulary + pure `applyRiskEvent` |
| `src/application/risk-orchestrator/` | `processRiskEvent`, posture transition, timeline payload validation |
| `src/evals/orchestration/` | Synthetic orchestration evaluation harness |

### Event scope (Phase 8)

Exactly one `RiskEventType`: **`MARINE_STATE_UPDATED`**.

Events carry normalized `MarineRiskState` only — no raw Open-Meteo JSON, `MarineContext`, Gemini artifacts, deltas, or policy data.

### Processing lifecycle

1. **Idempotency** — trip-scoped `RISK_EVENT_PROCESSED` timeline lookup by `sourceEventId === event.id`
2. **Load** — latest persisted `TripRiskStateSnapshot`; fail closed if missing
3. **Apply** — `applyRiskEvent` produces candidate factual state (no version/posture mutation)
4. **Detect** — real `calculateRiskDeltas(previous, candidate)`
5. **Reassess** — real `evaluateReassessmentNeed` with domain active-concern semantics
6. **Policy** — real `deriveOperationalPolicyDecision` with explicit `processedAt`
7. **Selective AI** — real `shouldInvokeRiskInterpreter`; skip when reassessment not required
8. **Retrieve + interpret** — `buildRiskInterpretationInput` + injected `RiskInterpreterProvider`; interpreter failure does **not** invalidate deterministic policy
9. **Posture** — `deriveNextRiskPosture` maps policy to posture (`NO_ACTION_REQUIRED` retains current)
10. **Snapshot** — create immutable snapshot only when `deltas.length > 0`; no version churn on identical state
11. **Timeline** — append one `RISK_EVENT_PROCESSED` with complete trace payload
12. **Result** — serializable `RiskEventProcessingResult`

### Interpretation status vocabulary

`SKIPPED`, `SUCCEEDED`, `FAILED` with bounded failure reasons: `PROVIDER_FAILURE`, `INVALID_INTERPRETATION_OUTPUT`, `GROUNDING_PROVENANCE_FAILURE`, `UNKNOWN_INTERPRETER_FAILURE`.

### S003 version 1 → version 2 lifecycle

| Check | Result |
| --- | --- |
| Previous version | 1 (`CAUTION`, wave 0.8 m, wind 13 km/h, `ENGINE_RELIABILITY` OPEN) |
| Event | `evt-s003-marine-001` / `MARINE_STATE_UPDATED` |
| Wave delta | `+0.7 m`, reassessment-relevant |
| Wind delta | `+5 km/h`, not reassessment-relevant |
| Reassessment | `MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN` |
| Policy | `COORDINATOR_REVIEW_REQUIRED` |
| Interpreter | Invoked once; `SUCCEEDED` with grounded safety records |
| Posture | `CAUTION` → `COORDINATOR_REVIEW_REQUIRED` |
| New snapshot | Version 2; version 1 remains immutable |
| Duplicate replay | Detected; no version 3, no second interpreter call |

### Idempotency and no-version-churn behaviour

- Duplicate `event.id` returns prior result reconstructed from validated timeline payload; malformed payloads fail closed
- Identical marine state: `deltas: []`, no snapshot, interpreter skipped; one trace for the unique event
- Below-sensitivity change: factual snapshot persists, reassessment false, interpreter skipped

### Current capability gaps (unchanged)

Phase 8 does not model check-ins, official alerts, GPS/AIS, trip-duration comparison, or automated marine monitoring. The orchestrator remains **disconnected** from `POST /api/assess` and the assessment UI.

### Phase 8 orchestration metrics

| Metric | Value |
| --- | --- |
| Event processing success rate | 1 |
| Delta preservation rate | 1 |
| Reassessment preservation rate | 1 |
| Policy preservation rate | 1 |
| Selective AI invocation accuracy | 1 |
| Posture transition accuracy | 1 |
| Snapshot creation accuracy | 1 |
| Timeline trace completeness rate | 1 |
| Duplicate event reprocessing count | 0 |
| Interpreter failure policy degradation accuracy | 1 |

---

## Phase 9 Active Trip Product Integration

Phase 9 connects the Phase 7–8 intelligence stack to the real product workflow.

### Pre-departure to active-trip lifecycle

```text
PRE-DEPARTURE ASSESSMENT (POST /api/assess — unchanged)
↓
OPTIONAL CONCERN CONFIRMATION (client workflow state only)
↓
RECORD TRIP START (POST /api/risk/trips/start)
↓
PERSISTED ACTIVE TRIP + RiskState v1
↓
ACTIVE TRIP WORKSPACE
↓
CHECK LATEST SEA CONDITIONS (POST .../refresh-marine)
↓
MARINE_STATE_UPDATED → processRiskEvent
↓
UPDATED POSTURE + ACTION STATE + GROUNDED EXPLANATION + TIMELINE
```

### Explicit concern confirmation

- User confirms one bounded operational concern in the UI
- **No API persistence** until RECORD TRIP START
- `reportVesselConcern` runs only inside trip-start server flow
- Gemini blockers/conflicts are never auto-persisted

### Marine reference location

`MarineReferenceLocation` (`latitude`, `longitude`, `label`) is stored on Trip and frozen in RiskState snapshots.

It is the marine forecast reference location — not live vessel tracking, AIS, or GPS.

### Device-local continuity (MVP, no authentication)

| Key | Stored value |
| --- | --- |
| `aazhi:vessel-id` | `vesselId` only |
| `aazhi:active-trip-id` | `tripId` only |

Database remains source of truth. Risk state is not stored in `localStorage`.

### APIs

| Route | Purpose |
| --- | --- |
| `POST /api/risk/trips/start` | Record trip + initial risk state |
| `GET /api/risk/trips/[tripId]` | Active trip DTO + timeline |
| `POST /api/risk/trips/[tripId]/refresh-marine` | Manual marine refresh + orchestration |

### Server composition

Production wiring lives in `src/server/risk-intelligence/` (`server-only`):

- Prisma persistence adapters
- Production marine adapter (`fetchMarineContext` → `toMarineRiskState`)
- Real Gemini Risk Interpreter provider
- `INITIAL_SAFETY_KNOWLEDGE`

Application logic (`ActiveTripService`, DTOs) lives in `src/application/active-trip/` and is directly testable with in-memory repositories and fake providers.

### Policy vs AI explanation

- **ACTION STATE** — deterministic `OperationalAction` from policy
- **CONTEXTUAL EXPLANATION** — selective Gemini Risk Interpreter output when reassessment required
- Interpreter failure does not fabricate explanation prose

### Manual monitoring language

Product copy uses **CHECK LATEST SEA CONDITIONS** and **Manual update — AAZHI is not continuously monitoring this trip.**

AAZHI does not claim continuous monitoring, live tracking, or automatic alerts.

### S003 complete product lifecycle

Trip start with `ENGINE_RELIABILITY` OPEN + `PROCEED WITH CAUTION` → manual refresh with worsening marine → wave `+0.7 m`, wind `+5 km/h`, reassessment `MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN`, policy `COORDINATOR_REVIEW_REQUIRED`, interpreter `SUCCEEDED`, posture `COORDINATOR_REVIEW_REQUIRED`, state version 2.

See [docs/product/active-trip-workflow.md](./product/active-trip-workflow.md).

---

## Phase 1 Readiness

**READY** (Phase 0 complete; Phase 1 domain foundation landed on this branch)

Phase 0 inspection finds a stable, test-backed assessment core with clear Gemini and marine boundaries and a redesigned UI that still calls the same `/api/assess` contract. There are **no Phase 0 documentation blockers** to starting Phase 1 design/implementation of the risk domain model and deterministic delta seam.

### Phase 0 validation snapshot (post-documentation; production code unmodified)

| Check | Result |
| --- | --- |
| `npm run test:coverage` | **PASS** — 6 files, **81** tests |
| Line coverage | **88.65%** |
| Statement coverage | **88.59%** |
| Branch coverage | **81.55%** |
| Function coverage | **96%** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |

Note: previous validated baseline cited 78 tests. Current suite is **81** after addition of `src/lib/marine-display.test.ts` (3 presentation-only tests). Core boundary coverage percentages match the prior baseline.

Non-blocking watch items (not readiness blockers):

- Legacy unused intake components remain on disk.
- Coverage config now includes `src/domain/risk/**/*.ts`; UI hooks remain out of coverage include.
- No persistence layer exists yet (expected; required later for Vessel Risk Record).
- Enum duplication between `types.ts` and Gemini JSON schema should be resolved when touching that boundary.
)
