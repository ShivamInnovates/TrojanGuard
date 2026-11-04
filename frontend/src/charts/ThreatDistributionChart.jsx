import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const THREAT_COLORS = {
  Benign: '#22c55e',
  Suspicious: '#f97316',
  'Trojan-like': '#ef4444',
}

/**
 * Custom Tooltip for Dark Theme
 */
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div
        className="px-2.5 py-1.5 rounded-[3px] border text-xs font-mono bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-primary)]"
      >
        <div className="font-medium" style={{ color: data.payload.color || data.color }}>
          {data.name}
        </div>
        <div className="text-[var(--color-text-secondary)] mt-0.5 text-[11px] tabular-nums">
          Count: <span className="font-semibold text-[var(--color-text-primary)]">{data.value}</span>
        </div>
      </div>
    )
  }
  return null
}

/**
 * ThreatDistributionChart component
 *
 * Visualizes threat classifications (Benign, Suspicious, Trojan-like) using Recharts.
 */
export default function ThreatDistributionChart({
  distribution = null,
  height = 240,
  className = '',
}) {
  let chartData = []

  if (Array.isArray(distribution)) {
    chartData = distribution
  } else if (distribution && typeof distribution === 'object') {
    chartData = [
      { name: 'Benign', value: distribution.Benign || 0, color: '#22c55e' },
      { name: 'Suspicious', value: distribution.Suspicious || 0, color: '#f97316' },
      { name: 'Trojan-like', value: distribution['Trojan-like'] || 0, color: '#ef4444' },
    ]
  }

  const total = chartData.reduce((acc, curr) => acc + (curr.value || 0), 0)
  const displayData = total > 0 ? chartData.filter((d) => d.value > 0) : chartData

  if (total === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center p-6 text-xs text-[var(--color-text-muted)] font-mono border rounded-[4px] bg-[var(--color-surface-1)] ${className}`}
        style={{
          height,
          borderColor: 'var(--color-border)',
        }}
      >
        <span>No classification threat data recorded yet</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-[4px] border p-3.5 flex flex-col font-sans bg-[var(--color-surface-1)] ${className}`}
      style={{
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-[var(--color-text-primary)]">
          Threat classification distribution
        </h3>
        <span className="text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums">
          Total: {total}
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
            >
              {displayData.map((entry) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={entry.color || THREAT_COLORS[entry.name] || '#3b82f6'}
                  stroke="var(--color-surface-1)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={32}
              formatter={(value) => (
                <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
