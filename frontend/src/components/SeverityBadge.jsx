import React from 'react'

/**
 * SeverityBadge component
 *
 * Renders standardized chips for Risk Levels and Classifications.
 * Calm, low-contrast utilitarian style with 6px indicator dot and subtle borders.
 */
export default function SeverityBadge({
  value,
  source = null,
  label = null,
  variant = 'auto',
  size = 'md',
  className = '',
}) {
  if (!value) return null

  const norm = String(value).trim().toLowerCase()

  let colorVar = 'var(--color-text-secondary)'
  let bgVar = 'var(--color-surface-2)'
  let borderVar = 'var(--color-border)'

  let displayLabel = label
  if (!displayLabel) {
    if (source === 'upload' && norm === 'benign') {
      displayLabel = 'No indicators found (limited static analysis)'
    } else {
      displayLabel = value
    }
  }

  if (norm === 'low' || norm === 'benign') {
    colorVar = 'var(--color-risk-low)'
    bgVar = 'var(--color-risk-low-bg)'
    borderVar = 'rgba(34, 197, 94, 0.25)'
  } else if (norm === 'medium') {
    colorVar = 'var(--color-risk-medium)'
    bgVar = 'var(--color-risk-medium-bg)'
    borderVar = 'rgba(234, 179, 8, 0.25)'
  } else if (norm === 'high' || norm === 'suspicious') {
    colorVar = 'var(--color-risk-high)'
    bgVar = 'var(--color-risk-high-bg)'
    borderVar = 'rgba(249, 115, 22, 0.25)'
  } else if (norm === 'critical' || norm === 'trojan-like' || norm === 'trojan') {
    colorVar = 'var(--color-risk-critical)'
    bgVar = 'var(--color-risk-critical-bg)'
    borderVar = 'rgba(239, 68, 68, 0.25)'
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-[11px] px-2 py-0.5 gap-1.5',
    lg: 'text-xs px-2.5 py-1 gap-2 font-medium',
  }[size] || 'text-[11px] px-2 py-0.5 gap-1.5'

  return (
    <span
      className={`inline-flex items-center rounded-[3px] font-mono select-none text-left leading-normal ${sizeClasses} ${className}`}
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
      <span className="truncate">{displayLabel}</span>
    </span>
  )
}
