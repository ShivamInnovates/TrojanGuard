import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  ShieldAlert,
  LayoutDashboard,
  FileSearch,
  PlayCircle,
  History,
  Cpu,
  Palette,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/analyze', label: 'Analyze Sample', icon: FileSearch },
  { to: '/demo', label: 'Demo Lab', icon: PlayCircle },
  { to: '/history', label: 'History', icon: History },
  { to: '/model', label: 'Model Evaluation', icon: Cpu },
  { to: '/styleguide', label: 'Styleguide', icon: Palette },
]

/**
 * Sidebar component
 *
 * Compact SOC navigation bar with active route indicators and Lucide icons.
 */
export default function Sidebar({ className = '' }) {
  return (
    <aside
      className={`w-60 shrink-0 border-r flex flex-col justify-between select-none ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-subtle)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Brand Header */}
      <div>
        <div
          className="h-14 px-4 flex items-center gap-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-accent)',
            }}
          >
            <ShieldAlert size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold tracking-tight text-[var(--color-text-primary)]">
              TrojanGuard
            </span>
            <span className="text-[10px] font-mono tracking-wider uppercase text-[var(--color-text-muted)]">
              EDR / SOC Console
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded text-xs font-medium font-sans transition-all duration-150 ${
                    isActive
                      ? 'text-[var(--color-accent)] bg-[var(--color-accent-subtle)] border border-[var(--color-accent-dim)] font-semibold'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] border border-transparent'
                  }`
                }
              >
                <Icon size={16} className="shrink-0" />
                <span className="tracking-wide">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div
        className="p-3 border-t text-[11px] font-mono text-[var(--color-text-muted)] flex items-center justify-between"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: 'var(--color-risk-low)' }}
          />
          <span>v0.1.0</span>
        </span>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
          DEFENSIVE
        </span>
      </div>
    </aside>
  )
}
