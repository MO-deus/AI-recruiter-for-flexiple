import { NextRequest, NextResponse } from 'next/server';
import { callLLMWithRetry } from '@/lib/llm';
import { ScoreResponseSchema } from '@/lib/schemas';
import { filterProfiles } from '@/lib/filter';
import { Filters, ScoreResponse, Profile, RankedProfile } from '@/types';
import profiles from '@/data/profiles.json';

// ─── System prompt (mirrors /prompts/score.md) ────────────────────────────────

const SYSTEM_PROMPT = `You are an expert technical recruiter. You will be given:
1. Structured filters (already applied — candidates have already passed the hard filter step)
2. A rubric — describing what an ideal candidate looks like beyond hard filters
3. A list of candidate profiles that passed the filters

Score each candidate against the rubric on a scale of 0–100.

Scoring guide:
- 90–100: Exceptional fit — multiple rubric criteria met, strong signal
- 70–89: Good fit — meets most rubric criteria
- 50–69: Partial fit — meets some rubric criteria but notable gaps
- Below 50: Weak fit — passes hard filters but doesn't match the spirit of the search

Explanation rules (CRITICAL):
- Each explanation MUST cite at least one concrete field from that specific profile: a skill name, company name, years, title, or achievement from their summary.
- No generic praise. Every sentence must be grounded in actual profile data.
- 2–3 sentences maximum.
- Be honest about weak fits.

Return ONLY valid JSON. No markdown, no explanation.

Schema:
{
  "results": [
    {
      "profileId": "string",
      "score": 0,
      "explanation": "string"
    }
  ]
}

Include ALL profiles in results — do not omit any.`;

const SCHEMA_DESCRIPTION = `{
  "results": Array<{
    "profileId": string,
    "score": number (0-100),
    "explanation": string (non-empty, must reference real profile fields)
  }>
}`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: { filters?: Filters; rubric?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { filters, rubric } = body;
  if (!rubric) {
    return NextResponse.json({ error: 'rubric is required' }, { status: 400 });
  }

  // ── Step 1: Deterministic local filtering (no LLM) ──
  const allProfiles = profiles as Profile[];
  const filteredProfiles = filterProfiles(allProfiles, filters ?? {});

  if (filteredProfiles.length === 0) {
    const response: ScoreResponse = {
      filteredCount: 0,
      results: [],
    };
    return NextResponse.json(response);
  }

  // ── Step 2: LLM scoring ──
  const userPrompt = `**Filters applied (hard criteria, already enforced):**
\`\`\`json
${JSON.stringify(filters ?? {}, null, 2)}
\`\`\`

**Rubric (subjective fit criteria):**
${rubric}

**Candidate profiles to score:**
\`\`\`json
${JSON.stringify(filteredProfiles, null, 2)}
\`\`\`

Score each candidate and return results for all ${filteredProfiles.length} profiles.`;

  const result = await callLLMWithRetry(
    SYSTEM_PROMPT,
    userPrompt,
    ScoreResponseSchema,
    SCHEMA_DESCRIPTION,
  );

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message, kind: result.error.kind, retryAfterSeconds: result.error.retryAfterSeconds },
      { status: result.error.kind === 'rate_limit' ? 429 : result.error.kind === 'timeout' ? 504 : 500 }
    );
  }

  // ── Step 3: Sort and take top 5 client-side (done here on server for simplicity) ──
  const sorted: RankedProfile[] = result.data!.results
    .map((r) => ({ profileId: r.profileId, score: r.score, explanation: r.explanation }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const response: ScoreResponse = {
    filteredCount: filteredProfiles.length,
    results: sorted,
  };

  return NextResponse.json(response);
}
