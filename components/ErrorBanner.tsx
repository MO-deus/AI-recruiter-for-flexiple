'use client';

import { useEffect, useState, useCallback } from 'react';
import { LLMError } from '@/types';

interface ErrorBannerProps {
  error: LLMError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  const [countdown, setCountdown] = useState<number | null>(
    error.kind === 'rate_limit' && error.retryAfterSeconds
      ? error.retryAfterSeconds
      : null
  );

  useEffect(() => {
    if (error.kind !== 'rate_limit' || !countdown) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [error.kind, countdown]);

  const handleAutoRetry = useCallback(() => {
    if (countdown === 0 && onRetry) {
      onRetry();
    }
  }, [countdown, onRetry]);

  useEffect(() => {
    handleAutoRetry();
  }, [handleAutoRetry]);

  const icons: Record<string, string> = {
    timeout: '⏱️',
    rate_limit: '🚦',
    invalid_response: '⚠️',
    unknown: '❌',
  };

  const titles: Record<string, string> = {
    timeout: 'Request Timed Out',
    rate_limit: 'Rate Limited',
    invalid_response: 'Response Error',
    unknown: 'Something Went Wrong',
  };

  return (
    <div className={`error-banner ${error.kind}`} id="error-banner" role="alert">
      <div className="error-content">
        <span className="error-icon">{icons[error.kind] ?? '❌'}</span>
        <div>
          <div className="error-title">{titles[error.kind] ?? 'Error'}</div>
          <div className="error-message">{error.message}</div>
          {error.kind === 'invalid_response' && (
            <div className="error-message" style={{ marginTop: 4, color: 'var(--text-muted)' }}>
              Last known results have been preserved. You can retry or refine your search.
            </div>
          )}
        </div>
      </div>
      <div className="error-actions">
        {error.kind === 'rate_limit' && countdown !== null && countdown > 0 && (
          <span className="countdown">{countdown}s</span>
        )}
        {onRetry && (
          <button
            id="retry-btn"
            className={error.kind === 'rate_limit' && countdown !== null && countdown > 0
              ? 'btn-secondary'
              : 'btn-primary'
            }
            onClick={onRetry}
            disabled={error.kind === 'rate_limit' && countdown !== null && countdown > 0}
            style={{ fontSize: 13 }}
          >
            {error.kind === 'rate_limit' && countdown !== null && countdown > 0
              ? 'Retrying…'
              : 'Retry'
            }
          </button>
        )}
        {onDismiss && (
          <button
            id="dismiss-error-btn"
            className="btn-secondary"
            onClick={onDismiss}
            style={{ fontSize: 13 }}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
