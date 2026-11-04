import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Shield,
  LayoutDashboard,
  UploadCloud,
  PlayCircle,
  Clock,
  Cpu,
  Layers,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    heading: 'Monitor',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    heading: 'Investigate',
    items: [
      { to: '/analyze', label: 'Analyze Sample', icon: UploadCloud },
      { to: '/demo', label: 'Demo Lab', icon: PlayCircle },
      { to: '/history', label: 'History', icon: Clock },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      { to: '/model', label: 'Model Evaluation', icon: Cpu },
      { to: '/styleguide', label: 'Design System', icon: Layers },
    ],
  },
]

/**
 * Sidebar component
 *
 * Slim, utilitarian security workbench navigation with clear section grouping,
 * subtle active borders, and compact line icons.
 */
export default function Sidebar({ className = '' }) {
  return (
    <aside
      className={`w-52 shrink-0 border-r flex flex-col justify-between select-none ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-subtle)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Brand Header */}
      <div>
        <div
          className="h-12 px-4 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[var(--color-accent)]" />
            <span className="font-mono text-xs font-semibold tracking-tight text-[var(--color-text-primary)]">
              TrojanGuard
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-[var(--color-text-muted)] bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]">
            SOC
          </span>
        </div>

        {/* Navigation Groups */}
        <nav className="p-2 space-y-4 pt-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading} className="space-y-0.5">
              <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                {section.heading}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-xs font-sans transition-colors duration-150 ${
                        isActive
                          ? 'text-[var(--color-text-primary)] bg-[var(--color-surface-2)] border-l-2 border-l-[var(--color-accent)] font-medium'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-1)] border-l-2 border-l-transparent'
                      }`
                    }
                  >
                    <Icon size={15} className="shrink-0 text-[var(--color-text-muted)]" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer System Status */}
      <div
        className="p-3 border-t text-[11px] font-mono text-[var(--color-text-muted)] flex items-center justify-between"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ backgroundColor: 'var(--color-risk-low)' }}
          />
          <span className="tabular-nums">v0.1.0</span>
        </span>
        <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
          DEFENSIVE
        </span>
      </div>
    </aside>
  )
}
