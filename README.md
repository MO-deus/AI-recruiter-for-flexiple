# AI Recruiter — Sourcing Refinement Loop

A full-stack Next.js + TypeScript app that lets a recruiter type one free-text search, get back LLM-generated filters and a fit rubric, see a ranked shortlist with field-grounded explanations, and refine through natural-language feedback — all in a single session.

---

## Demo

> 🎬 **[Loom Walkthrough — add link here after recording](#)**

---

## Setup

```bash
# 1. Clone and install
npm install

# 2. Add your OpenRouter API key
cp .env.local.example .env.local
# Edit .env.local → OPENROUTER_API_KEY=sk-or-v1-...

# 3. Start
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Get a free API key at [openrouter.ai/keys](https://openrouter.ai/keys).

---

## How It Works

One search triggers three LLM calls chained automatically:

```
Free-text query
    │
    ▼
Parse        — LLM extracts structured filters (skills, location, experience, company type)
             and a subjective fit rubric from the raw query
    │
    ▼
Filter       — Deterministic pass over profiles.json (no LLM, no latency)
    │
    ▼
Score        — LLM ranks the filtered candidates 0–100, each with a
             field-grounded explanation citing real profile data
    │
    ▼
Refine       — Recruiter types feedback in plain English; LLM updates
             filters + rubric and re-scores. Repeatable across rounds.
    │
    ▼
Freeze       — Lock the session into a read-only final shortlist
```

All state is in-memory. No database, no login, no persistence across sessions.

---

## Key Technical Decisions

| Decision | What and why |
|---|---|
| **OpenRouter** | Free-tier LLM access via an OpenAI-compatible API. Model swappable with one env var (`OPENROUTER_MODEL`). |
| **Local filtering before LLM scoring** | Hard filters (skills, years, location) run deterministically first — keeps the scored set small and the LLM prompt focused. |
| **Parse → Score auto-chained** | Both run in a single action on submit — no intermediate "Run Search" click needed. |
| **Repair-retry on malformed JSON** | If the LLM returns invalid JSON, one repair prompt is sent before falling back to the last known state. The app never hard-crashes. |
| **All prompts in `/prompts/*.md`** | Committed, readable, not buried in code. |
