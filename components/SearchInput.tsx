'use client';

import { useState, useCallback } from 'react';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

const PLACEHOLDER_QUERIES = [
  'Senior React engineer with TypeScript experience at a startup, 5+ years, SF or remote',
  'Staff ML engineer with Python and PyTorch, startup or scaleup background, strong research bent',
  'Backend engineer with Go or Rust, 7+ years, comfortable with distributed systems',
  'Full-stack engineer comfortable in ambiguous 0-to-1 environments, startup experience preferred',
];

export default function SearchInput({ onSearch, isLoading = false }: SearchInputProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  }, [query, isLoading, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (query.trim() && !isLoading) {
        onSearch(query.trim());
      }
    }
  }, [query, isLoading, onSearch]);

  const usePlaceholder = useCallback((text: string) => {
    setQuery(text);
  }, []);

  return (
    <div className="search-page">
      <div className="search-hero">
        <div className="search-badge">
          <span className="dot" />
          AI Recruiter
        </div>

        <h1 className="search-title">
          Find the{' '}
          <span className="highlight">perfect candidate</span>
          {' '}with AI
        </h1>

        <p className="search-subtitle">
          Describe who you&apos;re looking for in plain English. The AI extracts structured filters,
          scores candidates, and helps you refine results through natural conversation.
        </p>

        <form className="search-form" onSubmit={handleSubmit} id="search-form">
          <textarea
            id="search-query"
            className="search-textarea"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your ideal candidate... (e.g. Senior React engineer at a startup, 5+ years, SF or remote, strong product instinct)"
            disabled={isLoading}
            autoFocus
          />
          <button
            id="search-submit"
            type="submit"
            className="btn-primary"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <>
                <span className="step-icon spin" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Searching…
              </>
            ) : (
              <>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                Search Candidates
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-6)' }}>
          <p className="text-muted" style={{ marginBottom: 'var(--space-3)' }}>Try an example query:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', justifyContent: 'center' }}>
            {PLACEHOLDER_QUERIES.map((q, i) => (
              <button
                key={i}
                id={`example-query-${i}`}
                className="btn-secondary"
                onClick={() => usePlaceholder(q)}
                disabled={isLoading}
                style={{ fontSize: 12, maxWidth: 280, textAlign: 'left' }}
              >
                {q.length > 60 ? q.slice(0, 60) + '…' : q}
              </button>
            ))}
          </div>
        </div>

        <p className="text-muted" style={{ marginTop: 'var(--space-5)', fontSize: 12 }}>
          Press ⌘+Enter to search instantly
        </p>
      </div>
    </div>
  );
}
