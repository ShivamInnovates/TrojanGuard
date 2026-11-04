import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Activity,
  RefreshCw,
  PlayCircle,
  UploadCloud,
  ArrowRight,
  Clock,
} from 'lucide-react'

import { getDashboard, getHistory } from '../services/api'
import StatCard from '../components/StatCard'
import AnalysisTable from '../components/AnalysisTable'
import ThreatDistributionChart from '../charts/ThreatDistributionChart'
import NetworkActivityChart from '../charts/NetworkActivityChart'
import DetectionTimeline from '../charts/DetectionTimeline'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

export default function Dashboard() {
  const navigate = useNavigate()

  const [metrics, setMetrics] = useState(null)
  const [recentAnalyses, setRecentAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [dashData, historyData] = await Promise.all([
        getDashboard(),
        getHistory({ limit: 10, sort: 'timestamp', order: 'desc' }),
      ])
      setMetrics(dashData)
      setRecentAnalyses(historyData?.items || [])
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }))
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics from backend.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <LoadingState message="Aggregating telemetry from database..." />
      </div>
    )
  }

  if (error && !metrics) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <ErrorState
          title="Dashboard Telemetry Offline"
          message={error}
          onRetry={() => loadData(false)}
          retryLabel="Retry Connection"
        />
      </div>
    )
  }

  const totals = metrics?.totals || {}
  const totalAnalyses = totals.analyses || metrics?.total_analyses || 0
  const benignCount = metrics?.counts_per_classification?.Benign || metrics?.benign_count || 0
  const suspiciousCount = metrics?.counts_per_classification?.Suspicious || metrics?.suspicious_count || 0
  const trojanCount = metrics?.counts_per_classification?.['Trojan-like'] || metrics?.trojan_count || 0
  const highRiskCount = metrics?.counts_per_risk_level?.High || metrics?.high_risk_count || 0
  const criticalRiskCount = metrics?.counts_per_risk_level?.Critical || metrics?.critical_risk_count || 0
  const elevatedRiskCount = highRiskCount + criticalRiskCount
  const avgRiskScore = metrics?.avg_risk_score !== undefined ? Number(metrics.avg_risk_score).toFixed(1) : '0.0'

  const threatDist = metrics?.threat_distribution || metrics?.counts_per_classification || {}
  const networkData = metrics?.network_activity || []
  const timelineData = metrics?.detection_timeline || []

  return (
    <div className="space-y-4 font-sans pb-12 max-w-7xl mx-auto">
      {/* Top Header & Actions Bar */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-sm font-semibold font-mono text-[var(--color-text-primary)]">
            Security Operations Center (SOC) Console
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Real-time telemetry, heuristic risk signals, and persistent forensic audit records.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums">
              <Clock size={12} />
              <span>Updated {lastUpdated} UTC</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-[3px] border transition-colors cursor-pointer disabled:opacity-50 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)]"
            title="Refresh dashboard metrics"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Quick Action Navigation Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-center justify-between p-3 rounded-[4px] bg-[var(--color-surface-1)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <PlayCircle size={16} className="text-[var(--color-text-muted)] shrink-0" />
            <div>
              <div className="text-xs font-medium text-[var(--color-text-primary)]">
                Demo Simulation Lab
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)]">
                Stream deterministic synthetic telemetry across 3 scenarios
              </div>
            </div>
          </div>
          <Link
            to="/demo"
            className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[var(--color-accent)] hover:underline ml-2 shrink-0"
          >
            <span>Launch lab</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        <div className="flex items-center justify-between p-3 rounded-[4px] bg-[var(--color-surface-1)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <UploadCloud size={16} className="text-[var(--color-text-muted)] shrink-0" />
            <div>
              <div className="text-xs font-medium text-[var(--color-text-primary)]">
                Sample File Analysis
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)]">
                Inspect static PE/executable metadata safely in memory
              </div>
            </div>
          </div>
          <Link
            to="/analyze"
            className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[var(--color-accent)] hover:underline ml-2 shrink-0"
          >
            <span>Upload file</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Row of 6 StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Analyses"
          value={totalAnalyses}
          subtitle="Processed samples"
        />
        <StatCard
          title="Benign Samples"
          value={benignCount}
          subtitle="Low/Baseline risk"
          icon={ShieldCheck}
          accentColor="var(--color-risk-low)"
        />
        <StatCard
          title="Suspicious Activity"
          value={suspiciousCount}
          subtitle="Elevated flags"
          icon={AlertTriangle}
          accentColor="var(--color-risk-medium)"
        />
        <StatCard
          title="Trojan Detections"
          value={trojanCount}
          subtitle="Critical payloads"
          icon={ShieldAlert}
          accentColor="var(--color-risk-critical)"
        />
        <StatCard
          title="High + Critical"
          value={elevatedRiskCount}
          subtitle="Score > 60"
          icon={Flame}
          accentColor="var(--color-risk-critical)"
        />
        <StatCard
          title="Avg Risk Score"
          value={`${avgRiskScore}/100`}
          subtitle="Composite index"
          icon={Activity}
        />
      </div>

      {/* Empty Database Guidance when totalAnalyses === 0 */}
      {totalAnalyses === 0 ? (
        <div className="py-6">
          <EmptyState
            title="Database Ready • No Analyses Recorded Yet"
            description="The SOC database is initialized with zero sample records. Start by launching a deterministic synthetic scenario in the Demo Lab or upload a local sample to inspect static metadata."
            actionLabel="Start Simulation in Demo Lab"
            onAction={() => navigate('/demo')}
            actionRoute="/demo"
          />
        </div>
      ) : (
        <>
          {/* Charts Row 1: Threat Distribution & Network Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ThreatDistributionChart distribution={threatDist} height={220} />
            <NetworkActivityChart data={networkData} height={220} />
          </div>

          {/* Charts Row 2: Detection Timeline */}
          <div>
            <DetectionTimeline data={timelineData} height={200} />
          </div>

          {/* Recent Analyses Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-medium text-[var(--color-text-primary)]">
                Recent Threat Inspections ({recentAnalyses.length})
              </h2>
              <Link
                to="/history"
                className="inline-flex items-center gap-1 text-xs font-mono text-[var(--color-accent)] hover:underline"
              >
                <span>View all history</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <AnalysisTable
              analyses={recentAnalyses}
              emptyMessage="No recent analyses available."
            />
          </div>
        </>
      )}
    </div>
  )
}
