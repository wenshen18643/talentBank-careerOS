# Career OS

A career operating system built on continuous logging and forward-looking matching, not retroactive CVs and backward keyword search. This prototype ships the **candidate vertical slice** end-to-end.

## What's in this prototype

| Area | Status |
| --- | --- |
| Landing page (dual-register, calm & considered) | ✅ |
| Credential auth (signup / login / logout, scrypt-hashed, signed-cookie sessions) | ✅ placeholder for Clerk |
| Dual-role onboarding (candidate / recruiter) at signup | ✅ |
| **Living Ledger** — log raw entries, "Improve & Expand" via Kimi | ✅ |
| **Résumé import** — upload PDF / txt / md (or paste) → split into entries | ✅ |
| Kimi (Moonshot) integration with deterministic **offline fallback** | ✅ |
| Live-compiled CV from refined entries, **download as PDF or Markdown** | ✅ |
| Candidate dashboard + incoming-request inbox | ✅ |
| Candidate **profile**: skills + location from a controlled vocabulary | ✅ |
| **Employer**: job listings (create / edit / delete) with per-role criteria | ✅ |
| Skills & location are **fixed lists** (Malaysia-only locations) both sides | ✅ |
| **Matching engine**: deterministic gatekeeper + Kimi-reasoned match | ✅ |
| **Discover roles + raise hand** — candidate-initiated, still skill-gated | ✅ |
| Gated pipeline, Approve / Reject, one-click consented outreach | ✅ |
| Asynchronous messaging between employer and accepted candidate | ✅ |

## Stack

- **Next.js 15** (App Router, React 19, server actions + route handlers)
- **better-sqlite3** — single-file SQLite at `data/career-os.db`, migrated on first boot
- **Vitest** — unit tests for the pure domain logic and password hashing
- No CSS framework: a small OKLCH design system in `src/app/globals.css`

## Run it

```bash
npm install
cp .env.example .env      # works as-is; offline AI fallback if no key
npm run dev               # http://localhost:3000
```

Set `KIMI_API_KEY` in `.env` to use the real Kimi "Improve & Expand" engine. Without a key, the Living Ledger uses a built-in deterministic refiner so the whole flow stays functional offline. The UI is honest about which path produced each bullet.

Verify the key without booting the app:

```bash
npm run kimi:check
```

It pings the configured endpoint and both Moonshot regions. If every endpoint returns 401, the key is invalid or revoked — generate a fresh one (global: platform.moonshot.ai → API Keys; China: platform.moonshot.cn) and match `KIMI_BASE_URL` to that region.

**Résumé import / export.** On the ledger, *Import résumé* accepts a PDF, `.txt`, or `.md` file (or pasted text); it splits the document into draft entries (Kimi, with an offline line-splitter fallback) without inventing anything — you then refine them like any other entry. On the CV page, *Download PDF* uses the browser print pipeline against a print stylesheet, and *Download Markdown* exports a portable `.md`.

```bash
npm test                  # run the unit suite
npm run build             # production build
```

## How the Living Ledger works

1. **Log** a rough entry — type (project / decision / leadership / skill / win) + raw text. No friction, no required structure.
2. **Improve & Expand** runs the entry through Kimi (or the offline refiner). It extracts a title, impact, real metrics, skills, scope, and one resume-ready bullet — **never inventing numbers** the user didn't state.
3. The **CV** page compiles all refined entries live, grouped by type, with a deduped skills list.

The refinement contract (prompt + strict JSON parsing + offline fallback) lives in `src/lib/entries-core.ts` and is fully unit-tested, so the extraction logic is verifiable without network access.

## How matching works (the gatekeeper)

Skills and locations are **controlled vocabularies** (`src/lib/taxonomy.ts`): candidates pick their profile skills + location from the same fixed lists employers pick job criteria from, so matching compares like-for-like with no fuzzy string guessing. Locations are Malaysia-only (states + federal territories). A candidate's *profile skills* — not the Kimi-extracted entry tags — are the matching surface.

Matching is two honest stages, never a black-box score:

1. **Deterministic prequalifier** (`src/lib/matching-core.ts` → `prequalify`) — a candidate only *surfaces* when their on-list profile skills overlap the role's criteria: at least one required skill (or, for a role with no required skills, two nice-to-haves). This is the gate; it runs with no AI.
2. **Worded assessment** — for candidates who pass the gate, Kimi reads their actual logged bullets against the role and the wanted *trajectory*, returning a plain-language reason, the assumptions it rests on, and a fit expressed in words (`strong` / `promising` / `worth a look`). No key set → a deterministic offline assessment is used instead, and the UI says so.

The employer reviews surfaced candidates and **Approves** (which sends one consented outreach message and opens a thread) or rejects. Re-running the engine never overwrites a decision. The candidate sees the request with its reason and chooses to engage or pass.

**Both directions.** Employers run *Find matches*; candidates browse `/discover` (only roles their profile skills match) and *Raise your hand* to enter that pipeline flagged as candidate-initiated. The employer sees a "✋ Raised their hand" badge. Express-interest is gated by the same skill match, so it can't become spam.

> **Note:** to be matchable, a candidate must set profile skills at `/profile` (the dashboard nudges them). Kimi still powers the *reason* on each match (offline fallback when no key).

## Project shape

```
src/
  app/
    page.tsx                  landing
    signup/ login/            auth (server actions)
    dashboard/ ledger/ cv/    candidate app
    requests/                 candidate's incoming interview requests
    employer/                 recruiter overview
    employer/jobs/new/        post a role
    employer/jobs/[id]/       edit role + pipeline + threads
    api/entries/              create / refine / delete route handlers
    actions/                  auth, employer, candidate server actions
  lib/
    db.ts                 sqlite singleton + migrations
    auth.ts               sessions (HMAC cookie) + current user + requireRole
    password.ts           scrypt hash/verify (pure, tested)
    users.ts              account creation + credential check
    entries.ts            ledger repository
    entries-core.ts       pure ledger logic (validation, prompt, parse, CV)   ← tested
    jobs.ts               job-listing repository
    matching-core.ts      pure matching logic (gatekeeper, grade, parse)       ← tested
    matching.ts           engine orchestration + matches repository            ← integration-tested
    messages.ts           thread repository
    kimi.ts               Kimi client (refine + match) + offline fallback
    json-extract.ts       shared balanced-JSON extractor
  components/             SiteNav, AppShell, AuthForm, JobForm, LedgerWorkspace,
                          EmployerMatchCard, CandidateRequestCard, MessageThread,
                          StrengthBadge, icons
```

## Next slices

Background/auto matching as candidates refine new entries (today it's an explicit "Find matches" button); customisable outreach templates; richer employer profiles; and the trajectory-landscape view for candidates. The `entries.extracted` JSON column remains the matching surface, so none of this needs a schema change.
