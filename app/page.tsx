'use client';

import { useState, useCallback, useRef } from 'react';
import { SessionState, Filters, RankedProfile, LLMError } from '@/types';
import SearchInput from '@/components/SearchInput';
import ThinkingState from '@/components/ThinkingState';
import FiltersPanel from '@/components/FiltersPanel';
import ResultsPanel from '@/components/ResultsPanel';
import FrozenView from '@/components/FrozenView';

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: SessionState = {
  rawQuery: '',
  filters: {},
  rubric: '',
  filteredProfileIds: [],
  rankedResults: [],
  history: [],
  status: 'idle',
};

type ThinkingMode = 'parse' | 'score' | 'refine';

// ─── Page Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [session, setSession] = useState<SessionState>(INITIAL_STATE);
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>('parse');
  const [filteredCount, setFilteredCount] = useState(0);
  const [error, setError] = useState<LLMError | null>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);

  // For retry: store the last attempted action
  const lastAction = useRef<(() => Promise<void>) | null>(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const handleApiError = useCallback((data: { error: string; kind?: string; retryAfterSeconds?: number }) => {
    const llmError: LLMError = {
      kind: (data.kind as LLMError['kind']) ?? 'unknown',
      message: data.error,
      retryAfterSeconds: data.retryAfterSeconds,
    };
    setError(llmError);
    setSession((prev) => ({ ...prev, status: 'reviewing' }));
  }, []);

  // ─── Step 1: Search ───────────────────────────────────────────────────────

  const handleSearch = useCallback(async (query: string) => {
    setError(null);
    setClarificationQuestion(null);
    setSession((prev) => ({ ...prev, rawQuery: query, status: 'thinking' }));
    setThinkingMode('parse');

    const action = async () => {
      // ── Step 1: Parse (free text -> filters + rubric) ──
      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const parseData = await parseRes.json();

      if (!parseRes.ok) {
        handleApiError(parseData);
        return;
      }

      const { filters, rubric } = parseData as { filters: Filters; rubric: string };

      // Persist filters + rubric so sidebar shows them during score loading
      setSession((prev) => ({ ...prev, filters, rubric, status: 'thinking' }));
      setThinkingMode('score');

      // ── Step 2: Auto-score right after parse (no manual "Run Search" needed) ──
      // Use local `filters`/`rubric` from parse response -- NOT session state --
      // to avoid stale closure sending empty filters on the first call.
      const scoreRes = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, rubric }),
      });

      const scoreData = await scoreRes.json();

      if (!scoreRes.ok) {
        // Keep parsed filters visible even on score error
        setSession((prev) => ({ ...prev, filters, rubric, status: 'reviewing' }));
        handleApiError(scoreData);
        return;
      }

      const { results, filteredCount: count } = scoreData as {
        results: RankedProfile[];
        filteredCount: number;
      };

      setFilteredCount(count);
      setSession((prev) => ({
        ...prev,
        filters,
        rubric,
        rankedResults: results,
        filteredProfileIds: results.map((r) => r.profileId),
        status: 'reviewing',
      }));
    };

    lastAction.current = action;
    await action();
  }, [handleApiError]);

  // ─── Step 2: Run Score ────────────────────────────────────────────────────

  const handleRunSearch = useCallback(async () => {
    setError(null);
    setSession((prev) => ({ ...prev, status: 'thinking' }));
    setThinkingMode('score');

    const currentFilters = session.filters;
    const currentRubric = session.rubric;

    const action = async () => {
      const scoreRes = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: currentFilters, rubric: currentRubric }),
      });

      const scoreData = await scoreRes.json();

      if (!scoreRes.ok) {
        handleApiError(scoreData);
        return;
      }

      const { results, filteredCount: count } = scoreData as {
        results: RankedProfile[];
        filteredCount: number;
      };

      setFilteredCount(count);
      setSession((prev) => ({
        ...prev,
        rankedResults: results,
        filteredProfileIds: results.map((r) => r.profileId),
        status: 'reviewing',
      }));
    };

    lastAction.current = action;
    await action();
  }, [session.filters, session.rubric, handleApiError]);

  // ─── Step 3: Refine ───────────────────────────────────────────────────────

  const handleRefine = useCallback(async (feedbackText: string) => {
    setError(null);
    setClarificationQuestion(null);
    setSession((prev) => ({ ...prev, status: 'refining' }));
    setThinkingMode('refine');

    const currentFilters = session.filters;
    const currentRubric = session.rubric;
    const currentResults = session.rankedResults;
    const currentHistory = session.history;

    const action = async () => {
      const refineRes = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: currentFilters,
          rubric: currentRubric,
          rankedResults: currentResults,
          feedbackText,
          history: currentHistory,
        }),
      });

      const refineData = await refineRes.json();

      if (!refineRes.ok) {
        handleApiError(refineData);
        return;
      }

      const {
        needsClarification,
        clarificationQuestion: cq,
        updatedFilters,
        updatedRubric,
        changeSummary,
      } = refineData;

      if (needsClarification) {
        setClarificationQuestion(cq);
        setSession((prev) => ({ ...prev, status: 'reviewing' }));
        return;
      }

      // Update filters + rubric, add to history
      const newHistory = [
        ...currentHistory,
        { feedbackText, changeSummary: changeSummary ?? 'Filters and rubric updated.' },
      ];

      setSession((prev) => ({
        ...prev,
        filters: updatedFilters ?? prev.filters,
        rubric: updatedRubric ?? prev.rubric,
        history: newHistory,
        status: 'thinking',
      }));
      setThinkingMode('score');

      // Re-score with updated filters
      const scoreRes = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: updatedFilters ?? currentFilters, rubric: updatedRubric ?? currentRubric }),
      });

      const scoreData = await scoreRes.json();

      if (!scoreRes.ok) {
        handleApiError(scoreData);
        return;
      }

      const { results, filteredCount: count } = scoreData as {
        results: RankedProfile[];
        filteredCount: number;
      };

      setFilteredCount(count);
      setSession((prev) => ({
        ...prev,
        rankedResults: results,
        filteredProfileIds: results.map((r) => r.profileId),
        status: 'reviewing',
      }));
    };

    lastAction.current = action;
    await action();
  }, [session, handleApiError]);

  // ─── Freeze ───────────────────────────────────────────────────────────────

  const handleFreeze = useCallback(() => {
    setSession((prev) => ({ ...prev, status: 'frozen' }));
  }, []);

  // ─── Reset ────────────────────────────────────────────────────────────────

  const handleNewSearch = useCallback(() => {
    setSession(INITIAL_STATE);
    setError(null);
    setClarificationQuestion(null);
    setFilteredCount(0);
    lastAction.current = null;
  }, []);

  // ─── Error Retry ──────────────────────────────────────────────────────────

  const handleRetryError = useCallback(async () => {
    setError(null);
    if (lastAction.current) {
      await lastAction.current();
    }
  }, []);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  // ─── Filters / Rubric Edit ────────────────────────────────────────────────

  const handleFiltersChange = useCallback((filters: Filters) => {
    setSession((prev) => ({ ...prev, filters }));
  }, []);

  const handleRubricChange = useCallback((rubric: string) => {
    setSession((prev) => ({ ...prev, rubric }));
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  const { status } = session;

  // Frozen view — full page
  if (status === 'frozen') {
    return <FrozenView session={session} onNewSearch={handleNewSearch} />;
  }

  // Idle — landing/search
  if (status === 'idle') {
    return <SearchInput onSearch={handleSearch} />;
  }

  // Thinking (parse phase) — full screen
  if (status === 'thinking' && (thinkingMode === 'parse')) {
    return <ThinkingState mode={thinkingMode} />;
  }

  // Reviewing / Refining — split view
  return (
    <div className="main-layout">
      {/* Sidebar: Filters */}
      <aside className="sidebar" aria-label="Search filters and rubric">
        <FiltersPanel
          filters={session.filters}
          rubric={session.rubric}
          onFiltersChange={handleFiltersChange}
          onRubricChange={handleRubricChange}
          onRunSearch={handleRunSearch}
          isLoading={status === 'thinking' || status === 'refining'}
          onNewSearch={handleNewSearch}
        />
      </aside>

      {/* Main: Results + Refine */}
      <main aria-label="Candidate results">
        {(status === 'thinking' && thinkingMode !== 'parse') || status === 'refining' ? (
          <div style={{ display: 'flex', flex: 1 }}>
            <ThinkingState mode={thinkingMode} />
          </div>
        ) : (
          <ResultsPanel
            rawQuery={session.rawQuery}
            filters={session.filters}
            rubric={session.rubric}
            rankedResults={session.rankedResults}
            filteredCount={filteredCount}
            history={session.history}
            onRefine={handleRefine}
            onFreeze={handleFreeze}
            isRefining={false}
            error={error}
            onRetryError={handleRetryError}
            onDismissError={handleDismissError}
            clarificationQuestion={clarificationQuestion}
          />
        )}
      </main>
    </div>
  );
}
