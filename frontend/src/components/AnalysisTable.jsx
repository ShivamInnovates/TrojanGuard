import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ChevronRight } from 'lucide-react'
import SeverityBadge from './SeverityBadge'

/**
 * AnalysisTable component
 *
 * Dense, utilitarian tabular list of analyses.
 * Compact row height (~36px), tabular figures, and subtle hover states.
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
      className={`rounded-[4px] border overflow-hidden font-sans bg-[var(--color-surface-1)] ${className}`}
      style={{
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr
              className="border-b font-mono text-[11px] text-[var(--color-text-muted)] select-none bg-[var(--color-surface-2)]"
              style={{
                borderColor: 'var(--color-border)',
              }}
            >
              <th className="py-2 px-3 font-medium w-14">ID</th>
              <th className="py-2 px-3 font-medium">Sample / Target</th>
              <th className="py-2 px-3 font-medium">SHA-256</th>
              <th className="py-2 px-3 font-medium">Classification</th>
              <th className="py-2 px-3 font-medium">Risk Level</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Timestamp (UTC)</th>
              <th className="py-2 px-3 font-medium text-right w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)] font-sans">
            {analyses.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-xs text-[var(--color-text-muted)] font-mono"
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
                    <td className="py-2 px-3 font-mono text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      #{item.id}
                    </td>

                    {/* Filename & Type */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText size={13} className="text-[var(--color-text-muted)] shrink-0 group-hover:text-[var(--color-accent)] transition-colors" />
                        <span className="font-medium text-[var(--color-text-primary)] truncate max-w-[220px]">
                          {item.filename || 'sample.bin'}
                        </span>
                        {item.file_type && (
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded-[2px] bg-[var(--color-surface-3)] text-[var(--color-text-muted)] shrink-0">
                            {item.file_type}
                          </span>
                        )}
                        {(item.analysis_source === 'demo' || item.analysis_source === 'seed_demo') && (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] text-[var(--color-text-muted)] bg-[var(--color-surface-3)] border border-[var(--color-border)] shrink-0"
                            title="Synthetic demonstration telemetry"
                          >
                            Demo data
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SHA-256 */}
                    <td className="py-2 px-3 font-mono text-[11px] text-[var(--color-text-secondary)]">
                      <span title={item.sha256}>{shortSha}</span>
                    </td>

                    {/* Classification */}
                    <td className="py-2 px-3">
                      <SeverityBadge value={item.classification} source={item.analysis_source} size="sm" />
                    </td>

                    {/* Risk Level */}
                    <td className="py-2 px-3">
                      <SeverityBadge value={item.risk_level} size="sm" />
                    </td>

                    {/* Score */}
                    <td className="py-2 px-3 font-mono text-xs font-semibold text-[var(--color-text-primary)] text-right tabular-nums">
                      {item.risk_score}<span className="text-[10px] text-[var(--color-text-muted)] font-normal">/100</span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-2 px-3 font-mono text-[11px] text-[var(--color-text-muted)] whitespace-nowrap tabular-nums">
                      {formattedTime}
                    </td>

                    {/* Action chevron */}
                    <td className="py-2 px-3 text-right">
                      <ChevronRight
                        size={14}
                        className="inline-block text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors"
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
