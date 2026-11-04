import React, { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { getHealth } from '../services/api'

/**
 * Header component
 *
 * Utilitarian top workbench header bar with live backend status indicator and UTC clock.
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

  const statusConfig = {
    online: {
      dotColor: 'var(--color-risk-low)',
      label: 'API Connected',
    },
    degraded: {
      dotColor: 'var(--color-risk-medium)',
      label: 'API Degraded',
    },
    offline: {
      dotColor: 'var(--color-risk-critical)',
      label: 'API Offline (8001)',
    },
    checking: {
      dotColor: 'var(--color-text-muted)',
      label: 'Connecting...',
    },
  }[healthStatus] || {
    dotColor: 'var(--color-text-muted)',
    label: 'Checking',
  }

  return (
    <header
      className={`h-12 px-5 border-b flex items-center justify-between select-none shrink-0 ${className}`}
      style={{
        backgroundColor: 'var(--color-surface-1)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-xs font-medium font-sans text-[var(--color-text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <span className="text-[11px] text-[var(--color-text-muted)] font-sans border-l border-[var(--color-border)] pl-3">
            {subtitle}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {/* UTC Clock */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-text-secondary)] px-2 py-0.5 rounded-[3px] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] tabular-nums">
          <Clock size={11} className="text-[var(--color-text-muted)]" />
          <span>{utcTime || '—'}</span>
        </div>

        {/* Backend Health Indicator */}
        <div
          className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-[3px] bg-[var(--color-surface-2)] border border-[var(--color-border)]"
          title={`Backend status: ${healthStatus}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ backgroundColor: statusConfig.dotColor }}
            aria-hidden="true"
          />
          <span className="text-[var(--color-text-secondary)]">{statusConfig.label}</span>
        </div>
      </div>
    </header>
  )
}
