import React, { useEffect, useRef, useState } from 'react'
import { Terminal, ArrowDownCircle, Pause, Play } from 'lucide-react'
import SeverityBadge from './SeverityBadge'

/**
 * EventStream component
 *
 * Real-time event log viewer for streaming demo progression and telemetry feeds.
 * Displays timestamp, severity, event type, description, SIMULATED tag, and auto-scroll.
 */
export default function EventStream({
  events = [],
  title = 'Live Telemetry Stream',
  maxHeight = '340px',
  emptyMessage = 'No telemetry events recorded yet.',
  className = '',
}) {
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [events, autoScroll])

  return (
    <div
      className={`rounded-lg border flex flex-col overflow-hidden font-sans ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-subtle)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Stream Header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between border-b shrink-0"
        style={{
          backgroundColor: 'var(--color-surface-1)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal size={15} className="text-[var(--color-accent)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
            {title}
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded text-[var(--color-text-muted)] bg-[var(--color-surface-2)]">
            {events.length} events
          </span>
        </div>

        <button
          type="button"
          onClick={() => setAutoScroll((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded transition-colors"
          style={{
            backgroundColor: autoScroll ? 'var(--color-accent-subtle)' : 'var(--color-surface-2)',
            color: autoScroll ? 'var(--color-accent)' : 'var(--color-text-muted)',
            border: `1px solid ${autoScroll ? 'var(--color-accent-dim)' : 'var(--color-border)'}`,
          }}
          title={autoScroll ? 'Pause auto-scroll' : 'Enable auto-scroll'}
        >
          {autoScroll ? <Pause size={12} /> : <Play size={12} />}
          <span>{autoScroll ? 'Auto-scroll ON' : 'Paused'}</span>
        </button>
      </div>

      {/* Stream Event List */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs select-text"
        style={{ maxHeight }}
      >
        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
            {emptyMessage}
          </div>
        ) : (
          events.map((ev, idx) => {
            const timeStr = ev.timestamp
              ? ev.timestamp.includes('T')
                ? ev.timestamp.split('T')[1].replace('Z', '')
                : ev.timestamp
              : `+${ev.offset_seconds || idx}s`

            return (
              <div
                key={ev.id || `${idx}-${ev.timestamp}-${ev.event_type}`}
                className="flex items-start gap-2.5 p-2 rounded transition-colors hover:bg-[var(--color-surface-1)] border border-transparent hover:border-[var(--color-border-subtle)]"
              >
                {/* Timestamp */}
                <span className="text-[var(--color-text-muted)] shrink-0 text-[11px] pt-0.5 w-18">
                  {timeStr}
                </span>

                {/* Severity Badge */}
                <div className="shrink-0">
                  <SeverityBadge value={ev.severity || 'low'} size="sm" />
                </div>

                {/* Event Category / Type */}
                <span className="text-[var(--color-accent)] font-semibold shrink-0 pt-0.5 max-w-[140px] truncate">
                  {ev.event_type}
                </span>

                {/* Description */}
                <span className="flex-1 text-[var(--color-text-secondary)] font-sans text-xs break-words pt-0.5">
                  {ev.description}
                </span>

                {/* SIMULATED indicator */}
                {(ev.is_simulated === 1 || ev.is_simulated === true) && (
                  <span
                    className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold"
                    style={{
                      color: 'var(--color-risk-medium)',
                      backgroundColor: 'var(--color-risk-medium-bg)',
                      border: '1px solid hsl(45 50% 25%)',
                    }}
                  >
                    SIMULATED
                  </span>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
