'use client';

import { RefinementRound } from '@/types';

interface RefinementHistoryProps {
  history: RefinementRound[];
}

export default function RefinementHistory({ history }: RefinementHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="history-section">
      <p className="section-label" style={{ marginBottom: 'var(--space-3)' }}>
        Refinement History ({history.length} round{history.length !== 1 ? 's' : ''})
      </p>
      <div>
        {history.map((round, i) => (
          <div key={i} className="history-item" id={`history-round-${i + 1}`}>
            <div className="history-feedback">
              &ldquo;{round.feedbackText}&rdquo;
            </div>
            <div className="history-change">
              {round.changeSummary}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
