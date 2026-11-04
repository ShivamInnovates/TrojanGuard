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
        className={`flex flex-col items-center justify-center text-center p-6 text-xs text-[var(--color-text-muted)] font-mono border rounded-[4px] bg-[var(--color-surface-1)] ${className}`}
        style={{
          height,
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
      className={`rounded-[4px] border p-3.5 flex flex-col font-sans bg-[var(--color-surface-1)] ${className}`}
      style={{
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-[var(--color-text-primary)]">
          Detection timeline
        </h3>
        <span className="text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums">
          {data.length} intervals
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="var(--color-border-subtle)" vertical={false} />
            <XAxis
              dataKey="time"
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
            <Tooltip content={<CustomTimelineTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={28}
              formatter={(val) => (
                <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                  {val}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="Trojan-like"
              stackId="1"
              stroke="#ef4444"
              fill="rgba(239, 68, 68, 0.12)"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="Suspicious"
              stackId="1"
              stroke="#f97316"
              fill="rgba(249, 115, 22, 0.12)"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="Benign"
              stackId="1"
              stroke="#22c55e"
              fill="rgba(34, 197, 94, 0.12)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
