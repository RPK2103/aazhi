# AAZHI Production Smoke Test Checklist

This document separates **automated release gates** from **manual production smoke tests** on a deployed Vercel environment with real Neon, Gemini, and Open-Meteo.

## Release readiness verdicts

| Context | Requirement |
|---------|-------------|
| **Hackathon demo release** | Synthetic/non-sensitive demo data only; platform access controls documented |
| **Real-world data deployment** | **BLOCKED** until authentication, authorization, and tenancy are implemented |

Security wording for reports:

- `HACKATHON DEMO SECURITY`: ADEQUATE FOR SYNTHETIC DEMO / BLOCKED
- `REAL-WORLD SECURITY`: NEEDS WORK

---

## Automated test tiers (do not substitute for manual production smoke)

| Tier | Command | Proves |
|------|---------|--------|
| Unit tests | `npm test` | Domain, policy, validation, orchestration invariants |
| Coverage gate | `npm run test:coverage` | Scoped production module coverage |
| Application/API integration | included in Vitest | Handler contracts with in-memory persistence |
| Mocked-browser product-contract tests | `npm run test:e2e` | UI flows with intercepted API responses |
| Full release gate | `npm run verify:release` | generate, validate, typecheck, lint, coverage, build, mocked-browser tests |
| Production dependency audit | `npm run audit:prod` | High/critical production dependency vulnerabilities |

**Mocked-browser tests do not prove browser-to-real-database behaviour.**

Automated tests use in-memory persistence and mocked provider responses. **No real Neon connection occurs during automated tests.**

---

## Prisma and environment variables

| Command | Requires `DIRECT_URL` | Requires `DATABASE_URL` | Notes |
|---------|----------------------|-------------------------|-------|
| `prisma generate` | No | No | Must succeed during `npm ci` / CI without production secrets |
| `prisma validate` | No | No | Schema-only validation |
| `prisma migrate deploy` | **Yes** | No | Run manually against Neon before/at deploy time |
| Runtime application | No | **Yes** | Pooled Neon connection for live API routes |

- `prisma.config.ts` loads optional `.env` via `dotenv/config` but does not require `DIRECT_URL` for generate/validate.
- Do not commit real database credentials. No fallback production database URL is embedded in source control.

---

## Manual production smoke test (deployed Vercel + real providers)

Prerequisites:

- Vercel project on **Node 22.x**
- Environment variables set (names only — never commit values):
  - `GEMINI_API_KEY`
  - `DATABASE_URL` (pooled Neon runtime)
  - `DIRECT_URL` (direct Neon for migrations)
- Migrations applied with `npx prisma migrate deploy` (never during build)
- Demo data only — no real fisher, vessel, or operational records

Recommended platform controls for demo URL:

- Vercel Deployment Protection or password gate
- Provider quota/billing alerts for Gemini, Open-Meteo, and Neon
- No public coordinator URL without understanding open API access

### Landing and navigation

- [ ] `/` loads hero copy without fatal console errors
- [ ] DESCEND reaches assessment workspace
- [ ] Footer coordinator link opens `/coordinator`
- [ ] Mobile layout (375px) has no horizontal overflow
- [ ] Desktop layout (1440px) preserves hierarchy

### Legacy assessment (`POST /api/assess`)

- [ ] Text-only assessment completes with posture and marine panel
- [ ] Optional JPEG/PNG/WebP image upload works
- [ ] Empty observation is rejected client-side and server-side
- [ ] Disclaimer remains visible (no official clearance claims)

### Trip risk record

- [ ] Confirm concern → `CARRY INTO TRIP RISK RECORD` (no trip start yet)
- [ ] `RECORD TRIP START` creates active workspace at state version 1
- [ ] Concern shows `OPEN`
- [ ] Manual monitoring notice visible

### Active trip restore

- [ ] Reload browser with only `aazhi:vessel-id` and `aazhi:active-trip-id` in localStorage
- [ ] Active workspace restores from `GET /api/risk/trips/[tripId]`
- [ ] No RiskState JSON stored in localStorage

### Marine refresh paths

- [ ] Identical refresh: version unchanged, `NO NEW AAZHI ACTION`, interpretation skipped
- [ ] Material change path (S003 demo): version increments, deltas visible, coordinator-review action
- [ ] If safely simulable: interpreter failure shows bounded copy without fake explanation

### Coordinator view

- [ ] `/coordinator` loads attention summary
- [ ] `REFRESH VIEW` performs exactly one coordinator GET (no marine refresh)
- [ ] Persisted-state attention trip does not imply posture cleared by latest `NO_ACTION_REQUIRED`

### Server and persistence checks

- [ ] Browser console: no unexpected 500s during supported flows
- [ ] Server logs: no secret values or raw provider payloads in responses
- [ ] Neon: trip snapshots version correctly; duplicate refresh events do not duplicate versions
- [ ] Stale localStorage trip ID clears and returns to safe intake state

---

## Clean-checkout verification (release engineer)

After all hardening commits, from PowerShell:

```powershell
git worktree add --detach ..\aazhi-clean-verify HEAD
Push-Location ..\aazhi-clean-verify
node --version
npm ci
npm run verify:release
Pop-Location
git worktree remove ..\aazhi-clean-verify
```

Expected Node for clean-checkout verification: **22.19.0** (see `.nvmrc`). Vercel deployments should use **Node 22.x**. `package.json` engines require `>=22.13.0 <23`.

Retain the worktree and Playwright artifacts if the gate fails.

---

## Known limitations (document, do not treat as defects in this phase)

- No authentication, authorization, tenancy, or ownership enforcement on trip/coordinator APIs
- Public endpoints can incur Gemini/Open-Meteo cost without in-app rate limiting
- No magic-byte upload validation
- No deployed Content-Security-Policy (headers only)
- Tamil output not reflected in `html lang`
