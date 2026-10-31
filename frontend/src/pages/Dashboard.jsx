import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Activity,
  RefreshCw,
  PlayCircle,
  FileSearch,
  ArrowRight,
  Clock,
  Sparkles,
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
        <LoadingState message="Aggregating real-time SOC security telemetry from database..." />
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
          retryLabel="Retry Dashboard Connection"
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
    <div className="space-y-6 font-sans pb-16 max-w-7xl mx-auto">
      {/* Top Header & Actions Bar */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard size={20} className="text-[var(--color-accent)]" />
            <h1 className="text-base font-bold font-mono text-[var(--color-text-primary)]">
              Security Operations Center (SOC) Console
            </h1>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Real-time heuristic threat metrics, ML telemetry signals, and explainable forensic audit catalog.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-text-muted)]">
              <Clock size={13} />
              <span>Updated {lastUpdated} UTC</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded border transition-colors cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            title="Refresh dashboard metrics"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-[var(--color-accent)]' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Quick Action Navigation Strip */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-[var(--color-surface-1)]"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex items-center justify-between p-3 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: 'var(--color-surface-3)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-accent)',
              }}
            >
              <PlayCircle size={18} />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[var(--color-text-primary)]">
                Demo Simulation Lab
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)]">
                Stream deterministic synthetic telemetry across 3 scenarios
              </div>
            </div>
          </div>
          <Link
            to="/demo"
            className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[var(--color-accent)] hover:underline ml-2 shrink-0"
          >
            <span>Launch Lab</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="flex items-center justify-between p-3 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: 'var(--color-surface-3)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-risk-medium)',
              }}
            >
              <FileSearch size={18} />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[var(--color-text-primary)]">
                Sample File Analysis
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)]">
                Inspect static PE/executable metadata safely in memory
              </div>
            </div>
          </div>
          <Link
            to="/analyze"
            className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[var(--color-accent)] hover:underline ml-2 shrink-0"
          >
            <span>Upload File</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Row of 6 StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Analyses"
          value={totalAnalyses}
          subtitle="Processed samples"
          icon={LayoutDashboard}
          accentColor="var(--color-accent)"
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
          accentColor="var(--color-accent)"
        />
      </div>

      {/* Empty Database Guidance when totalAnalyses === 0 */}
      {totalAnalyses === 0 ? (
        <div className="py-8">
          <EmptyState
            title="Database Ready &bull; No Analyses Evaluated Yet"
            description="The SOC database is initialized with zero sample records. Start by launching a deterministic synthetic scenario in the Demo Lab or upload a local sample to inspect static metadata."
            actionLabel="Start Simulation in Demo Lab"
            onAction={() => navigate('/demo')}
            actionRoute="/demo"
          />
        </div>
      ) : (
        <>
          {/* Charts Row 1: Threat Distribution & Network Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ThreatDistributionChart distribution={threatDist} height={260} />
            <NetworkActivityChart data={networkData} height={260} />
          </div>

          {/* Charts Row 2: Detection Timeline */}
          <div>
            <DetectionTimeline data={timelineData} height={240} />
          </div>

          {/* Recent Analyses Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[var(--color-accent)]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                  Recent Threat Inspections ({recentAnalyses.length})
                </h2>
              </div>
              <Link
                to="/history"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[var(--color-accent)] hover:underline"
              >
                <span>View Full Catalog</span>
                <ArrowRight size={13} />
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
