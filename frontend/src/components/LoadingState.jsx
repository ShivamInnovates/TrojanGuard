import React from 'react'
import { Loader2 } from 'lucide-react'

/**
 * LoadingState component
 *
 * SOC loading indicator with spinner and customizable message.
 */
export default function LoadingState({
  message = 'Loading telemetry & intelligence...',
  size = 'md',
  className = '',
}) {
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 32 : 24

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center select-none ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2
        size={iconSize}
        className="animate-spin text-[var(--color-accent)]"
        aria-hidden="true"
      />
      {message && (
        <p className="mt-3 text-xs font-mono tracking-wide text-[var(--color-text-secondary)]">
          {message}
        </p>
      )}
    </div>
  )
}
