import { NextRequest, NextResponse } from 'next/server';
import { callLLMWithRetry } from '@/lib/llm';
import { ParseResponseSchema } from '@/lib/schemas';
import { ParseResponse } from '@/types';

// ─── System prompt (mirrors /prompts/parse.md) ────────────────────────────────

const SYSTEM_PROMPT = `You are an expert technical recruiter assistant. Your job is to parse a recruiter's free-text search query into two parts:

1. **filters** — only objective, measurable attributes that can be matched against a structured profile database:
   - skills: array of specific technical skills, tools, or technologies mentioned
   - minYearsExperience: minimum years of experience (integer)
   - maxYearsExperience: maximum years of experience (integer)
   - location: city, state, or region (string)
   - companyTypes: array of company types from ["startup", "scaleup", "enterprise", "agency"]

2. **rubric** — a short, readable paragraph (2–4 sentences) describing what an ideal candidate looks like. Put everything subjective, contextual, or judgment-based here: culture fit, growth mindset, working style, domain expertise, career trajectory, etc.

Rules:
- Only extract filters explicitly or very clearly implied by the query. Do not guess or hallucinate requirements.
- If no skills/years/location/company types are mentioned, omit those fields entirely.
- The rubric should be concrete and specific to the query, not generic.
- Never repeat in the rubric what is already captured in filters.

Output format: Return ONLY a valid JSON object. No markdown, no explanation.

Schema:
{
  "filters": {
    "skills": ["string"],
    "minYearsExperience": 0,
    "maxYearsExperience": 0,
    "location": "string",
    "companyTypes": ["startup" | "scaleup" | "enterprise" | "agency"]
  },
  "rubric": "string"
}

All filter fields are optional.`;

const SCHEMA_DESCRIPTION = `{
  "filters": {
    "skills"?: string[],
    "minYearsExperience"?: number (integer ≥ 0),
    "maxYearsExperience"?: number (integer ≥ 0),
    "location"?: string,
    "companyTypes"?: Array<"startup" | "scaleup" | "enterprise" | "agency">
  },
  "rubric": string (non-empty)
}`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const userPrompt = `Parse the following recruiter search query:\n\n"""\n${query}\n"""\n\nReturn structured filters and rubric as JSON.`;

  const result = await callLLMWithRetry(
    SYSTEM_PROMPT,
    userPrompt,
    ParseResponseSchema,
    SCHEMA_DESCRIPTION,
  );

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message, kind: result.error.kind, retryAfterSeconds: result.error.retryAfterSeconds },
      { status: result.error.kind === 'rate_limit' ? 429 : result.error.kind === 'timeout' ? 504 : 500 }
    );
  }

  const response: ParseResponse = {
    filters: result.data!.filters,
    rubric: result.data!.rubric,
  };

  return NextResponse.json(response);
}
