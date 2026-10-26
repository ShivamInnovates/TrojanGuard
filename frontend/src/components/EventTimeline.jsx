import React, { useState } from 'react'
import { Activity, Globe, Cpu, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react'
import SeverityBadge from './SeverityBadge'

/**
 * EventTimeline component
 *
 * Chronological step-by-step visual audit trail of behavioral and network events.
 * Provides category filters (All, Process/Host, Network) and severity badges.
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
    if (category === 'network') return <Globe size={14} />
    if (eventType.includes('process')) return <Cpu size={14} />
    if (eventType.includes('registry') || eventType.includes('file')) return <FileText size={14} />
    return <Activity size={14} />
  }

  return (
    <div
      className={`rounded-lg border p-4 font-sans ${className}`}
      style={{
        backgroundColor: 'var(--color-surface-1)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Timeline Controls */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[var(--color-accent)]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
            Event Timeline
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            {filteredEvents.length} events
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-0.5 rounded border border-[var(--color-border-subtle)]">
          {['all', 'behavior', 'network'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className="text-xs font-mono uppercase px-2.5 py-1 rounded transition-colors"
              style={{
                backgroundColor: activeFilter === f ? 'var(--color-accent-subtle)' : 'transparent',
                color: activeFilter === f ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontWeight: activeFilter === f ? '600' : '400',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
          No events recorded for this selection.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--color-border)]">
          {filteredEvents.map((ev, idx) => (
            <div key={ev.id || `${idx}-${ev.sortKey}`} className="relative group">
              {/* Timeline Marker Dot */}
              <div
                className="absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  borderColor:
                    ev.severity === 'critical' || ev.severity === 'high'
                      ? 'var(--color-risk-critical)'
                      : ev.severity === 'medium'
                      ? 'var(--color-risk-medium)'
                      : 'var(--color-border)',
                  color:
                    ev.category === 'network'
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                }}
              >
                {getCategoryIcon(ev.category, ev.event_type)}
              </div>

              {/* Event Content Card */}
              <div
                className="p-3 rounded-md border transition-colors bg-[var(--color-bg-subtle)] border-[var(--color-border-subtle)] hover:border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">
                      {ev.event_type}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase">
                      [{ev.category}]
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge value={ev.severity || 'low'} size="sm" />
                    <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                      {ev.timestamp ? ev.timestamp.replace('T', ' ').replace('Z', '') : '—'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[var(--color-text-secondary)] mt-1.5 leading-relaxed break-words font-sans">
                  {ev.description}
                </div>

                {(ev.is_simulated === 1 || ev.is_simulated === true) && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold"
                      style={{
                        color: 'var(--color-risk-medium)',
                        backgroundColor: 'var(--color-risk-medium-bg)',
                        border: '1px solid hsl(45 50% 25%)',
                      }}
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
