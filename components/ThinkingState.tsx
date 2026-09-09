'use client';

import { useEffect, useState } from 'react';

type ThinkingStep = {
  id: string;
  label: string;
  sub: string;
};

const PARSE_STEPS: ThinkingStep[] = [
  { id: 'parse', label: 'Parsing your query', sub: 'Extracting filters and rubric from your description…' },
];

const SCORE_STEPS: ThinkingStep[] = [
  { id: 'filter', label: 'Filtering candidates', sub: 'Running local filter predicates over 48 profiles…' },
  { id: 'score', label: 'Scoring matches', sub: 'LLM scoring each candidate against your rubric…' },
  { id: 'rank', label: 'Ranking results', sub: 'Sorting by fit score and preparing explanations…' },
];

const REFINE_STEPS: ThinkingStep[] = [
  { id: 'interpret', label: 'Interpreting feedback', sub: 'Understanding what you want to change…' },
  { id: 'update', label: 'Updating criteria', sub: 'Adjusting filters and rubric based on your feedback…' },
  { id: 'rescore', label: 'Re-scoring candidates', sub: 'Running the updated search…' },
];

type ThinkingMode = 'parse' | 'score' | 'refine';

interface ThinkingStateProps {
  mode?: ThinkingMode;
}

export default function ThinkingState({ mode = 'parse' }: ThinkingStateProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = mode === 'parse' ? PARSE_STEPS : mode === 'refine' ? REFINE_STEPS : SCORE_STEPS;

  useEffect(() => {
    setActiveStep(0);
    setCompletedSteps([]);

    if (steps.length <= 1) return;

    let current = 0;
    const interval = setInterval(() => {
      setCompletedSteps((prev) => [...prev, current]);
      current++;
      if (current < steps.length) {
        setActiveStep(current);
      } else {
        clearInterval(interval);
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [mode, steps.length]);

  const labels: Record<ThinkingMode, string> = {
    parse: 'Parsing your query…',
    score: 'Finding candidates…',
    refine: 'Refining your search…',
  };

  return (
    <div className="thinking-page">
      <div className="thinking-orb" />

      <div style={{ textAlign: 'center' }}>
        <p className="thinking-label">{labels[mode]}</p>
        <p className="thinking-sub">This usually takes a few seconds</p>
      </div>

      <div className="thinking-steps">
        {steps.map((step, i) => {
          const isDone = completedSteps.includes(i);
          const isActive = activeStep === i && !isDone;

          return (
            <div
              key={step.id}
              className={`thinking-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
            >
              {isDone ? (
                <div className="step-icon check">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : isActive ? (
                <div className="step-icon spin" />
              ) : (
                <div
                  className="step-icon"
                  style={{
                    background: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                  }}
                />
              )}

              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? 'var(--text-primary)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                  {step.label}
                </div>
                {isActive && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {step.sub}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
