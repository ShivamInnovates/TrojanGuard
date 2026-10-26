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
  Benign: 'var(--color-risk-low)',
  Suspicious: 'var(--color-risk-high)',
  'Trojan-like': 'var(--color-risk-critical)',
}

/**
 * Custom Tooltip for Dark Theme
 */
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div
        className="px-3 py-2 rounded border text-xs font-mono shadow-md"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
      >
        <div className="font-semibold" style={{ color: data.payload.color || data.color }}>
          {data.name}
        </div>
        <div className="text-[var(--color-text-secondary)] mt-0.5">
          Count: <span className="font-bold text-[var(--color-text-primary)]">{data.value}</span>
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
  distribution = null, // object { Benign: 5, Suspicious: 2, 'Trojan-like': 3 } or array
  height = 240,
  className = '',
}) {
  let chartData = []

  if (Array.isArray(distribution)) {
    chartData = distribution
  } else if (distribution && typeof distribution === 'object') {
    chartData = [
      { name: 'Benign', value: distribution.Benign || 0, color: 'var(--color-risk-low)' },
      { name: 'Suspicious', value: distribution.Suspicious || 0, color: 'var(--color-risk-high)' },
      { name: 'Trojan-like', value: distribution['Trojan-like'] || 0, color: 'var(--color-risk-critical)' },
    ]
  }

  // Filter out zero entries if total > 0, otherwise keep zeros
  const total = chartData.reduce((acc, curr) => acc + (curr.value || 0), 0)
  const displayData = total > 0 ? chartData.filter((d) => d.value > 0) : chartData

  if (total === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center p-6 text-xs text-[var(--color-text-muted)] font-mono border rounded-lg ${className}`}
        style={{
          height,
          backgroundColor: 'var(--color-surface-1)',
          borderColor: 'var(--color-border)',
        }}
      >
        <span>No classification threat data recorded yet</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border p-4 flex flex-col font-sans ${className}`}
      style={{
        backgroundColor: 'var(--color-surface-1)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
          Threat Classification Distribution
        </h3>
        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
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
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {displayData.map((entry) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={entry.color || THREAT_COLORS[entry.name] || 'var(--color-accent)'}
                  stroke="var(--color-surface-1)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-xs font-mono text-[var(--color-text-secondary)]">
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
