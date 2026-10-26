import React from 'react'

/**
 * RiskGauge component
 *
 * SVG semicircle gauge (0–100) representing composite risk score.
 * Color-coded dynamically by risk level using theme tokens.
 * Semicircle path with animated strokeDashoffset.
 */
export default function RiskGauge({
  score = 0,
  level = null,
  size = 200,
  strokeWidth = 16,
  label = 'Risk Score',
  className = '',
}) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)))

  // Determine color and level name from score if level is not explicitly provided
  let colorVar = 'var(--color-risk-low)'
  let derivedLevel = 'LOW'

  if (clampedScore > 80) {
    colorVar = 'var(--color-risk-critical)'
    derivedLevel = 'CRITICAL'
  } else if (clampedScore > 60) {
    colorVar = 'var(--color-risk-high)'
    derivedLevel = 'HIGH'
  } else if (clampedScore > 30) {
    colorVar = 'var(--color-risk-medium)'
    derivedLevel = 'MEDIUM'
  }

  const displayLevel = level ? String(level).toUpperCase() : derivedLevel

  // SVG Geometry calculations
  const radius = (size - strokeWidth * 2) / 2
  const cx = size / 2
  const cy = size / 2 + radius / 2

  // Arc length of semicircle: PI * radius
  const arcLength = Math.PI * radius
  // Offset proportionally: at 0, offset = arcLength; at 100, offset = 0
  const progressRatio = clampedScore / 100
  const strokeDashoffset = arcLength * (1 - progressRatio)

  // Semicircle path from left (180deg) to right (0deg)
  const pathD = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      style={{ width: size, height: size * 0.72 }}
    >
      <svg
        width={size}
        height={size * 0.72}
        viewBox={`0 0 ${size} ${size * 0.72}`}
        className="overflow-visible"
        role="img"
        aria-label={`Risk Gauge showing ${clampedScore} out of 100, level ${displayLevel}`}
      >
        {/* Background track arc */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Dynamic active score arc with transition */}
        <path
          d={pathD}
          fill="none"
          stroke={colorVar}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease',
          }}
        />
      </svg>

      {/* Numerical display and level label in semicircle focal point */}
      <div
        className="absolute flex flex-col items-center text-center"
        style={{ bottom: strokeWidth * 0.6 }}
      >
        <span
          className="font-mono text-4xl font-bold tracking-tight leading-none"
          style={{ color: colorVar }}
        >
          {clampedScore}
        </span>
        <span
          className="font-mono text-xs font-semibold uppercase tracking-wider mt-1 px-2 py-0.5 rounded"
          style={{
            color: colorVar,
            backgroundColor: 'var(--color-bg-base)',
            border: `1px solid var(--color-border)`,
          }}
        >
          {displayLevel}
        </span>
        {label && (
          <span className="text-[10px] text-[var(--color-text-muted)] tracking-wider uppercase mt-1">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
