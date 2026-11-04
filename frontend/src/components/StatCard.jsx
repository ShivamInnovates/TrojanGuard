import React from 'react'

/**
 * StatCard component
 *
 * Utilitarian metrics tile for SOC dashboards.
 * Dense, flat panel with tabular figures and zero decorative neon tiles.
 */
export default function StatCard({
  title,
  value,
  subtitle = null,
  icon: Icon = null,
  accentColor = null,
  trend = null,
  className = '',
}) {
  return (
    <div
      className={`rounded-[4px] p-3 flex flex-col justify-between border bg-[var(--color-surface-1)] ${className}`}
      style={{
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] font-sans font-medium text-[var(--color-text-secondary)] truncate">
          {title}
        </span>
        {Icon && (
          <Icon size={13} className="text-[var(--color-text-muted)] shrink-0" aria-hidden="true" />
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span
          className="font-mono text-xl font-semibold tracking-tight text-[var(--color-text-primary)] tabular-nums"
          style={accentColor && accentColor !== 'var(--color-accent)' ? { color: accentColor } : undefined}
        >
          {value !== undefined && value !== null ? value : '—'}
        </span>
        {trend && (
          <span
            className="text-[11px] font-mono font-medium tabular-nums"
            style={{ color: trend.positive ? 'var(--color-risk-low)' : 'var(--color-risk-critical)' }}
          >
            {trend.label}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-1 text-[11px] font-sans text-[var(--color-text-muted)] truncate">
          {subtitle}
        </div>
      )}
    </div>
  )
}
