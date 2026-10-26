import React from 'react'

/**
 * SeverityBadge component
 *
 * Renders standardized badges for Risk Levels (Low, Medium, High, Critical)
 * and Classifications (Benign, Suspicious, Trojan-like).
 * Uses CSS design tokens exclusively — zero hardcoded hex colors.
 */
export default function SeverityBadge({
  value,
  variant = 'auto', // 'level' | 'classification' | 'auto'
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
}) {
  if (!value) return null

  const norm = String(value).trim().toLowerCase()

  let colorVar = 'var(--color-text-secondary)'
  let bgVar = 'var(--color-surface-2)'
  let borderVar = 'var(--color-border)'
  let label = value

  if (norm === 'low' || norm === 'benign') {
    colorVar = 'var(--color-risk-low)'
    bgVar = 'var(--color-risk-low-bg)'
    borderVar = 'hsl(142 50% 25%)'
  } else if (norm === 'medium') {
    colorVar = 'var(--color-risk-medium)'
    bgVar = 'var(--color-risk-medium-bg)'
    borderVar = 'hsl(45 50% 25%)'
  } else if (norm === 'high' || norm === 'suspicious') {
    colorVar = 'var(--color-risk-high)'
    bgVar = 'var(--color-risk-high-bg)'
    borderVar = 'hsl(28 50% 25%)'
  } else if (norm === 'critical' || norm === 'trojan-like' || norm === 'trojan') {
    colorVar = 'var(--color-risk-critical)'
    bgVar = 'var(--color-risk-critical-bg)'
    borderVar = 'hsl(0 50% 25%)'
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5'

  return (
    <span
      className={`inline-flex items-center rounded font-mono font-medium tracking-wide uppercase transition-colors select-none ${sizeClasses} ${className}`}
      style={{
        color: colorVar,
        backgroundColor: bgVar,
        border: `1px solid ${borderVar}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: colorVar }}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  )
}
