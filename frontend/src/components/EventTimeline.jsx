import React, { useState } from 'react'
import { Activity, Globe, Cpu, FileText } from 'lucide-react'
import SeverityBadge from './SeverityBadge'

/**
 * EventTimeline component
 *
 * Chronological step-by-step audit trail of host behavioral and network events.
 * Utilitarian log format with category filtering and clear honesty markers.
 */
export default function EventTimeline({
  behaviorEvents = [],
  networkEvents = [],
  className = '',
}) {
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'behavior' | 'network'

  // Combine and sort events chronologically
  const unifiedEvents = [
    ...behaviorEvents.map((b) => ({
      ...b,
      category: 'behavior',
      sortKey: b.timestamp || '',
    })),
    ...networkEvents.map((n) => ({
      ...n,
      category: 'network',
      description: n.description || `${n.protocol} ${n.source} -> ${n.destination}:${n.port} (${n.event_type})`,
      sortKey: n.timestamp || '',
    })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  const filteredEvents = unifiedEvents.filter((ev) => {
    if (activeFilter === 'behavior') return ev.category === 'behavior'
    if (activeFilter === 'network') return ev.category === 'network'
    return true
  })

  const getCategoryIcon = (category, eventType = '') => {
    if (category === 'network') return <Globe size={12} />
    if (eventType.includes('process')) return <Cpu size={12} />
    if (eventType.includes('registry') || eventType.includes('file')) return <FileText size={12} />
    return <Activity size={12} />
  }

  return (
    <div
      className={`rounded-[4px] border p-3 font-sans bg-[var(--color-surface-1)] ${className}`}
      style={{
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Timeline Controls */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-[var(--color-text-primary)]">
            Event Timeline
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)] tabular-nums">
            {filteredEvents.length}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-0.5 rounded-[3px] border border-[var(--color-border-subtle)]">
          {['all', 'behavior', 'network'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className="text-[11px] font-mono capitalize px-2 py-0.5 rounded-[2px] transition-colors cursor-pointer"
              style={{
                backgroundColor: activeFilter === f ? 'var(--color-surface-3)' : 'transparent',
                color: activeFilter === f ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                fontWeight: activeFilter === f ? '500' : '400',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="py-6 text-center text-xs text-[var(--color-text-muted)] font-mono">
          No events recorded for this selection.
        </div>
      ) : (
        <div className="relative pl-5 space-y-2.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[var(--color-border)]">
          {filteredEvents.map((ev, idx) => (
            <div key={ev.id || `${idx}-${ev.sortKey}`} className="relative group">
              {/* Timeline Marker Dot */}
              <div
                className="absolute -left-5 top-1.5 w-4 h-4 rounded-full flex items-center justify-center border text-[var(--color-text-muted)]"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {getCategoryIcon(ev.category, ev.event_type)}
              </div>

              {/* Event Content Panel */}
              <div
                className="p-2.5 rounded-[3px] border transition-colors bg-[var(--color-bg-subtle)] border-[var(--color-border-subtle)] hover:border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-[var(--color-text-primary)]">
                      {ev.event_type}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase">
                      [{ev.category}]
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge value={ev.severity || 'low'} size="sm" />
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)] tabular-nums">
                      {ev.timestamp ? ev.timestamp.replace('T', ' ').replace('Z', '') : '—'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[var(--color-text-secondary)] mt-1 leading-normal break-words font-sans">
                  {ev.description}
                </div>

                {(ev.is_simulated === 1 || ev.is_simulated === true) && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className="text-[9px] font-mono px-1 py-0.2 rounded-[2px] uppercase text-[var(--color-risk-medium)] bg-[var(--color-risk-medium-bg)] border border-[rgba(234,179,8,0.25)]"
                    >
                      SIMULATED TELEMETRY
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
