import React, { useState } from 'react'
import { Shield, Copy, Check, Hash, Globe, Server, Terminal } from 'lucide-react'

/**
 * IocList component
 *
 * Displays Indicators of Compromise with copy-to-clipboard functionality
 * and a prominent SIMULATED tag per item.
 */
export default function IocList({
  iocs = [],
  title = 'Indicators of Compromise (IOCs)',
  emptyMessage = 'No indicators of compromise extracted for this sample.',
  className = '',
}) {
  const [copiedValue, setCopiedValue] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleCopy = async (val) => {
    try {
      await navigator.clipboard.writeText(val)
      setCopiedValue(val)
      setTimeout(() => setCopiedValue(null), 2000)
    } catch {
      // Fallback
    }
  }

  const filteredIocs = iocs.filter((item) => {
    if (!searchTerm) return true
    return (
      item.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const getTypeIcon = (type) => {
    const t = String(type).toLowerCase()
    if (t === 'hash') return <Hash size={13} />
    if (t === 'ip') return <Globe size={13} />
    if (t === 'domain') return <Server size={13} />
    return <Terminal size={13} />
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
      <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-[var(--color-border-subtle)] flex-wrap">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[var(--color-accent)]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
            {title}
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            {filteredIocs.length} IOCs
          </span>
        </div>

        {iocs.length > 5 && (
          <input
            type="text"
            placeholder="Filter IOCs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs px-2.5 py-1 rounded border font-mono bg-[var(--color-bg-base)] text-[var(--color-text-primary)] border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        )}
      </div>

      {filteredIocs.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIocs.map((ioc, idx) => (
            <div
              key={ioc.id || `${idx}-${ioc.type}-${ioc.value}`}
              className="flex items-center justify-between gap-3 p-2.5 rounded border transition-colors bg-[var(--color-bg-subtle)] border-[var(--color-border-subtle)] hover:border-[var(--color-border)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Type Badge */}
                <span
                  className="flex items-center gap-1 text-[11px] font-mono font-semibold uppercase px-2 py-0.5 rounded shrink-0"
                  style={{
                    backgroundColor: 'var(--color-surface-3)',
                    color: 'var(--color-accent)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {getTypeIcon(ioc.type)}
                  <span>{ioc.type}</span>
                </span>

                {/* IOC Value */}
                <span className="font-mono text-xs text-[var(--color-text-primary)] truncate select-all">
                  {ioc.value}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* SIMULATED tag */}
                {(ioc.is_simulated === 1 || ioc.is_simulated === true) && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold"
                    style={{
                      color: 'var(--color-risk-medium)',
                      backgroundColor: 'var(--color-risk-medium-bg)',
                      border: '1px solid hsl(45 50% 25%)',
                    }}
                  >
                    SIMULATED
                  </span>
                )}

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={() => handleCopy(ioc.value)}
                  className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors"
                  title="Copy indicator value"
                  aria-label={`Copy ${ioc.value}`}
                >
                  {copiedValue === ioc.value ? (
                    <Check size={14} className="text-[var(--color-risk-low)]" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
