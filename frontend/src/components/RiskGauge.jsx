import React from 'react'

/**
 * RiskGauge component
 *
 * Utilitarian semicircle risk meter (0–100).
 * Flat arc, neutral track, no neon glow or radial drop shadows.
 */
export default function RiskGauge({
  score = 0,
  level = null,
  size = 180,
  strokeWidth = 12,
  label = 'Risk Score',
  className = '',
}) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)))

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

  const radius = (size - strokeWidth * 2) / 2
  const cx = size / 2
  const cy = size / 2 + radius / 2

  const arcLength = Math.PI * radius
  const progressRatio = clampedScore / 100
  const strokeDashoffset = arcLength * (1 - progressRatio)

  const pathD = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      style={{ width: size, height: size * 0.65 }}
    >
      <svg
        width={size}
        height={size * 0.65}
        viewBox={`0 0 ${size} ${size * 0.65}`}
        className="overflow-visible"
        role="img"
        aria-label={`Risk score: ${clampedScore} out of 100, level ${displayLevel}`}
      >
        {/* Background track */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Dynamic score arc */}
        <path
          d={pathD}
          fill="none"
          stroke={colorVar}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>

      {/* Number and level indicator */}
      <div
        className="absolute flex flex-col items-center text-center"
        style={{ bottom: strokeWidth * 0.4 }}
      >
        <span
          className="font-mono text-3xl font-semibold tracking-tight leading-none tabular-nums text-[var(--color-text-primary)]"
        >
          {clampedScore}
        </span>
        <span
          className="font-mono text-[10px] font-medium tracking-wide mt-1 px-1.5 py-0.2 rounded-[2px]"
          style={{
            color: colorVar,
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
          }}
        >
          {displayLevel}
        </span>
      </div>
    </div>
  )
}
