# AI Recruiter — Sourcing Refinement Loop

A full-stack Next.js + TypeScript application that lets a recruiter type one free-text search, get back LLM-generated structured filters + a subjective fit rubric, see a ranked shortlist of matching profiles with field-grounded explanations, and refine that shortlist through natural-language feedback across multiple rounds.

---

## Demo

> 🎬 **[Loom Walkthrough — add link here after recording](#)**
>
> Full loop: free-text search → auto-scored results → refinement round → error recovery → freeze. Under 15 minutes.

---

## Quick Start (2 commands)

```bash
# 1. Set your OpenRouter API key
cp .env.local.example .env.local
# Edit .env.local — add: OPENROUTER_API_KEY=sk-or-v1-...

# 2. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | ✅ Yes | Your OpenRouter key. Get a free one at [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | No | Override the model (default: `nex-agi/nex-n2.5-mini:free`). Browse free models at [openrouter.ai/models?q=free](https://openrouter.ai/models?q=free) |

The key is server-side only — it is never exposed to the browser.

---

## Architecture Overview

```
User Query (free text)
    │
    ▼
POST /api/parse          ← LLM call #1: free text → { filters, rubric }
    │
    ▼ (auto-chained — no manual "Run Search" needed)
    │
POST /api/score          ← Local filter (no LLM) → LLM call #2: score + rank
    │
    ▼
Ranked Results           ← Top 5, each with field-grounded explanation
    │
    ▼
Feedback Input           ← Recruiter types natural-language feedback
    │
    ▼
POST /api/refine         ← LLM call #3: feedback → { updatedFilters, updatedRubric, changeSummary }
    │
    ▼ (auto re-runs /api/score with new filters/rubric)
    │
    ▼
Freeze                   ← Lock session; show clean read-only final summary
```

### State Machine

```
idle → thinking(parse+score) → reviewing
                                    ↑              ↓
                                 refining ←── feedback input
                                                    ↓
                                                 frozen
```

Parse and score are **chained automatically** in a single action — no intermediate "review filters first" step. The sidebar shows filters during score loading; the recruiter can always edit and re-run manually.

### Data Flow

- **`data/profiles.json`** — 48 candidate profiles, loaded server-side only
- **Local filtering (`lib/filter.ts`)** — deterministic, no LLM, runs before scoring
- **LLM calls (`lib/llm.ts`)** — OpenRouter client (OpenAI-compatible SDK), repair-retry logic, typed error handling
- **Zod schemas (`lib/schemas.ts`)** — validate all LLM responses before applying to state
- **Client state (`app/page.tsx`)** — `useState` only, no server sessions, no DB

---

## Filtering Logic

All filtering is a simple predicate pass over `profiles.json` — no LLM involved.

| Field | Logic |
|---|---|
| `skills` | **ANY overlap** — profile must have ≥1 skill matching the filter list (case-insensitive substring) |
| `years_experience` | Inclusive range: `min ≤ years ≤ max` |
| `location` | Case-insensitive substring match |
| `current_company_type` | Exact value membership in `companyTypes` list |

**Why ANY for skills?** Sourcing is about discovery. Using ANY is more forgiving — a recruiter looking for "React, TypeScript" doesn't necessarily need both; AND logic would prematurely shrink the pool. The LLM down-scores profiles that only partially match via the rubric.

---

## LLM Calls

All calls are server-side only via **OpenRouter** (OpenAI-compatible API). Prompts are committed to `/prompts/` for reviewability.

| Route | Prompt | Schema |
|---|---|---|
| `POST /api/parse` | `/prompts/parse.md` | `{ filters, rubric }` |
| `POST /api/score` | `/prompts/score.md` | `{ results: [{ profileId, score, explanation }] }` |
| `POST /api/refine` | `/prompts/refine.md` | `{ needsClarification, clarificationQuestion, updatedFilters, updatedRubric, changeSummary }` |

### Error Handling

| Error | What the user sees | What happens under the hood |
|---|---|---|
| Malformed JSON / Zod fail | — (transparent) | Retry once with repair prompt containing the broken output + schema |
| Repeated failure | `ErrorBanner` — "Malformed data" | Falls back to last-known-good state; app stays usable |
| Timeout (30s) | `ErrorBanner` — timeout + Retry button | `lastAction.current()` re-runs the exact same call |
| Rate limit (429) | `ErrorBanner` — countdown timer | `retryAfterSeconds` shown as live countdown; Retry enabled at 0 |
| Empty filter results | Empty state panel | "Loosen Filters" suggestion; no LLM call wasted |

---

## Decisions Log

### What we prioritized

| Decision | Choice | Why |
|---|---|---|
| **LLM Provider** | OpenRouter (`nex-agi/nex-n2.5-mini:free`) | Free-tier, OpenAI-compatible API — swap model with one env var |
| **Parse → Score chained** | Auto-score after parse | Eliminates confusing "empty results on first search" UX bug |
| **Skills filter** | ANY overlap | More forgiving for sourcing; rubric handles fine-grained scoring |
| **Client state** | `useState` only | No persistence required; avoids server session complexity |
| **Retry pattern** | `lastAction` ref closure | Zero state reconstruction on retry; exact same parameters re-used |
| **Ambiguity handling** | `needsClarification` field in refine schema | LLM-native; no custom classifier needed |
| **Prompts location** | `/prompts/*.md` | Committed, readable, not buried in code |
| **Repair retry** | 1 repair prompt → last-known-good fallback | App is always usable; never a hard crash |
| **Scoring** | Single batched LLM call | 48 profiles max — no chunking needed |
| **Profile enrichment in refine** | Full profile data sent with rankedResults | LLM can reference candidate's actual years/company when interpreting feedback like "too junior" |

### What we cut (scope guardrails)

| Cut | Why |
|---|---|
| Multi-session persistence | Not required by spec; no DB setup overhead |
| Per-profile yes/no UI | Spec calls for chat-only feedback as primary flow |
| Chunked/parallel scoring | Dataset is only 48 profiles — unnecessary complexity |
| Custom feedback-confidence classifier | Delegated to LLM via `needsClarification` |
| Auth / multi-user | Explicitly out of scope |

---

## Recording the Loom Demo

### Setup
1. Install [Loom Desktop](https://www.loom.com/download) (Windows)
2. Ensure `npm run dev` is running and `OPENROUTER_API_KEY` is set in `.env`
3. Open `http://localhost:3000` in a clean browser window

### Script (~10 min)

| Segment | What to show | Time |
|---|---|---|
| **Intro** | Brief verbal overview of the app | 0:00 – 0:30 |
| **Search** | Type a query, show thinking animation, point to filters + score steps, walk through ranked cards | 0:30 – 2:30 |
| **Refinement** | Type feedback in the refine box, show history entry, show updated results | 2:30 – 4:30 |
| **Error recovery** | Temporarily set a bad API key → restart → search → show ErrorBanner → restore key → Retry | 4:30 – 6:30 |
| **Freeze** | Click Freeze, walk through frozen summary view | 6:30 – 7:30 |
| **Code tour** _(optional)_ | `lib/llm.ts` (repair retry), `lib/filter.ts` (no LLM), `app/page.tsx` (state machine) | 7:30 – 10:00 |

**To trigger the error recovery moment:**
```bash
# 1. Set a bad key in .env
OPENROUTER_API_KEY=sk-or-bad-key

# 2. Restart the server
npm run dev

# 3. Search → ErrorBanner appears → restore real key → restart → Retry
```

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── parse/route.ts       # LLM call #1 — free text → filters + rubric
│   │   ├── score/route.ts       # Local filter + LLM call #2 — rank profiles
│   │   └── refine/route.ts      # LLM call #3 — feedback → updated criteria
│   ├── globals.css              # Design system (warm matte dark theme, tokens, animations)
│   ├── layout.tsx
│   └── page.tsx                 # State machine root (idle → thinking → reviewing → frozen)
├── components/
│   ├── SearchInput.tsx          # Landing / idle state with example queries
│   ├── ThinkingState.tsx        # Animated multi-step loading (parse / score / refine modes)
│   ├── FiltersPanel.tsx         # Sticky sidebar — editable filters, rubric, re-run button
│   ├── ProfileCard.tsx          # Score badge, matched skills, past companies, education, explanation
│   ├── ResultsPanel.tsx         # Main results + empty state + refine chat + freeze button
│   ├── RefinementHistory.tsx    # Chronological log of refinement rounds
│   ├── FrozenView.tsx           # Read-only final shortlist summary
│   └── ErrorBanner.tsx          # Timeout / rate-limit countdown / invalid-response recovery
├── lib/
│   ├── llm.ts                   # OpenRouter client (openai SDK) + repair-retry + typed errors
│   ├── filter.ts                # Deterministic ANY-overlap local filter — no LLM
│   └── schemas.ts               # Zod schemas for all 3 LLM response shapes
├── types/
│   └── index.ts                 # All shared TypeScript types (Profile v2, SessionState, LLMError…)
├── data/
│   └── profiles.json            # 48 candidate profiles (current_title, past_companies, education)
├── prompts/
│   ├── parse.md                 # Parse system prompt (reviewable)
│   ├── score.md                 # Score system prompt (reviewable)
│   └── refine.md                # Refine system prompt (reviewable)
└── .env.local.example           # Copy → .env.local, add OPENROUTER_API_KEY
```
