# AAZHI

> See the sea. Speak your situation. Know your next move.

AAZHI is a multimodal pre-departure context reconciliation and readiness
assistant for small-scale fishers.

Marine systems can forecast the sea, but they cannot know that a fisher's
engine had trouble yesterday, backup communication is unavailable today, the
planned trip is longer, or locally observed conditions appear to be worsening.
AAZHI closes that last-mile gap by turning marine context and field context into
a prioritized operational brief focused on one question:

**What should I change before I leave?**

AAZHI is not a weather prediction model, generic chatbot, official alert
service, or scientific image-analysis tool. It is a readiness interpretation
layer at the shore.

## How it works

```text
SPEAK + SHOW + TRIP CONTEXT + LIVE MARINE CONTEXT
                         ↓
          GEMINI MULTIMODAL CONTEXT SYNTHESIS
                         ↓
CONDITION CONFLICT + DEPARTURE BLOCKERS + ACTION POSTURE
                         ↓
        PRIORITIZED PRE-DEPARTURE ACTION BRIEF
```

AAZHI reconciles three evidence layers:

1. **External marine context** — live wave height, wave period, wind-wave
   height, and swell-wave height from Open-Meteo.
2. **Fisher-reported field observation** — natural spoken audio and/or typed
   observations, treated as reported local context rather than verified
   scientific measurements.
3. **Visible and trip readiness context** — an optional image plus boat type,
   crew count, coastal location, and planned trip duration.

## Genuine Gemini usage

The server uses the official `@google/genai` SDK with `gemini-3.5-flash`.
One Gemini request reasons directly across text, audio bytes, image bytes, trip
context, and the fetched marine readings. It generates guidance directly in
English or Tamil—without separate transcription or translation calls.

The request uses structured JSON output. Every provider response is parsed and
validated server-side with Zod before any assessment reaches the browser.
Departure blockers and action posture are model-generated from the complete
supplied context; they are not manufactured with keyword rules.

## Live marine context

Each assessment makes one server-side request to the
[Open-Meteo Marine Weather API](https://open-meteo.com/en/docs/marine-weather-api).
AAZHI requests only the marine variables it displays and uses current values,
with nearest-hourly fallback when needed. Missing readings remain unavailable;
they are never converted to zero or replaced with invented defaults.

Marine data attribution: **Open-Meteo Marine Forecast**.

## Architecture

```text
Next.js App Router client
  └─ POST /api/assess (multipart form)
       ├─ Zod input and upload validation
       ├─ Open-Meteo marine fetch (once)
       └─ Gemini multimodal generation (once)
            └─ JSON parse + server-side Zod output validation
```

The MVP uses Next.js, TypeScript, Tailwind CSS, `@google/genai`, and Zod. It has
no database, authentication, agent framework, saved history, or polling.

## Local setup

Requirements: a current Node.js LTS release and a Gemini API key with access to
the configured model.

```bash
npm install
```

Copy `.env.example` to `.env.local`, then set:

```dotenv
GEMINI_API_KEY=your_key_here
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production checks:

```bash
npm run lint
npm run build
```

## Trust boundaries

- AAZHI provides preparedness and readiness assistance, not official maritime
  clearance.
- Fisher speech and text are reported field context, not independently verified
  measurements.
- Images provide visible situational context only. AAZHI does not measure wave
  height, wind speed, or vessel safety from an image.
- Marine readings are attributed to Open-Meteo and are never invented.
- AAZHI never guarantees safe departure or claims AI-certified vessel safety.
- Users must follow official maritime, weather, and local authority
  instructions.
- Uploaded audio and images are processed in memory for the submitted
  assessment and are not persisted by the application.

## Hackathon demo scenarios

### Scenario A — high concern

- Small fibre boat
- 5 crew
- 8 hours
- “The sea near shore looks rougher than this morning. My engine had trouble
  yesterday and we do not have the second radio today.”
- Optional rough-sea image

The model can reconcile changing local observations, unresolved vessel
reliability, communication redundancy, and trip exposure into specific
blockers—without hardcoded keyword logic.

### Scenario B — lower concern

- Medium fishing vessel
- 3 crew
- 3 hours
- “Boat checks are complete. Engine and communication equipment are working.
  Conditions look similar to earlier.”

The result should remain contextual while avoiding guaranteed-safety language.

### Scenario C — Tamil

Choose **தமிழ்** as the output language and submit an English or Tamil
observation. Descriptive guidance is generated in Tamil while stable action,
urgency, and priority enum values remain in English for application logic.
