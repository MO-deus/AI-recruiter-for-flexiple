import { NextRequest, NextResponse } from 'next/server';
import { callLLMWithRetry } from '@/lib/llm';
import { RefineResponseSchema } from '@/lib/schemas';
import { Filters, RankedProfile, RefinementRound, Profile, RefineResponse } from '@/types';
import profiles from '@/data/profiles.json';

// ─── System prompt (mirrors /prompts/refine.md) ───────────────────────────────

const SYSTEM_PROMPT = `You are an expert technical recruiter assistant helping a recruiter iteratively refine a candidate search.

You will be given:
1. The current structured filters
2. The current rubric
3. The candidate profiles and scores that were just shown to the recruiter
4. The recruiter's free-text feedback about those results
5. A history of previous refinement rounds for context

Your job: interpret the feedback and return updated filters and rubric, or ask a clarification question if the feedback is genuinely too vague.

Interpretation rules:
- Interpret feedback literally and contextually using the actual shown profiles as reference.
- "Too junior" → raise minYearsExperience based on the referenced candidate's actual years.
- "Candidates X and Y are right" → reinforce rubric criteria those candidates exemplify.
- Update the FULL filters and rubric (not a diff) — returned values replace current ones.
- Keep changes minimal: only change what feedback clearly requires.
- changeSummary: concise plain-English explanation of what changed and why, referencing specific candidate data.

Clarification rules:
- Set needsClarification: true ONLY when feedback is genuinely too vague (e.g., "make it better").
- Ask ONE specific, actionable question when clarifying.
- Prefer action over asking — interpret reasonably when possible.

Return ONLY valid JSON. No markdown, no explanation.

Schema:
{
  "needsClarification": boolean,
  "clarificationQuestion": string | null,
  "updatedFilters": { "skills"?: string[], "minYearsExperience"?: number, "maxYearsExperience"?: number, "location"?: string, "companyTypes"?: string[] } | null,
  "updatedRubric": string | null,
  "changeSummary": string | null
}

When needsClarification is true: set clarificationQuestion, all others null.
When needsClarification is false: set clarificationQuestion to null, provide all updated fields.`;

const SCHEMA_DESCRIPTION = `{
  "needsClarification": boolean,
  "clarificationQuestion": string | null,
  "updatedFilters": FiltersObject | null,
  "updatedRubric": string | null,
  "changeSummary": string | null
}
Where FiltersObject has optional fields: skills (string[]), minYearsExperience (number), maxYearsExperience (number), location (string), companyTypes (string[]).
When needsClarification is false, updatedFilters, updatedRubric, and changeSummary must all be non-null.`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: {
    filters?: Filters;
    rubric?: string;
    rankedResults?: RankedProfile[];
    feedbackText?: string;
    history?: RefinementRound[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { filters, rubric, rankedResults, feedbackText, history } = body;
  if (!feedbackText?.trim()) {
    return NextResponse.json({ error: 'feedbackText is required' }, { status: 400 });
  }

  // ── Build shown profiles with full data for context ──
  const allProfiles = profiles as Profile[];
  const shownProfilesWithData = (rankedResults ?? []).map((rp) => {
    const profile = allProfiles.find((p) => p.id === rp.profileId);
    return {
      ...rp,
      profile,
    };
  });

  const userPrompt = `**Current filters:**
\`\`\`json
${JSON.stringify(filters ?? {}, null, 2)}
\`\`\`

**Current rubric:**
${rubric ?? '(none)'}

**Profiles shown to recruiter (with scores and explanations):**
\`\`\`json
${JSON.stringify(shownProfilesWithData, null, 2)}
\`\`\`

**Previous refinement history (for context):**
\`\`\`json
${JSON.stringify(history ?? [], null, 2)}
\`\`\`

**Recruiter's feedback:**
${feedbackText}

Interpret the feedback and return updated filters and rubric, or ask for clarification if needed.`;

  const result = await callLLMWithRetry(
    SYSTEM_PROMPT,
    userPrompt,
    RefineResponseSchema,
    SCHEMA_DESCRIPTION,
  );

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message, kind: result.error.kind, retryAfterSeconds: result.error.retryAfterSeconds },
      { status: result.error.kind === 'rate_limit' ? 429 : result.error.kind === 'timeout' ? 504 : 500 }
    );
  }

  const response: RefineResponse = {
    needsClarification: result.data!.needsClarification,
    clarificationQuestion: result.data!.clarificationQuestion,
    updatedFilters: result.data!.updatedFilters,
    updatedRubric: result.data!.updatedRubric,
    changeSummary: result.data!.changeSummary,
  };

  return NextResponse.json(response);
}
