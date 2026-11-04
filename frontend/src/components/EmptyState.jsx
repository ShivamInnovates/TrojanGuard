import React from 'react'
import { FolderSearch } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * EmptyState component
 *
 * Utilitarian empty placeholder for analyses, tables, IOCs, and logs.
 * Compact typography and direct actions.
 */
export default function EmptyState({
  icon: Icon = FolderSearch,
  title = 'No Data Available',
  description = 'No analyses or events matching the current criteria were found.',
  action = null,
  actionLabel = null,
  onAction = null,
  actionRoute = null,
  className = '',
}) {
  return (
    <div
      className={`rounded-[4px] border p-8 flex flex-col items-center justify-center text-center bg-[var(--color-surface-1)] ${className}`}
      style={{
        borderColor: 'var(--color-border)',
      }}
    >
      <Icon size={22} className="text-[var(--color-text-muted)] mb-2.5" aria-hidden="true" />
      <h4 className="text-xs font-semibold text-[var(--color-text-primary)] font-mono">
        {title}
      </h4>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)] max-w-sm leading-normal">
        {description}
      </p>

      {action && <div className="mt-3.5">{action}</div>}

      {!action && actionLabel && (
        <div className="mt-3.5">
          {actionRoute ? (
            <Link
              to={actionRoute}
              className="inline-flex items-center px-3 py-1.5 rounded-[3px] text-xs font-mono font-medium text-[var(--color-text-primary)] bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface-3)] transition-colors"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center px-3 py-1.5 rounded-[3px] text-xs font-mono font-medium text-[var(--color-text-primary)] bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface-3)] transition-colors cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
