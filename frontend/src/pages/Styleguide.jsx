import React, { useState } from 'react'
import {
  ShieldAlert,
  Terminal,
  Activity,
  Layers,
  BarChart3,
  AlertTriangle,
  FolderSearch,
} from 'lucide-react'

import SeverityBadge from '../components/SeverityBadge'
import RiskGauge from '../components/RiskGauge'
import StatCard from '../components/StatCard'
import SimulatedBanner from '../components/SimulatedBanner'
import EventStream from '../components/EventStream'
import EventTimeline from '../components/EventTimeline'
import AnalysisTable from '../components/AnalysisTable'
import IocList from '../components/IocList'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'

import ThreatDistributionChart from '../charts/ThreatDistributionChart'
import NetworkActivityChart from '../charts/NetworkActivityChart'
import DetectionTimeline from '../charts/DetectionTimeline'

/**
 * Styleguide Page
 *
 * Showcases all shared components and charts with realistic sample data.
 * All sections are clearly labelled as SAMPLE DATA.
 */
export default function Styleguide() {
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [errorRetried, setErrorRetried] = useState(false)

  // Sample Data Definitions
  const sampleAnalyses = [
    {
      id: 101,
      filename: 'invoice_viewer_trojan.exe',
      sha256: 'c22a21006617ed196d3c4dfad2e523f25de927e79e2e22228af212b5cbb9c466',
      file_type: 'PE32',
      classification: 'Trojan-like',
      risk_level: 'Critical',
      risk_score: 92,
      timestamp: '2026-10-26T21:45:00Z',
    },
    {
      id: 102,
      filename: 'update_agent_stager.exe',
      sha256: 'd7fed08025992d04062d8455a3ba24eaffbbbea7476f18ba95264b0a5fbc5e6b',
      file_type: 'PE32',
      classification: 'Suspicious',
      risk_level: 'High',
      risk_score: 68,
      timestamp: '2026-10-26T21:15:00Z',
    },
    {
      id: 103,
      filename: 'company_quarterly_report.pdf',
      sha256: '393708a59f74c8d7542d47948ec97f465d1f6e3090bad7960cfbdc4dc4398cda',
      file_type: 'PDF',
      classification: 'Benign',
      risk_level: 'Low',
      risk_score: 12,
      timestamp: '2026-10-26T20:30:00Z',
    },
  ]

  const sampleEvents = [
    {
      id: 1,
      offset_seconds: 1,
      timestamp: '2026-10-26T21:45:01Z',
      severity: 'medium',
      event_type: 'process_create',
      description: 'Spawned auxiliary child process C:\\Windows\\Temp\\stager.exe with hidden flag',
      is_simulated: 1,
    },
    {
      id: 2,
      offset_seconds: 3,
      timestamp: '2026-10-26T21:45:03Z',
      severity: 'high',
      event_type: 'registry_write',
      description: 'Modified HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run persistence key',
      is_simulated: 1,
    },
    {
      id: 3,
      offset_seconds: 5,
      timestamp: '2026-10-26T21:45:05Z',
      severity: 'critical',
      event_type: 'c2_beacon',
      description: 'TCP connection 192.0.2.14 -> 198.51.100.22:4444 (repeated beaconing pattern)',
      is_simulated: 1,
    },
  ]

  const sampleBehaviorEvents = [
    {
      id: 1,
      timestamp: '2026-10-26T21:45:01Z',
      event_type: 'process_create',
      severity: 'medium',
      description: 'Spawned powershell.exe with -EncodedCommand execution bypass',
      is_simulated: 1,
    },
    {
      id: 2,
      timestamp: '2026-10-26T21:45:04Z',
      event_type: 'memory_injection',
      severity: 'critical',
      description: 'VirtualAllocEx allocated executable memory buffer inside explorer.exe',
      is_simulated: 1,
    },
  ]

  const sampleNetworkEvents = [
    {
      id: 1,
      timestamp: '2026-10-26T21:45:02Z',
      protocol: 'DNS',
      source: '192.0.2.15',
      destination: '198.51.100.53',
      port: 53,
      event_type: 'dns_query',
      severity: 'low',
      description: 'DNS query resolving command-and-control host c2.trojanguard-demo.net',
      is_simulated: 1,
    },
    {
      id: 2,
      timestamp: '2026-10-26T21:45:06Z',
      protocol: 'TCP',
      source: '192.0.2.15',
      destination: '198.51.100.89',
      port: 4444,
      event_type: 'beacon_outbound',
      severity: 'high',
      description: 'TCP SYN beacon to remote port 4444',
      is_simulated: 1,
    },
  ]

  const sampleIocs = [
    { id: 1, type: 'hash', value: 'c22a21006617ed196d3c4dfad2e523f25de927e79e2e22228af212b5cbb9c466', is_simulated: 1 },
    { id: 2, type: 'ip', value: '198.51.100.42', is_simulated: 1 },
    { id: 3, type: 'domain', value: 'c2.trojanguard-demo.net', is_simulated: 1 },
    { id: 4, type: 'port', value: '4444', is_simulated: 1 },
  ]

  const sampleTimelineData = [
    { timestamp: '14:00', trojan: 2, suspicious: 1, benign: 5 },
    { timestamp: '15:00', trojan: 1, suspicious: 4, benign: 8 },
    { timestamp: '16:00', trojan: 4, suspicious: 2, benign: 6 },
    { timestamp: '17:00', trojan: 3, suspicious: 5, benign: 9 },
  ]

  const sampleNetworkActivity = [
    { analysis_id: 1, filename: 'invoice.exe', connections: 12, dns_queries: 4 },
    { analysis_id: 2, filename: 'stager.exe', connections: 7, dns_queries: 2 },
    { analysis_id: 3, filename: 'doc.pdf', connections: 1, dns_queries: 1 },
    { analysis_id: 4, filename: 'agent.bin', connections: 18, dns_queries: 6 },
  ]

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Page Header */}
      <div className="border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-[var(--color-accent)]" />
          <h2 className="text-base font-bold font-mono text-[var(--color-text-primary)]">
            Design System & Component Styleguide
          </h2>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          Catalog of standardized SOC components, design tokens, risk badges, telemetry streams, and charts.
          <span className="ml-2 font-mono text-[var(--color-risk-medium)] uppercase font-semibold">
            [Sample Data Preview]
          </span>
        </p>
      </div>

      {/* 1. Simulated Disclaimer Banner */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
            1. Simulated Telemetry Banner
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            SAMPLE DATA
          </span>
        </div>
        <SimulatedBanner />
      </section>

      {/* 2. SeverityBadges */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
            2. Severity & Classification Badges
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            SAMPLE DATA
          </span>
        </div>

        <div
          className="p-4 rounded-lg border space-y-4"
          style={{ backgroundColor: 'var(--color-surface-1)', borderColor: 'var(--color-border)' }}
        >
          <div>
            <div className="text-[11px] font-mono text-[var(--color-text-muted)] mb-2 uppercase">
              Risk Level Variants (Low, Medium, High, Critical)
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <SeverityBadge value="Low" />
              <SeverityBadge value="Medium" />
              <SeverityBadge value="High" />
              <SeverityBadge value="Critical" />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono text-[var(--color-text-muted)] mb-2 uppercase">
              Classification Variants (Benign, Suspicious, Trojan-like)
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <SeverityBadge value="Benign" />
              <SeverityBadge value="Suspicious" />
              <SeverityBadge value="Trojan-like" />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono text-[var(--color-text-muted)] mb-2 uppercase">
              Size Variants (Small, Medium, Large)
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <SeverityBadge value="Critical" size="sm" />
              <SeverityBadge value="Critical" size="md" />
              <SeverityBadge value="Critical" size="lg" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Risk Gauge (SVG Semicircle) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
            3. RiskGauge (SVG Semicircle, 0–100, Animated)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            SAMPLE DATA
          </span>
        </div>

        <div
          className="p-6 rounded-lg border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 justify-items-center"
          style={{ backgroundColor: 'var(--color-surface-1)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-col items-center">
            <RiskGauge score={18} level="Low" label="Clean Sample" />
            <span className="text-[11px] font-mono text-[var(--color-text-muted)] mt-2">Score: 18 (Low)</span>
          </div>
          <div className="flex flex-col items-center">
            <RiskGauge score={45} level="Medium" label="Auxiliary Stager" />
            <span className="text-[11px] font-mono text-[var(--color-text-muted)] mt-2">Score: 45 (Medium)</span>
          </div>
          <div className="flex flex-col items-center">
            <RiskGauge score={74} level="High" label="Evasive Dropper" />
            <span className="text-[11px] font-mono text-[var(--color-text-muted)] mt-2">Score: 74 (High)</span>
          </div>
          <div className="flex flex-col items-center">
            <RiskGauge score={92} level="Critical" label="Active Trojan" />
            <span className="text-[11px] font-mono text-[var(--color-text-muted)] mt-2">Score: 92 (Critical)</span>
          </div>
        </div>
      </section>

      {/* 4. StatCards */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
            4. StatCards
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            SAMPLE DATA
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Analyses"
            value="1,482"
            subtitle="Uploaded & demo samples"
            icon={Activity}
            accentColor="var(--color-accent)"
          />
          <StatCard
            title="Threats Detected"
            value="342"
            subtitle="Suspicious & Trojan-like"
            icon={ShieldAlert}
            accentColor="var(--color-risk-critical)"
            trend={{ label: '+12% this week', positive: false }}
          />
          <StatCard
            title="Average Risk Score"
            value="48.2"
            subtitle="Composite weighted score"
            icon={BarChart3}
            accentColor="var(--color-risk-medium)"
          />
          <StatCard
            title="Extracted IOCs"
            value="864"
            subtitle="Hashes, IPs, ports, domains"
            icon={Terminal}
            accentColor="var(--color-risk-high)"
          />
        </div>
      </section>

      {/* 5. AnalysisTable */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
              5. Clickable AnalysisTable
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
              SAMPLE DATA
            </span>
          </div>
          {selectedAnalysis && (
            <span className="text-xs font-mono text-[var(--color-accent)]">
              Clicked sample: #{selectedAnalysis.id} ({selectedAnalysis.filename})
            </span>
          )}
        </div>
        <AnalysisTable
          analyses={sampleAnalyses}
          onRowClick={(item) => setSelectedAnalysis(item)}
        />
      </section>

      {/* 6. EventStream & EventTimeline */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
            6. Telemetry EventStream & EventTimeline
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            SAMPLE DATA
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EventStream events={sampleEvents} title="Sample Telemetry Stream" />
          <EventTimeline
            behaviorEvents={sampleBehaviorEvents}
            networkEvents={sampleNetworkEvents}
          />
        </div>
      </section>

      {/* 7. IocList */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
            7. Indicators of Compromise (IocList)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            SAMPLE DATA
          </span>
        </div>
        <IocList iocs={sampleIocs} />
      </section>

      {/* 8. Recharts Visualizations */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
            8. SOC Visualizations (Recharts)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            SAMPLE DATA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ThreatDistributionChart
            distribution={{ Benign: 14, Suspicious: 6, 'Trojan-like': 8 }}
          />
          <NetworkActivityChart data={sampleNetworkActivity} />
          <DetectionTimeline data={sampleTimelineData} />
        </div>
      </section>

      {/* 9. Feedback & State Handlers */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
            9. Application State Feedback (Loading, Empty, Error)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            SAMPLE DATA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--color-surface-1)', borderColor: 'var(--color-border)' }}
          >
            <div className="text-[11px] font-mono text-[var(--color-text-muted)] mb-2 uppercase">
              LoadingState
            </div>
            <LoadingState message="Extracting static PE headers..." />
          </div>

          <div>
            <EmptyState
              icon={FolderSearch}
              title="No Threat Matches"
              description="Zero indicators matched the active heuristic rule set."
            />
          </div>

          <div>
            <ErrorState
              title="Connection Timeout"
              message={
                errorRetried
                  ? 'Retry triggered successfully! (Demo simulated callback)'
                  : 'Backend service failed to respond within the expected 5000ms SLA.'
              }
              onRetry={() => setErrorRetried((prev) => !prev)}
              retryLabel="Test Retry Handler"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
