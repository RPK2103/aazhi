# AAZHI

> **“See the sea. Speak your situation. Know your next move.”**

> **“Marine systems forecast the sea. AAZHI interprets the decision at the shore.”**

AAZHI is a multimodal pre-departure context reconciliation and readiness
assistant for small-scale fishers. It combines live marine forecast context
with fisher-reported observations, optional visible context, vessel readiness,
crew context, and planned trip duration to generate a prioritized operational
readiness brief before departure.

**Live Demo:** [https://aazhi-final.vercel.app/](https://aazhi-final.vercel.app/)

## The Problem

A fisher may separately have:

```text
MARINE FORECAST
        +
WHAT THEY CAN SEE
        +
WHAT HAPPENED TO THE BOAT
        +
CREW CONTEXT
        +
TODAY'S TRIP PLAN
```

These pieces are fragmented, leaving the fisher to mentally reconcile them and
answer:

**“What should I change before I leave?”**

AAZHI addresses that operational gap. It is not another weather dashboard.

## What AAZHI Does

AAZHI is a **last-mile interpretation layer**.

Marine forecasting systems provide environmental conditions. They cannot know:

- The engine had trouble yesterday
- Backup communication is unavailable today
- The trip is eight hours instead of three
- The fisher is observing worsening nearshore conditions
- A specific crew is leaving on a specific vessel today

AAZHI reconciles this local field and readiness context with live marine
information, then produces a concise pre-departure action brief.

## Core Reasoning Flow

```text
FISHER FIELD CONTEXT
(Speak / Type / Show)
        +
VESSEL & TRIP CONTEXT
        +
LIVE MARINE CONTEXT
(Open-Meteo)
        ↓
GEMINI MULTIMODAL CONTEXT SYNTHESIS
        ↓
CONDITION CONFLICT DETECTION
        +
DEPARTURE BLOCKER IDENTIFICATION
        +
ACTION POSTURE
        ↓
PRIORITIZED PRE-DEPARTURE ACTION BRIEF
```

## Three Evidence Layers

### 1. Live Marine Context

AAZHI retrieves the following fields:

- Wave height
- Wave period
- Wind-wave height
- Swell-wave height

**Source:** Open-Meteo Marine Forecast.

Current readings are used when available. The server also requests hourly data
and can select the timestamp nearest to the assessment time. Missing individual
readings remain unavailable rather than being replaced with invented defaults.

### 2. Fisher-Reported Field Observation

The fisher can provide:

- Browser-recorded audio
- A typed observation fallback

The observation is treated as fisher-reported field context, not as a
scientifically verified measurement.

### 3. Visible + Trip Readiness Context

The assessment may also include:

- An optional JPEG, PNG, or WebP image
- Boat type
- Crew count
- Planned trip duration
- Coastal location

Images are visible situational context only. **AAZHI does not scientifically
measure wave height from images.**

## Genuine GenAI Implementation

AAZHI uses:

- The official `@google/genai` SDK
- `gemini-3.1-flash-lite`, centralized as `GEMINI_MODEL` in
  `src/lib/gemini.ts`
- One principal Gemini generation request per assessment
- Text context containing trip, vessel, field, and live marine information
- Optional audio bytes supplied as inline multimodal data
- Optional image bytes supplied as inline multimodal data
- Structured JSON generation using `responseMimeType: "application/json"`
- A provider-compatible response JSON schema
- Server-side JSON parsing and Zod validation

AAZHI does not use keyword-based blocker rules. There is no production logic
equivalent to:

```text
if observation includes "engine":
    add engine blocker
```

Gemini infers departure blockers by reconciling the complete context supplied
in the assessment.

A **condition conflict** exists when fisher-reported or visible local context
materially differs from, adds concern beyond, or complicates what the external
marine forecast alone communicates.

In Scenario A, the external marine context may indicate comparatively moderate
open-water conditions while the fisher reports rougher nearshore conditions,
recent engine trouble, and missing backup communication. AAZHI surfaces that
reconciliation gap and reasons about the combined departure-readiness impact.

## Structured Assessment Contract

Gemini returns structured JSON containing:

- `actionPosture`
- `urgency`
- `situationSummary`
- `conditionConflict`
- `departureBlockers`
- `whyThisMatters`
- `immediateActions`
- `preDepartureChecklist`
- `atSeaActions`
- `afterReturnActions`
- `marineContextExplanation`
- `language`

The JSON is parsed and validated server-side using the production
`AazhiAssessment` Zod schema before the result is sent to the browser. Invalid
model output is rejected and is not rendered as trusted assessment data.

## Action Postures

The model must choose exactly one:

- `PREPARE BEFORE DEPARTURE`
- `PROCEED WITH CAUTION`
- `DELAY AND REASSESS`
- `DO NOT DEPART YET`

These are pre-departure decision postures, not official government alerts or
maritime clearances.

## Architecture

```text
Browser
  |
  | multipart/form-data
  v
Next.js POST /api/assess
  |
  +--> Zod scalar validation
  |
  +--> MIME + upload-size validation
  |
  +--> Open-Meteo Marine API
  |        |
  |        v
  |    MarineContext
  |
  +--> Gemini multimodal request
           |
           v
     Structured JSON
           |
           v
  AazhiAssessment Zod validation
           |
           v
  Operational Readiness Brief
```

The architecture is intentionally small: a Next.js App Router application with
one assessment Route Handler and no database or auxiliary service.

## Efficiency by Design

Production behavior is deliberately bounded:

- One Open-Meteo marine fetch per assessment
- One Gemini generation request per assessment
- No polling
- No separate transcription request
- No separate translation request
- Tamil guidance is generated in the main Gemini request
- Image and audio parts are omitted when absent
- Uploaded files are converted to Base64 only when supplied
- No database
- No agent framework
- No unnecessary persistence
- No provider retry loop

This keeps the architecture low-latency and hackathon-appropriate while
preserving genuine multimodal reasoning.

## Security and Trust Boundaries

### Application security

- `GEMINI_API_KEY` is server-side only
- No `NEXT_PUBLIC` Gemini secret exists
- `.env.local` is ignored by Git
- Scalar form fields are validated with Zod
- Locations, boat types, and languages are allowlisted
- Image and audio MIME types use explicit allowlists
- Image uploads are limited to 5 MB
- Audio uploads are limited to 8 MB
- Uploaded files are processed in memory and are not persisted
- Base64 media data is never logged
- Browser-facing errors are concise and safe
- Provider stack traces are not exposed to users
- React renders assessment text without `dangerouslySetInnerHTML`
- Gemini structured output is validated with Zod before browser delivery

### Product trust boundaries

AAZHI:

- Does not scientifically measure wave height from an image
- Does not calculate capsize probability
- Does not guarantee safe departure
- Does not issue government alerts
- Does not provide official maritime clearance
- Does not certify vessel safety
- Does not replace maritime or local authorities

Users must follow official maritime, weather, and local authority instructions.

## Automated Testing

AAZHI uses **Vitest** with **V8 coverage**.

The suite contains **78 automated tests across 5 test files**:

- `src/app/api/assess/route.test.ts`
- `src/lib/gemini.test.ts`
- `src/lib/validation.test.ts`
- `src/lib/locations.test.ts`
- `src/lib/marine.test.ts`

### Testing Strategy

Tests exercise pure validation and normalization logic plus the API and Gemini
boundaries. External Gemini and Open-Meteo boundaries are mocked, so the suite
never consumes Gemini quota and never depends on provider availability. Manual
Scenario A/B/C flows validate real end-to-end provider integration.

### API Route Behavior

Coverage includes:

- Malformed multipart input and missing field observations
- Invalid location, boat type, crew count, and trip duration
- Unsupported and oversized image uploads
- Valid text-only and optional-image requests
- Marine provider failure handling
- Gemini provider and malformed structured-output failure handling
- Safe HTTP status and browser-facing error contracts

### Gemini Structured-Output Boundary

Coverage includes:

- Valid structured assessments
- Missing fields and invalid posture or urgency values
- Malformed provider JSON
- Empty blocker arrays
- Tamil and Unicode preservation
- One structured generation request
- Optional audio and image inline-data parts
- Missing-key and provider-failure handling

### Assessment Input Validation

Coverage includes:

- Valid Scenario A scalar input
- Unsupported locations
- Unsupported boat types
- Zero and above-limit crew counts
- Zero and above-limit trip durations
- Unsupported languages
- Typed-observation length limits
- Empty typed observations at the scalar layer
- Typed-only, audio-only, both, and missing field-observation cases
- Verification that an image alone is insufficient

### Structured Assessment Validation

Coverage includes:

- Valid representative assessments
- Action posture enum enforcement
- Urgency enum enforcement
- Blocker priority enforcement
- `conditionConflict` shape validation
- Immediate-action limits
- Pre-departure checklist limits
- At-sea action limits
- After-return action limits
- Output language validation

### Coastal Location Configuration

Coverage includes:

- Chennai / Kasimedu, Kochi, and Mangaluru
- Finite latitude and longitude values
- Unique location IDs

### Marine Context Normalization

Coverage includes:

- Nearest timestamp selection
- Exact timestamp matching
- Invalid timestamp handling
- Current-reading preference
- Null marine values
- Zero-value preservation
- Malformed or missing hourly data
- Source normalization to `Open-Meteo Marine Forecast`

### Upload Validation

Coverage includes:

- JPEG, PNG, and WebP acceptance
- Unsupported image MIME rejection
- Oversized image rejection
- Acceptance of the configured audio MIME allowlist
- MIME normalization when codec parameters are present
- Unsupported audio MIME rejection
- Oversized audio rejection

Current V8 coverage is approximately:

- **88.65% lines**
- **88.59% statements**
- **81.55% branches**
- **96% functions**

```bash
npm test
npm run test:run
npm run test:coverage
```

## Demo Scenarios

### Scenario A — High Concern

- **Location:** Chennai / Kasimedu
- **Boat:** Small fibre boat
- **Crew:** 5
- **Trip:** 8 hours

Observation:

> “The sea near shore looks rougher than this morning. My engine had trouble
> yesterday and we do not have the second radio today.”

Expected contextual behavior:

- A strong action posture when supported by the full assessment
- Engine reliability may become a blocker
- Communication redundancy may become a blocker
- A condition conflict may be detected
- Guidance prioritizes the actual readiness concerns

These outcomes are model-inferred and are not hardcoded frontend rules.

### Scenario B — Lower Concern

- **Boat:** Medium fishing vessel
- **Crew:** 3
- **Trip:** 3 hours

Observation:

> “Boat checks are complete. Engine and communication equipment are working.
> Conditions look similar to earlier.”

The output should materially differ because the supplied evidence differs. The
model must still avoid guaranteed-safety language.

### Scenario C — Tamil

Select Tamil as the output language. Descriptive assessment fields are
generated in Tamil during the same principal Gemini request. No second
translation model call is made.

## Coastal Locations in the MVP

The configured locations are:

- Chennai / Kasimedu
- Kochi
- Mangaluru

Their coordinates are application configuration used for the Open-Meteo marine
forecast lookup. The MVP does not claim nationwide GPS coverage.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Google Gemini API
- `@google/genai`
- Zod
- Open-Meteo Marine Weather API
- Vitest
- V8 Coverage
- Vercel

## Local Setup

Clone the repository:

```bash
git clone https://github.com/RPK2103/aazhi.git
cd aazhi
npm install
```

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

Set the server-side Gemini API key in `.env.local`:

```dotenv
GEMINI_API_KEY=your_key_here
```

Start the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run tests:

```bash
npm test
```

Generate coverage:

```bash
npm run test:coverage
```

Create a production build:

```bash
npm run build
```

Never place a real API key in repository files.

## Repository Structure

```text
src/
├─ app/
│  ├─ api/
│  │  └─ assess/
│  │     ├─ route.ts
│  │     └─ route.test.ts
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
│  ├─ fisher-intake.tsx
│  ├─ assessment-result.tsx
│  └─ marine-context-card.tsx
└─ lib/
   ├─ gemini.ts
   ├─ gemini.test.ts
   ├─ marine.ts
   ├─ validation.ts
   ├─ types.ts
   ├─ locations.ts
   ├─ validation.test.ts
   ├─ locations.test.ts
   └─ marine.test.ts

package.json
vitest.config.ts
.env.example
```

## What AAZHI Is Not

AAZHI is not:

- A marine forecasting model
- A scientific computer-vision wave estimator
- An official maritime alert system
- A route optimization product
- A vessel certification service
- A replacement for local or maritime authorities

**AAZHI is a last-mile readiness interpretation layer.**

## Attribution

Marine forecast values used by AAZHI are retrieved from the
[Open-Meteo Marine Weather API](https://open-meteo.com/en/docs/marine-weather-api)
and identified in the application as **Open-Meteo Marine Forecast**.

## Links

- **Live application:** [https://aazhi-final.vercel.app/](https://aazhi-final.vercel.app/)
- **GitHub repository:** [https://github.com/RPK2103/aazhi](https://github.com/RPK2103/aazhi)
