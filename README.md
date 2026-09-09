# AI Recruiter — Sourcing Refinement Loop

A full-stack Next.js + TypeScript application that lets a recruiter type one free-text search, get back LLM-generated structured filters + a subjective fit rubric, see a ranked shortlist of matching profiles with field-grounded explanations, and refine that shortlist through natural-language feedback across multiple rounds.

---

## Quick Start (2 commands)

```bash
# 1. Set your OpenAI API key
cp .env.local.example .env.local
# Edit .env.local and add your key: OPENAI_API_KEY=sk-...

# 2. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Your Google Gemini API key. Get a free one at [aistudio.google.com](https://aistudio.google.com/app/apikey) |

The key is server-side only — it is never exposed to the browser.

---

## Architecture Overview

```
User Query (free text)
    │
    ▼
POST /api/parse          ← LLM call #1: free text → { filters, rubric }
    │
    ▼
Review & Edit Filters    ← Recruiter can hand-edit before running
    │
    ▼
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
    ▼ (re-runs /api/score with new filters/rubric)
    │
    ▼
Freeze                   ← Lock session; show clean final summary
```

### State Machine

```
idle → thinking(parse) → reviewing → thinking(score) → reviewing
                                            ↑                  ↓
                                         refining ←──── feedback input
                                                               ↓
                                                            frozen
```

### Data Flow

- **`data/profiles.json`** — 48 fictional candidate profiles, loaded server-side only
- **Local filtering (`lib/filter.ts`)** — deterministic, no LLM, runs before scoring
- **LLM calls (`lib/llm.ts`)** — single client, repair-retry logic, typed error handling
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

**Why ANY for skills?** Sourcing is about discovery. Using ANY is more forgiving — a recruiter looking for "React, TypeScript" doesn't necessarily need both; AND logic would prematurely shrink the pool. The LLM can down-score profiles that only match one skill via the rubric.

---

## LLM Calls

All calls are server-side only. Prompts are committed to `/prompts/` for reviewability.

| Route | Prompt | Schema |
|---|---|---|
| `POST /api/parse` | `/prompts/parse.md` | `{ filters, rubric }` |
| `POST /api/score` | `/prompts/score.md` | `{ results: [{ profileId, score, explanation }] }` |
| `POST /api/refine` | `/prompts/refine.md` | `{ needsClarification, clarificationQuestion, updatedFilters, updatedRubric, changeSummary }` |

### Error Handling

| Error | Handling |
|---|---|
| Malformed JSON / Zod validation failure | Retry once with repair prompt (include schema + broken output) |
| Repeated failure | Fall back to last-known-good state, show inline `ErrorBanner`, keep app usable |
| Timeout (30s) | Show timeout banner with manual retry button |
| Rate limit (429) | Show rate-limit banner with live countdown, auto-retry when timer hits 0 |
| Empty filter set | Designed empty state with "Loosen Filters" suggestion |

---

## Decisions Log

### What we prioritized

| Decision | Choice | Why |
|---|---|---|
| **LLM Provider** | Google Gemini `gemini-2.0-flash` | Free-tier quota, fast, JSON mode via `responseMimeType: application/json` |
| **Skills filter** | ANY overlap | More forgiving for sourcing; LLM handles fine-grained scoring via rubric |
| **Client state** | `useState` only | No persistence required; avoids server session complexity |
| **Ambiguity handling** | `needsClarification` field in refine schema | LLM-native; no custom classifier needed |
| **Prompts location** | `/prompts/*.md` | Committed, readable, not buried in code |
| **Repair retry** | 1 repair prompt → last-known-good fallback | Matches spec exactly; keeps app always usable |
| **Scoring** | Single batched LLM call | 48 profiles max — no chunking needed |
| **Feedback loop** | Full re-derivation of filters+rubric per round | Single source of truth; running `history` array provides context |

### What we cut (scope guardrails)

| Cut | Why |
|---|---|
| Multi-session persistence | Not required by spec; no DB setup overhead |
| Per-profile yes/no UI | Spec calls for chat-only feedback as primary flow |
| Chunked/parallel scoring | Dataset is only 48 profiles — unnecessary complexity |
| Custom feedback-confidence classifier | Delegated to LLM via `needsClarification` |
| Auth / multi-user | Explicitly out of scope |

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── parse/route.ts       # LLM call #1
│   │   ├── score/route.ts       # Local filter + LLM call #2
│   │   └── refine/route.ts      # LLM call #3
│   ├── globals.css              # Design system (dark mode, tokens, animations)
│   ├── layout.tsx
│   └── page.tsx                 # State machine root
├── components/
│   ├── SearchInput.tsx          # Landing / idle state
│   ├── ThinkingState.tsx        # Loading state (never blank screen)
│   ├── FiltersPanel.tsx         # Sidebar — editable filters + rubric
│   ├── ProfileCard.tsx          # Individual candidate card
│   ├── ResultsPanel.tsx         # Main results + refine chat
│   ├── RefinementHistory.tsx    # Past refinement rounds
│   ├── FrozenView.tsx           # Final locked summary
│   └── ErrorBanner.tsx          # All error states
├── lib/
│   ├── llm.ts                   # LLM client + repair retry
│   ├── filter.ts                # Local predicate filtering
│   └── schemas.ts               # Zod schemas for all LLM responses
├── types/
│   └── index.ts                 # All shared TypeScript types
├── data/
│   └── profiles.json            # 48 fictional candidate profiles
└── prompts/
    ├── parse.md                 # Parse prompt (reviewable)
    ├── score.md                 # Score prompt (reviewable)
    └── refine.md                # Refine prompt (reviewable)
```
