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
        className="px-2.5 py-1.5 rounded-[3px] border text-xs font-mono bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-primary)]"
      >
        <div className="font-medium text-[var(--color-text-primary)] mb-1">
          {label}
        </div>
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center gap-1.5 text-[11px] tabular-nums">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[var(--color-text-secondary)]">
              {item.name}:
            </span>
            <span className="font-semibold text-[var(--color-text-primary)]">
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
        className={`flex flex-col items-center justify-center text-center p-6 text-xs text-[var(--color-text-muted)] font-mono border rounded-[4px] bg-[var(--color-surface-1)] ${className}`}
        style={{
          height,
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
      className={`rounded-[4px] border p-3.5 flex flex-col font-sans bg-[var(--color-surface-1)] ${className}`}
      style={{
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-[var(--color-text-primary)]">
          Network activity & telemetry
        </h3>
        <span className="text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums">
          {data.length} analyses
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="var(--color-border-subtle)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="var(--color-text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              stroke="var(--color-text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomNetworkTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={28}
              formatter={(val) => (
                <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                  {val}
                </span>
              )}
            />
            <Bar
              dataKey="Connections"
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="DNS Queries"
              fill="#eab308"
              radius={[2, 2, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
