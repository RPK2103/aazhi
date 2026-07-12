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

## Phase 1 Readiness

**READY**

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
- Coverage config does not yet include future `src/domain/**` or UI hooks.
- No persistence layer exists yet (expected; required later for Vessel Risk Record).
- Enum duplication between `types.ts` and Gemini JSON schema should be resolved when touching that boundary.
)
