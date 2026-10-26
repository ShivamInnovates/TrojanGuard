import React from 'react'
import { AlertTriangle, Info } from 'lucide-react'

/**
 * SimulatedBanner component
 *
 * Prominent visual disclaimer alerting analysts that the presented telemetry,
 * events, or sample identifiers are synthetic and simulated for demonstration,
 * testing, and validation purposes only.
 */
export default function SimulatedBanner({
  message = 'Simulated telemetry, not monitored from a real host.',
  detail = 'All synthetic indicators, behavior profiles, and network streams are deterministic test scenarios.',
  className = '',
}) {
  return (
    <aside
      role="status"
      className={`rounded-md p-3 flex items-start gap-3 border ${className}`}
      style={{
        backgroundColor: 'var(--color-risk-medium-bg)',
        borderColor: 'hsl(45 50% 25%)',
        color: 'var(--color-risk-medium)',
      }}
    >
      <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 text-xs">
        <div className="font-semibold tracking-wide uppercase font-mono">
          {message}
        </div>
        {detail && (
          <div className="text-[var(--color-text-secondary)] mt-0.5 leading-relaxed font-sans">
            {detail}
          </div>
        )}
      </div>
    </aside>
  )
}
