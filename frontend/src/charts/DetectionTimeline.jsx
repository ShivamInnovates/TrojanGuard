import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

/**
 * Custom Tooltip for Detection Timeline
 */
function CustomTimelineTooltip({ active, payload, label }) {
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
        <div className="font-semibold text-[var(--color-text-primary)] mb-1">
          {label}
        </div>
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[var(--color-text-secondary)]">
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
 * DetectionTimeline component
 *
 * Chronological detection trend chart showing analysis volume by classification.
 */
export default function DetectionTimeline({
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
        <span>No chronological detection timeline recorded yet</span>
      </div>
    )
  }

  // Format data
  const chartData = data.map((item) => {
    let displayTime = item.timestamp || '—'
    if (displayTime.includes('T')) {
      displayTime = displayTime.split('T')[1].slice(0, 5)
    } else if (displayTime.includes(' ')) {
      displayTime = displayTime.split(' ')[1]
    }
    return {
      time: displayTime,
      'Trojan-like': item.trojan || 0,
      Suspicious: item.suspicious || 0,
      Benign: item.benign || 0,
    }
  })

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
          Detection Timeline (Volume over Time)
        </h3>
        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
          {data.length} intervals
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
            <XAxis
              dataKey="time"
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
            <Tooltip content={<CustomTimelineTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={30}
              formatter={(val) => (
                <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                  {val}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="Trojan-like"
              stackId="1"
              stroke="var(--color-risk-critical)"
              fill="var(--color-risk-critical-bg)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Suspicious"
              stackId="1"
              stroke="var(--color-risk-high)"
              fill="var(--color-risk-high-bg)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Benign"
              stackId="1"
              stroke="var(--color-risk-low)"
              fill="var(--color-risk-low-bg)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
