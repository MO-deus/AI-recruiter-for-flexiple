import OpenAI from 'openai';
import { ZodSchema, ZodError } from 'zod';
import { LLMError, LLMErrorKind } from '@/types';

// ─── Client (lazy singleton) ──────────────────────────────────────────────────
// OpenRouter is OpenAI-compatible — we use the openai SDK with a custom baseURL.

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set.');
    }
    _client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        // OpenRouter recommends these headers for routing/analytics
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'AI Recruiter - Sourcing Refinement Loop',
      },
    });
  }
  return _client;
}

// ─── Config ───────────────────────────────────────────────────────────────────

// Model: thinkingmachines/inkling-small:free (free tier on OpenRouter)
// Override via OPENROUTER_MODEL env var if needed.
const MODEL = process.env.OPENROUTER_MODEL ?? 'nex-agi/nex-n2.5-mini:free';
const TIMEOUT_MS = 30_000;

// ─── Core LLM call ────────────────────────────────────────────────────────────

/**
 * Makes a single OpenRouter call requesting JSON output.
 * Uses the OpenAI SDK's chat.completions API — OpenRouter is fully compatible.
 */
async function callLLMRaw(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; error?: LLMError }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const client = getClient();

    const response = await client.chat.completions.create(
      {
        model: MODEL,
        temperature: 0.2,       // low temp for consistent structured output
        max_tokens: 4096,
        // response_format: { type: 'json_object' } — not all OpenRouter models support
        // this param, so we rely on prompt-level JSON instructions instead.
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      { signal: controller.signal },
    );

    const text = response.choices[0]?.message?.content ?? '';
    return { text };
  } catch (err: unknown) {
    const error = err as { name?: string; status?: number; message?: string; headers?: Record<string, string> };

    if (error.name === 'AbortError' || error.name === 'APIConnectionTimeoutError') {
      return {
        text: '',
        error: { kind: 'timeout', message: 'Request timed out after 30 seconds.' },
      };
    }

    if (error.status === 401 || error.message?.includes('401') || error.message?.toLowerCase().includes('user not found')) {
      return {
        text: '',
        error: {
          kind: 'unknown',
          message: 'Invalid API key — check your OPENROUTER_API_KEY in .env and restart the server.',
        },
      };
    }

    if (error.status === 429 || error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit')) {
      const retryAfter = error.headers?.['retry-after'];
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
      return {
        text: '',
        error: {
          kind: 'rate_limit',
          message: `Rate limited by OpenRouter. Retry after ${retrySeconds}s.`,
          retryAfterSeconds: retrySeconds,
        },
      };
    }

    return {
      text: '',
      error: {
        kind: 'unknown',
        message: error.message ?? 'Unknown error calling OpenRouter.',
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Parse + validate ─────────────────────────────────────────────────────────

function parseAndValidate<T>(
  text: string,
  schema: ZodSchema<T>,
): { data?: T; parseError?: string } {
  // Strip markdown fences that some models wrap JSON in despite being told not to.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { parseError: `Invalid JSON: ${cleaned.slice(0, 300)}` };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const zodError = result.error as ZodError;
    return { parseError: `Schema validation failed: ${zodError.message}` };
  }

  return { data: result.data };
}

// ─── Public: callLLM with repair retry ───────────────────────────────────────

interface LLMCallResult<T> {
  data?: T;
  error?: LLMError;
  rawResponse?: string;
}

/**
 * Calls OpenRouter with the given prompts, validates against a Zod schema.
 * On validation failure, retries once with a repair prompt.
 * On second failure, returns an error — caller falls back to last-known-good state.
 */
export async function callLLMWithRetry<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: ZodSchema<T>,
  schemaDescription: string,
): Promise<LLMCallResult<T>> {
  // ── Attempt 1 ──
  const attempt1 = await callLLMRaw(systemPrompt, userPrompt);
  if (attempt1.error) {
    return { error: attempt1.error };
  }

  const validation1 = parseAndValidate(attempt1.text, schema);
  if (validation1.data !== undefined) {
    return { data: validation1.data };
  }

  // ── Attempt 2: Repair prompt ──
  const repairUserPrompt = `Your last response was invalid. Here is the error:

${validation1.parseError}

Here is your last response:
\`\`\`
${attempt1.text}
\`\`\`

Please return valid JSON that matches this schema exactly:
${schemaDescription}

Return ONLY valid JSON, no markdown fences, no explanation.`;

  const attempt2 = await callLLMRaw(systemPrompt, repairUserPrompt);
  if (attempt2.error) {
    return { error: attempt2.error, rawResponse: attempt1.text };
  }

  const validation2 = parseAndValidate(attempt2.text, schema);
  if (validation2.data !== undefined) {
    return { data: validation2.data };
  }

  // ── Both failed ──
  return {
    error: {
      kind: 'invalid_response',
      message: 'LLM returned malformed data after repair attempt. Falling back to last known state.',
    },
    rawResponse: attempt2.text,
  };
}

export type { LLMCallResult, LLMErrorKind };
