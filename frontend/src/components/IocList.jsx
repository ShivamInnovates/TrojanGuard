import React, { useState } from 'react'
import { Copy, Check, Hash, Globe, Server, Terminal } from 'lucide-react'

/**
 * IocList component
 *
 * Utilitarian Indicators of Compromise catalog.
 * Dense row layout with copy-to-clipboard actions and subtle SIMULATED labels.
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
    if (t === 'hash') return <Hash size={11} />
    if (t === 'ip') return <Globe size={11} />
    if (t === 'domain') return <Server size={11} />
    return <Terminal size={11} />
  }

  return (
    <div
      className={`rounded-[4px] border p-3 font-sans bg-[var(--color-surface-1)] ${className}`}
      style={{
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-[var(--color-border-subtle)] flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-[var(--color-text-primary)]">
            {title}
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)] tabular-nums">
            {filteredIocs.length}
          </span>
        </div>

        {iocs.length > 5 && (
          <input
            type="text"
            placeholder="Filter indicators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs px-2 py-0.5 rounded-[3px] border font-mono bg-[var(--color-bg-base)] text-[var(--color-text-primary)] border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        )}
      </div>

      {filteredIocs.length === 0 ? (
        <div className="py-6 text-center text-xs text-[var(--color-text-muted)] font-mono">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-1">
          {filteredIocs.map((ioc, idx) => (
            <div
              key={ioc.id || `${idx}-${ioc.type}-${ioc.value}`}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[3px] border transition-colors bg-[var(--color-bg-subtle)] border-[var(--color-border-subtle)] hover:border-[var(--color-border)]"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Type Badge */}
                <span className="flex items-center gap-1 text-[10px] font-mono uppercase px-1.5 py-0.2 rounded-[2px] shrink-0 text-[var(--color-text-muted)] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
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
                    className="text-[9px] font-mono px-1 py-0.2 rounded-[2px] uppercase font-medium text-[var(--color-risk-medium)] bg-[var(--color-risk-medium-bg)] border border-[rgba(234,179,8,0.25)]"
                  >
                    SIMULATED
                  </span>
                )}

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={() => handleCopy(ioc.value)}
                  className="p-1 rounded-[2px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
                  title="Copy indicator value"
                  aria-label={`Copy ${ioc.value}`}
                >
                  {copiedValue === ioc.value ? (
                    <Check size={12} className="text-[var(--color-risk-low)]" />
                  ) : (
                    <Copy size={12} />
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
