// ─── Core domain types ────────────────────────────────────────────────────────

export type CompanyType = 'startup' | 'scaleup' | 'enterprise' | 'agency';

export interface PastCompany {
  company: string;
  company_type: CompanyType;
  title: string;
  years: number;
}

export interface Profile {
  id: string;
  name: string;
  current_title: string;       // was "title" — renamed in profiles.json v2
  skills: string[];
  years_experience: number;
  location: string;
  current_company: string;
  current_company_type: CompanyType;
  past_companies?: PastCompany[];
  education?: string;
  summary: string;
}

export interface Filters {
  skills?: string[];
  minYearsExperience?: number;
  maxYearsExperience?: number;
  location?: string;
  companyTypes?: CompanyType[];
}

export interface RankedProfile {
  profileId: string;
  score: number;       // 0–100, LLM-assigned
  explanation: string; // must cite real profile fields
}

export interface RefinementRound {
  feedbackText: string;
  changeSummary: string; // human-readable diff of what changed and why
}

export type SessionStatus =
  | 'idle'
  | 'thinking'
  | 'reviewing'
  | 'refining'
  | 'frozen'
  | 'error';

export interface SessionState {
  rawQuery: string;
  filters: Filters;
  rubric: string;
  filteredProfileIds: string[];
  rankedResults: RankedProfile[];
  history: RefinementRound[];
  status: SessionStatus;
  lastError?: string;
}

// ─── API response types ────────────────────────────────────────────────────────

export interface ParseResponse {
  filters: Filters;
  rubric: string;
}

export interface ScoreResult {
  profileId: string;
  score: number;
  explanation: string;
}

export interface ScoreResponse {
  results: ScoreResult[];
  filteredCount: number;
}

export interface RefineResponse {
  needsClarification: boolean;
  clarificationQuestion: string | null;
  updatedFilters: Filters | null;
  updatedRubric: string | null;
  changeSummary: string | null;
}

// ─── Error types ───────────────────────────────────────────────────────────────

export type LLMErrorKind = 'timeout' | 'rate_limit' | 'invalid_response' | 'unknown';

export interface LLMError {
  kind: LLMErrorKind;
  message: string;
  retryAfterSeconds?: number; // for rate_limit
}
