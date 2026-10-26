import React from 'react'

/**
 * StatCard component
 *
 * Displays key SOC metrics, telemetry totals, or risk stats.
 * Uses theme surface, border, and typography tokens.
 */
export default function StatCard({
  title,
  value,
  subtitle = null,
  icon: Icon = null,
  accentColor = 'var(--color-accent)',
  trend = null,
  className = '',
}) {
  return (
    <div
      className={`rounded-lg p-4 flex flex-col justify-between transition-all duration-200 border ${className}`}
      style={{
        backgroundColor: 'var(--color-surface-1)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
          {title}
        </span>
        {Icon && (
          <div
            className="w-7 h-7 rounded flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: accentColor,
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {value !== undefined && value !== null ? value : '—'}
        </span>
        {trend && (
          <span
            className="text-xs font-mono font-medium"
            style={{ color: trend.positive ? 'var(--color-risk-low)' : 'var(--color-risk-critical)' }}
          >
            {trend.label}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs text-[var(--color-text-muted)] line-clamp-1">
          {subtitle}
        </div>
      )}
    </div>
  )
}
