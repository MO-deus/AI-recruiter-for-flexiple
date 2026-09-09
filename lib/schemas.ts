import { z } from 'zod';

// ─── Shared sub-schemas ────────────────────────────────────────────────────────

export const CompanyTypeSchema = z.enum(['startup', 'scaleup', 'enterprise', 'agency']);

export const FiltersSchema = z.object({
  skills: z.array(z.string()).optional(),
  minYearsExperience: z.number().int().min(0).optional(),
  maxYearsExperience: z.number().int().min(0).optional(),
  location: z.string().optional(),
  companyTypes: z.array(CompanyTypeSchema).optional(),
});

// ─── 5.1 Parse: free text → filters + rubric ─────────────────────────────────

export const ParseResponseSchema = z.object({
  filters: FiltersSchema,
  rubric: z.string().min(1, 'Rubric must not be empty'),
});

export type ParseResponseZod = z.infer<typeof ParseResponseSchema>;

// ─── 5.2 Score: profiles → ranked results ─────────────────────────────────────

export const ScoreResultSchema = z.object({
  profileId: z.string(),
  score: z.number().min(0).max(100),
  explanation: z.string().min(1),
});

export const ScoreResponseSchema = z.object({
  results: z.array(ScoreResultSchema),
});

export type ScoreResponseZod = z.infer<typeof ScoreResponseSchema>;

// ─── 5.3 Refine: feedback → updated filters + rubric ─────────────────────────

export const RefineResponseSchema = z.object({
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().nullable(),
  updatedFilters: FiltersSchema.nullable(),
  updatedRubric: z.string().nullable(),
  changeSummary: z.string().nullable(),
}).refine(
  (data) => {
    if (!data.needsClarification) {
      return data.updatedFilters !== null && data.updatedRubric !== null && data.changeSummary !== null;
    }
    return true;
  },
  {
    message: 'When needsClarification is false, updatedFilters, updatedRubric, and changeSummary must all be non-null',
  }
);

export type RefineResponseZod = z.infer<typeof RefineResponseSchema>;
