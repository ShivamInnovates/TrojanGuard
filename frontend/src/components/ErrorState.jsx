import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

/**
 * ErrorState component
 *
 * Visual error presentation with backend failure details and retry callback.
 * Utilitarian, flat styling without neon glows or oversized icon tiles.
 */
export default function ErrorState({
  title = 'Failed to Load Intelligence',
  message = 'An unexpected error occurred while communicating with the TrojanGuard backend.',
  onRetry = null,
  retryLabel = 'Retry Request',
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`rounded-[4px] border p-5 flex flex-col items-center justify-center text-center bg-[var(--color-surface-1)] ${className}`}
      style={{
        borderColor: 'rgba(239, 68, 68, 0.3)',
      }}
    >
      <AlertCircle size={20} className="text-[var(--color-risk-critical)] mb-2" aria-hidden="true" />

      <h4
        className="text-xs font-semibold font-mono text-[var(--color-risk-critical)]"
      >
        {title}
      </h4>

      <p className="mt-1 text-xs text-[var(--color-text-secondary)] max-w-md leading-normal font-sans">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 rounded-[3px] transition-colors cursor-pointer bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"
        >
          <RefreshCw size={12} className="text-[var(--color-text-muted)]" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  )
}
