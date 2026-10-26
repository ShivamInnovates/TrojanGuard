import React, { useEffect, useState } from 'react'
import { Server, Clock } from 'lucide-react'
import { getHealth } from '../services/api'

/**
 * Header component
 *
 * Top SOC header bar with live backend status indicator and UTC clock.
 */
export default function Header({ title = 'SOC Workbench', subtitle = null, className = '' }) {
  const [healthStatus, setHealthStatus] = useState('checking') // 'online' | 'offline' | 'checking'
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC')
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let isMounted = true
    getHealth()
      .then((data) => {
        if (isMounted) {
          setHealthStatus(data.status === 'ok' ? 'online' : 'degraded')
        }
      })
      .catch(() => {
        if (isMounted) {
          setHealthStatus('offline')
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  const statusColors = {
    online: {
      text: 'var(--color-risk-low)',
      bg: 'var(--color-risk-low-bg)',
      border: 'hsl(142 50% 25%)',
      label: 'API Online',
    },
    degraded: {
      text: 'var(--color-risk-medium)',
      bg: 'var(--color-risk-medium-bg)',
      border: 'hsl(45 50% 25%)',
      label: 'Degraded',
    },
    offline: {
      text: 'var(--color-risk-critical)',
      bg: 'var(--color-risk-critical-bg)',
      border: 'hsl(0 50% 25%)',
      label: 'Offline (8001)',
    },
    checking: {
      text: 'var(--color-text-muted)',
      bg: 'var(--color-surface-2)',
      border: 'var(--color-border)',
      label: 'Checking API',
    },
  }[healthStatus] || {
    text: 'var(--color-text-muted)',
    bg: 'var(--color-surface-2)',
    border: 'var(--color-border)',
    label: 'Checking',
  }

  return (
    <header
      className={`h-14 px-6 border-b flex items-center justify-between select-none shrink-0 ${className}`}
      style={{
        backgroundColor: 'var(--color-surface-1)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div>
        <h1 className="font-mono text-sm font-bold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] text-[var(--color-text-muted)] -mt-0.5 font-sans">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* UTC Clock */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-text-secondary)] px-2.5 py-1 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
          <Clock size={13} className="text-[var(--color-accent)]" />
          <span>{utcTime || '—'}</span>
        </div>

        {/* Backend Health Pill */}
        <div
          className="flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded"
          style={{
            color: statusColors.text,
            backgroundColor: statusColors.bg,
            border: `1px solid ${statusColors.border}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
            style={{ backgroundColor: statusColors.text }}
          />
          <Server size={12} className="shrink-0" />
          <span>{statusColors.label}</span>
        </div>
      </div>
    </header>
  )
}
