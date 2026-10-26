import React from 'react'
import { FolderSearch } from 'lucide-react'

/**
 * EmptyState component
 *
 * Clean empty placeholder for analyses, tables, IOCs, and logs.
 */
export default function EmptyState({
  icon: Icon = FolderSearch,
  title = 'No Data Available',
  description = 'No analyses or events matching the current criteria were found.',
  action = null,
  className = '',
}) {
  return (
    <div
      className={`rounded-lg border p-10 flex flex-col items-center justify-center text-center ${className}`}
      style={{
        backgroundColor: 'var(--color-surface-1)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        <Icon size={24} />
      </div>
      <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
        {title}
      </h4>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)] max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
