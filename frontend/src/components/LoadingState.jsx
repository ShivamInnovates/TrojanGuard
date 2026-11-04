import React from 'react'
import { Loader2 } from 'lucide-react'

/**
 * LoadingState component
 *
 * Minimalist SOC loading indicator with compact spinner and operational message.
 */
export default function LoadingState({
  message = 'Loading telemetry & intelligence...',
  size = 'md',
  className = '',
}) {
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 24 : 18

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center select-none ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2
        size={iconSize}
        className="animate-spin text-[var(--color-text-muted)]"
        aria-hidden="true"
      />
      {message && (
        <p className="mt-2 text-xs font-mono text-[var(--color-text-secondary)]">
          {message}
        </p>
      )}
    </div>
  )
}
