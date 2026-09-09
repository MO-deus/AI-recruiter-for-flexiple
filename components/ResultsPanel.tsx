'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Filters, RankedProfile, RefinementRound, LLMError } from '@/types';
import ProfileCard from './ProfileCard';
import RefinementHistory from './RefinementHistory';
import ErrorBanner from './ErrorBanner';
import profiles from '@/data/profiles.json';

interface ResultsPanelProps {
  rawQuery: string;
  filters: Filters;
  rubric: string;
  rankedResults: RankedProfile[];
  filteredCount: number;
  history: RefinementRound[];
  onRefine: (feedbackText: string) => void;
  onFreeze: () => void;
  isRefining: boolean;
  error: LLMError | null;
  onRetryError: () => void;
  onDismissError: () => void;
  clarificationQuestion: string | null;
}

export default function ResultsPanel({
  rawQuery,
  filters,
  rubric: _rubric,
  rankedResults,
  filteredCount,
  history,
  onRefine,
  onFreeze,
  isRefining,
  error,
  onRetryError,
  onDismissError,
  clarificationQuestion,
}: ResultsPanelProps) {
  const [feedback, setFeedback] = useState('');
  const refineFormRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to refine area after each round
  useEffect(() => {
    if (history.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [history.length]);

  const handleRefineSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const text = feedback.trim();
    if (!text || isRefining) return;
    onRefine(text);
    setFeedback('');
  }, [feedback, isRefining, onRefine]);

  // Build a map of profileId → Profile for the cards
  const profileMap = new Map(
    (profiles as Array<{ id: string; [key: string]: unknown }>).map((p) => [p.id, p])
  );

  return (
    <div className="main-content">
      {/* Results Header */}
      <div className="results-header">
        <div>
          <h2 className="results-title">Top Candidates</h2>
          <p className="results-meta">
            {filteredCount} profiles matched your filters · showing top {rankedResults.length}
          </p>
          {rawQuery && (
            <p className="results-meta" style={{ marginTop: 2 }}>
              &ldquo;{rawQuery.slice(0, 80)}{rawQuery.length > 80 ? '…' : ''}&rdquo;
            </p>
          )}
        </div>
        <div className="results-actions">
          <button
            id="freeze-btn"
            className="btn-secondary"
            onClick={onFreeze}
            disabled={isRefining || rankedResults.length === 0}
            style={{ borderColor: 'rgba(129, 140, 248, 0.4)', color: 'var(--accent-frozen)' }}
          >
            🔒 Freeze Results
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={onRetryError}
          onDismiss={onDismissError}
        />
      )}

      {/* Clarification Banner */}
      {clarificationQuestion && (
        <div className="clarification-banner" id="clarification-banner">
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-warning)', marginBottom: 4 }}>
            Needs Clarification
          </p>
          <p className="clarification-question">{clarificationQuestion}</p>
        </div>
      )}

      {/* Refinement History */}
      {history.length > 0 && <RefinementHistory history={history} />}

      {/* Results */}
      {rankedResults.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3 className="empty-title">No candidates match your filters</h3>
          <p className="empty-desc">
            Your current filters are too restrictive — only {filteredCount} profile{filteredCount !== 1 ? 's' : ''} passed the hard filter step and none scored highly enough.
            Try loosening the skills list, expanding the years-experience range, or removing the location filter.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button
              id="loosen-filters-hint"
              className="btn-secondary"
              onClick={() => onRefine('Please loosen the filters to show more candidates')}
              disabled={isRefining}
            >
              💡 Loosen Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="profile-cards" role="list">
          {rankedResults.map((result, i) => {
            const profile = profileMap.get(result.profileId);
            if (!profile) return null;
            return (
              <div key={result.profileId} role="listitem" style={{ position: 'relative' }}>
                <ProfileCard
                  rankedProfile={result}
                  profile={profile as unknown as Parameters<typeof ProfileCard>[0]['profile']}
                  rank={i + 1}
                  filterSkills={filters.skills}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Refine Chat */}
      <div className="refine-section" ref={bottomRef}>
        <p className="refine-header">Refine your search</p>
        <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
          Give feedback on the results and I&apos;ll update the filters and rubric.
          E.g. &ldquo;#1 is too junior, #2 and #3 look right — find more like them&rdquo;
        </p>
        <form
          id="refine-form"
          ref={refineFormRef}
          className="refine-form"
          onSubmit={handleRefineSubmit}
        >
          <input
            id="refine-input"
            type="text"
            className="refine-input"
            placeholder="e.g. Candidate 1 is too junior, prefer startup experience..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isRefining}
          />
          <button
            id="refine-submit-btn"
            type="submit"
            className="btn-primary"
            disabled={isRefining || !feedback.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {isRefining ? (
              <>
                <span className="step-icon spin" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Refining…
              </>
            ) : (
              'Refine →'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
