import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ChevronRight } from 'lucide-react'
import SeverityBadge from './SeverityBadge'

/**
 * AnalysisTable component
 *
 * Clickable tabular display of historical analyses.
 * Rows navigate to /analysis/:id or invoke an onRowClick handler.
 */
export default function AnalysisTable({
  analyses = [],
  onRowClick = null,
  emptyMessage = 'No analyses found.',
  className = '',
}) {
  const navigate = useNavigate()

  const handleRowClick = (item) => {
    if (onRowClick) {
      onRowClick(item)
    } else if (item.id) {
      navigate(`/analysis/${item.id}`)
    }
  }

  return (
    <div
      className={`rounded-lg border overflow-hidden font-sans ${className}`}
      style={{
        backgroundColor: 'var(--color-surface-1)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr
              className="border-b uppercase font-mono text-[11px] text-[var(--color-text-secondary)] select-none"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                borderColor: 'var(--color-border)',
              }}
            >
              <th className="py-3 px-4 font-semibold">ID</th>
              <th className="py-3 px-4 font-semibold">Sample / File</th>
              <th className="py-3 px-4 font-semibold">SHA-256</th>
              <th className="py-3 px-4 font-semibold">Classification</th>
              <th className="py-3 px-4 font-semibold">Risk Level</th>
              <th className="py-3 px-4 font-semibold">Score</th>
              <th className="py-3 px-4 font-semibold">Timestamp</th>
              <th className="py-3 px-4 font-semibold text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)] font-sans">
            {analyses.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-10 text-center text-xs text-[var(--color-text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              analyses.map((item) => {
                const shortSha = item.sha256
                  ? `${item.sha256.slice(0, 10)}...${item.sha256.slice(-8)}`
                  : '—'
                const formattedTime = item.timestamp
                  ? item.timestamp.replace('T', ' ').replace('Z', '')
                  : '—'

                return (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="cursor-pointer transition-colors hover:bg-[var(--color-surface-2)] group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleRowClick(item)
                      }
                    }}
                  >
                    {/* ID */}
                    <td className="py-3 px-4 font-mono font-medium text-[var(--color-text-muted)]">
                      #{item.id}
                    </td>

                    {/* Filename & Type */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-[var(--color-accent)] shrink-0" />
                        <span className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors truncate max-w-[200px]">
                          {item.filename || 'sample.bin'}
                        </span>
                        {item.file_type && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] text-[var(--color-text-muted)] uppercase shrink-0">
                            {item.file_type}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SHA-256 */}
                    <td className="py-3 px-4 font-mono text-[11px] text-[var(--color-text-secondary)]">
                      {shortSha}
                    </td>

                    {/* Classification */}
                    <td className="py-3 px-4">
                      <SeverityBadge value={item.classification} />
                    </td>

                    {/* Risk Level */}
                    <td className="py-3 px-4">
                      <SeverityBadge value={item.risk_level} />
                    </td>

                    {/* Score */}
                    <td className="py-3 px-4 font-mono font-bold text-[var(--color-text-primary)]">
                      {item.risk_score}/100
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-[11px] text-[var(--color-text-muted)] whitespace-nowrap">
                      {formattedTime}
                    </td>

                    {/* Action chevron */}
                    <td className="py-3 px-4 text-right">
                      <ChevronRight
                        size={16}
                        className="inline-block text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all"
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
