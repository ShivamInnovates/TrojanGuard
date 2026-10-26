import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

/**
 * Custom Tooltip for Network Activity
 */
function CustomNetworkTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded border text-xs font-mono shadow-md"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
      >
        <div className="font-semibold text-[var(--color-accent)] mb-1">
          {label}
        </div>
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[var(--color-text-secondary)] capitalize">
              {item.name}:
            </span>
            <span className="font-bold text-[var(--color-text-primary)]">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

/**
 * NetworkActivityChart component
 *
 * Visualizes outbound network connections and DNS queries.
 */
export default function NetworkActivityChart({
  data = [],
  height = 240,
  className = '',
}) {
  if (!data || data.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center p-6 text-xs text-[var(--color-text-muted)] font-mono border rounded-lg ${className}`}
        style={{
          height,
          backgroundColor: 'var(--color-surface-1)',
          borderColor: 'var(--color-border)',
        }}
      >
        <span>No network telemetry recorded yet</span>
      </div>
    )
  }

  // Format data for display
  const chartData = data.map((item, idx) => ({
    name: item.filename
      ? item.filename.length > 14
        ? `${item.filename.slice(0, 12)}...`
        : item.filename
      : `Sample #${item.analysis_id || idx + 1}`,
    Connections: item.connections || 0,
    'DNS Queries': item.dns_queries || 0,
  }))

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
          Network Activity & Telemetry
        </h3>
        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
          {data.length} analyses
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="var(--color-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              stroke="var(--color-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomNetworkTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={30}
              formatter={(val) => (
                <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                  {val}
                </span>
              )}
            />
            <Bar
              dataKey="Connections"
              fill="var(--color-accent)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="DNS Queries"
              fill="var(--color-risk-medium)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
