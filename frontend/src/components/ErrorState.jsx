import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

/**
 * ErrorState component
 *
 * Visual error presentation with backend failure details and retry callback.
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
      className={`rounded-lg border p-6 flex flex-col items-center justify-center text-center ${className}`}
      style={{
        backgroundColor: 'var(--color-risk-critical-bg)',
        borderColor: 'hsl(0 50% 25%)',
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{
          backgroundColor: 'hsl(0 40% 16%)',
          color: 'var(--color-risk-critical)',
          border: '1px solid hsl(0 50% 30%)',
        }}
      >
        <AlertCircle size={24} />
      </div>

      <h4
        className="text-sm font-semibold uppercase tracking-wider font-mono"
        style={{ color: 'var(--color-risk-critical)' }}
      >
        {title}
      </h4>

      <p className="mt-1 text-xs text-[var(--color-text-secondary)] max-w-md leading-relaxed font-sans">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 text-xs font-mono font-medium px-4 py-2 rounded transition-colors shadow-sm cursor-pointer"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-surface-3)'
            e.currentTarget.style.borderColor = 'var(--color-accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
        >
          <RefreshCw size={14} className="text-[var(--color-accent)]" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  )
}
