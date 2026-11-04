import React, { useEffect, useRef, useState } from 'react'
import { Terminal, Pause, Play } from 'lucide-react'
import SeverityBadge from './SeverityBadge'

/**
 * EventStream component
 *
 * Real-time event log viewer for streaming demo progression and telemetry feeds.
 * Dense monospace stream, tabular timestamps, and concise severity chips.
 */
export default function EventStream({
  events = [],
  title = 'Telemetry Stream',
  maxHeight = '320px',
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
      className={`rounded-[4px] border flex flex-col overflow-hidden font-sans bg-[var(--color-bg-base)] ${className}`}
      style={{
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Stream Header */}
      <div
        className="px-3 py-2 flex items-center justify-between border-b shrink-0 bg-[var(--color-surface-1)]"
        style={{
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-[var(--color-text-muted)]" />
          <span className="text-xs font-medium text-[var(--color-text-primary)]">
            {title}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] text-[var(--color-text-muted)] bg-[var(--color-surface-2)] border border-[var(--color-border)] tabular-nums">
            {events.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setAutoScroll((prev) => !prev)}
          className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-[3px] transition-colors cursor-pointer border"
          style={{
            backgroundColor: autoScroll ? 'var(--color-surface-2)' : 'transparent',
            color: autoScroll ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            borderColor: autoScroll ? 'var(--color-border)' : 'transparent',
          }}
          title={autoScroll ? 'Pause auto-scroll' : 'Enable auto-scroll'}
        >
          {autoScroll ? <Pause size={10} /> : <Play size={10} />}
          <span>{autoScroll ? 'Auto-scroll on' : 'Paused'}</span>
        </button>
      </div>

      {/* Stream Event List */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[11px] select-text"
        style={{ maxHeight }}
      >
        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-text-muted)] font-mono">
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
                className="flex items-start gap-2 px-2 py-1 rounded-[2px] transition-colors hover:bg-[var(--color-surface-1)] border border-transparent hover:border-[var(--color-border-subtle)]"
              >
                {/* Timestamp */}
                <span className="text-[var(--color-text-muted)] shrink-0 text-[10px] tabular-nums pt-0.5 w-16">
                  {timeStr}
                </span>

                {/* Severity Badge */}
                <div className="shrink-0">
                  <SeverityBadge value={ev.severity || 'low'} size="sm" />
                </div>

                {/* Event Category / Type */}
                <span className="text-[var(--color-text-primary)] font-medium shrink-0 pt-0.5 max-w-[130px] truncate">
                  {ev.event_type}
                </span>

                {/* Description */}
                <span className="flex-1 text-[var(--color-text-secondary)] font-sans text-xs break-words pt-0.5 leading-snug">
                  {ev.description}
                </span>

                {/* SIMULATED indicator */}
                {(ev.is_simulated === 1 || ev.is_simulated === true) && (
                  <span
                    className="shrink-0 text-[9px] font-mono px-1 py-0.2 rounded-[2px] uppercase text-[var(--color-risk-medium)] bg-[var(--color-risk-medium-bg)] border border-[rgba(234,179,8,0.25)]"
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
