'use client';

import { SessionState } from '@/types';
import ProfileCard from './ProfileCard';
import profiles from '@/data/profiles.json';

interface FrozenViewProps {
  session: SessionState;
  onNewSearch: () => void;
}

export default function FrozenView({ session, onNewSearch }: FrozenViewProps) {
  const profileMap = new Map(
    (profiles as Array<{ id: string; [key: string]: unknown }>).map((p) => [p.id, p])
  );

  const { filters, rubric, rankedResults, history, rawQuery } = session;

  return (
    <div className="frozen-page">
      {/* Header */}
      <div className="frozen-header">
        <div className="frozen-badge">
          🔒 Shortlist Frozen
        </div>
        <h1 className="frozen-title">Final Candidate Shortlist</h1>
        <p className="frozen-subtitle">
          This shortlist is locked. {rankedResults.length} candidates · {history.length} refinement round{history.length !== 1 ? 's' : ''}
        </p>
        {rawQuery && (
          <p className="text-muted" style={{ marginTop: 8, fontSize: 14 }}>
            Original query: &ldquo;{rawQuery}&rdquo;
          </p>
        )}
      </div>

      <div className="frozen-grid">
        {/* Left: Filters + Rubric */}
        <div>
          <div className="frozen-panel" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="frozen-panel-title">🎯 Final Filters</h2>

            {filters.skills && filters.skills.length > 0 && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <p className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Skills</p>
                <div className="chip-list">
                  {filters.skills.map((s) => (
                    <span key={s} className="chip">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {(filters.minYearsExperience !== undefined || filters.maxYearsExperience !== undefined) && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <p className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Experience</p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  {filters.minYearsExperience ?? 0} – {filters.maxYearsExperience ?? '∞'} years
                </p>
              </div>
            )}

            {filters.location && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <p className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Location</p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{filters.location}</p>
              </div>
            )}

            {filters.companyTypes && filters.companyTypes.length > 0 && (
              <div>
                <p className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Company Type</p>
                <div className="chip-list">
                  {filters.companyTypes.map((t) => (
                    <span key={t} className="chip company-type">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {!filters.skills?.length && !filters.location && !filters.companyTypes?.length
              && filters.minYearsExperience === undefined && filters.maxYearsExperience === undefined && (
              <p className="text-muted">No hard filters applied — rubric-only scoring</p>
            )}
          </div>

          <div className="frozen-panel">
            <h2 className="frozen-panel-title">📋 Final Rubric</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{rubric}</p>
          </div>

          {history.length > 0 && (
            <div className="frozen-panel" style={{ marginTop: 'var(--space-4)' }}>
              <h2 className="frozen-panel-title">🔄 Refinement Log</h2>
              {history.map((round, i) => (
                <div key={i} style={{ marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: i < history.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Round {i + 1}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 4 }}>
                    &ldquo;{round.feedbackText}&rdquo;
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{round.changeSummary}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Ranked Shortlist */}
        <div>
          <div className="frozen-panel">
            <h2 className="frozen-panel-title">🏆 Ranked Shortlist</h2>
            <div className="profile-cards">
              {rankedResults.map((result, i) => {
                const profile = profileMap.get(result.profileId);
                if (!profile) return null;
                return (
                  <ProfileCard
                    key={result.profileId}
                    rankedProfile={result}
                    profile={profile as unknown as Parameters<typeof ProfileCard>[0]['profile']}
                    rank={i + 1}
                    filterSkills={filters.skills}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="frozen-footer">
        <button
          id="new-search-from-frozen-btn"
          className="btn-primary"
          onClick={onNewSearch}
        >
          Start New Search
        </button>
      </div>
    </div>
  );
}
