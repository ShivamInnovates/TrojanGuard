import React from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * SimulatedBanner component
 *
 * Outlined honesty disclaimer for synthetic test and demonstration telemetry.
 * Neutral, utilitarian styling with standard alert icon and concise text.
 */
export default function SimulatedBanner({
  message = 'SIMULATED TELEMETRY, NOT MONITORED FROM A REAL HOST.',
  detail = 'All synthetic indicators, behavior profiles, and network streams are deterministic test scenarios.',
  className = '',
}) {
  return (
    <aside
      role="status"
      className={`rounded-[4px] p-2.5 flex items-start gap-2.5 border bg-[var(--color-surface-1)] ${className}`}
      style={{
        borderColor: 'rgba(234, 179, 8, 0.3)',
      }}
    >
      <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[var(--color-risk-medium)]" aria-hidden="true" />
      <div className="flex-1 text-xs">
        <div className="font-mono text-[11px] font-semibold text-[var(--color-risk-medium)]">
          {message}
        </div>
        {detail && (
          <div className="text-[var(--color-text-secondary)] text-[11px] mt-0.5 leading-normal font-sans">
            {detail}
          </div>
        )}
      </div>
    </aside>
  )
}
