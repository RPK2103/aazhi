# AAZHI Persistence (Phase 7)

Phase 7 adds a minimal persistent **Vessel Risk Record** using PostgreSQL and Prisma. It answers:

> Can AAZHI persist a vessel concern and load it for a later trip?

This layer is **not** connected to `POST /api/assess`, the assessment UI, or Gemini reasoning. Phase 8 will orchestrate event-driven risk processing against this record.

## Purpose

- Persist vessel identity and descriptive metadata
- Persist vessel concern lifecycle (`OPEN`, `RESOLUTION_REPORTED`, `RESOLVED`, `DISMISSED`)
- Persist trips and immutable trip risk-state snapshots
- Append immutable timeline events for workflow audit

## Prisma version and configuration

| Setting | Value |
| --- | --- |
| Prisma ORM | **7.8.0** |
| Configuration style | **`prisma.config.ts`** (Prisma 7) + `prisma/schema.prisma` |
| Database provider | **PostgreSQL** (Neon) |
| Runtime adapter | **`@prisma/adapter-neon`** |

Prisma 7 moves CLI datasource configuration into `prisma.config.ts`. The schema `datasource` block declares the provider only — no inline connection URL.

Generated client output: `src/generated/prisma`.

## Neon connection architecture

| Variable | Role |
| --- | --- |
| `DATABASE_URL` | **Runtime application connection** — pooled Neon URL (`-pooler` hostname). Used by the server-only Prisma client via `@prisma/adapter-neon`. |
| `DIRECT_URL` | **Prisma CLI connection** — direct Neon URL without pooler. Used by `prisma validate`, `prisma generate`, and `prisma migrate` through `prisma.config.ts`. |

Do not commit real credentials. Copy `.env.example` to `.env.local` and fill in Neon values from the Neon Console.

Example (placeholders only):

```ini
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DB?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/DB?sslmode=require"
```

## Local setup

1. Create `.env.local` from `.env.example`.
2. Set `DATABASE_URL` and `DIRECT_URL`.
3. Generate the Prisma client:

```bash
npm run prisma:generate
```

4. Validate schema:

```bash
npm run prisma:validate
```

5. Apply migrations (when a Neon project is configured):

```bash
npm run prisma:migrate
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run prisma:validate` | Validate `prisma/schema.prisma` |
| `npm run prisma:generate` | Generate typed Prisma client to `src/generated/prisma` |
| `npm run prisma:migrate` | Create/apply migrations against `DIRECT_URL` |

## Architecture

```text
src/domain/risk/                 # Pure domain — no Prisma imports
src/application/persistence/     # Repository ports + risk-state serialization
src/application/vessel-risk-record/  # Workflow service (create vessel, report concern, create trip, snapshot)
src/infrastructure/persistence/prisma/  # Prisma adapters + mappers
src/test-support/persistence/    # In-memory repository implementations for tests
```

### Server-only Prisma boundary

`src/infrastructure/persistence/prisma/prisma-client.ts` defines a lazy singleton Prisma client with the Neon adapter. Do not import this module from client components or browser code.

### Persistence ports and adapters

Repository interfaces live in `src/application/persistence/persistence-ports.ts`. They expose domain/application types only — never Prisma generated types.

Prisma adapters in `src/infrastructure/persistence/prisma/` implement those ports and use explicit mappers in `persistence-mappers.ts`.

### Domain rehydration

Persisted string values for `RiskConcept`, `ConcernStatus`, `TripStatus`, and `RiskPosture` are validated at rehydration time using domain helpers (`isRiskConcept`, `isConcernStatus`, `isTripStatus`, `isRiskPosture`). Unsupported values throw `PersistenceMappingError` — fail closed, no silent defaults.

`RiskState` snapshots are serialized/deserialized via Zod in `risk-state-serialization.ts`.

## Immutable snapshot semantics

Two persistence concepts must not be conflated:

| Concept | Mutable? | Purpose |
| --- | --- | --- |
| **`VesselConcern`** (relational table) | Yes — lifecycle updates | Current persistent concern state across application requests |
| **`TripRiskStateSnapshot`** | **No** — append-only | Immutable historical risk-state truth at a specific version |

When creating a trip risk-state snapshot, the complete `RiskState` — including concern objects as they existed at snapshot time — is stored in `stateJson`.

**Example:** Version 1 snapshot records `ENGINE_RELIABILITY` / `OPEN`. Later, the relational concern becomes `RESOLVED`. Reloading Version 1 still rehydrates `ENGINE_RELIABILITY` / `OPEN`.

Do **not** store only concern IDs in snapshots and re-query current concern statuses — that would corrupt historical semantics.

## Active concern carry-forward

When `createInitialTripRiskState` runs for a new trip:

1. Load all vessel concerns from persistence
2. Filter with domain `isActiveConcern` (`OPEN`, `RESOLUTION_REPORTED` only)
3. Copy concern objects into `RiskState.activeConcerns`
4. Persist immutable snapshot with full serialized state

`RESOLVED` and `DISMISSED` concerns are excluded from carry-forward.

## S003 persistence workflow

**Day 1:** Report `ENGINE_RELIABILITY` / `OPEN` for vessel `TN-04`.

**Day 2:** Create trip (5 crew, 8 planned hours), create initial risk state with marine baseline (0.8 m waves, 13 km/h wind, `CAUTION` posture).

Expected: concern loads from persistence, remains `OPEN` in the snapshot; later concern resolution does not alter the historical snapshot.

## Testing strategy

Automated tests use **in-memory repositories** (`src/test-support/persistence/`). No real Neon or Gemini calls occur during `npm test`.

Prisma adapter unit tests validate construction and mapper behaviour without external database connections.

Persistence evaluation metrics live in `src/evals/persistence/`.

## Phase 8 readiness

Phase 7 provides the persistent Vessel Risk Record workflow in isolation. Phase 8 can orchestrate trip events against this service without changing domain, policy, retrieval, or Gemini boundaries implemented in earlier phases.
