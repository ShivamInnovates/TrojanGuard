import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Check,
  FileText,
  Clock,
  HardDrive,
  Cpu,
  Globe,
  Radio,
  FileCode,
  Info,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers,
  Terminal,
  Activity,
  ListOrdered,
} from 'lucide-react'

import { getAnalysis } from '../services/api'
import SimulatedBanner from '../components/SimulatedBanner'
import RiskGauge from '../components/RiskGauge'
import SeverityBadge from '../components/SeverityBadge'
import EventTimeline from '../components/EventTimeline'
import IocList from '../components/IocList'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

export default function AnalysisDetail() {
  const { id } = useParams()

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [is404, setIs404] = useState(false)
  const [copiedSha, setCopiedSha] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)

  // Fetch report from GET /api/analysis/{id}
  const fetchReport = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    setIs404(false)
    try {
      const data = await getAnalysis(id)
      setReport(data)
    } catch (err) {
      if (err.status === 404 || err.message?.includes('404') || err.message?.toLowerCase().includes('not found')) {
        setIs404(true)
      } else {
        setError(err.message || 'Failed to retrieve analysis report from backend.')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleCopySha = async (sha) => {
    if (!sha) return
    try {
      await navigator.clipboard.writeText(sha)
      setCopiedSha(true)
      setTimeout(() => setCopiedSha(false), 2000)
    } catch {
      // Ignore
    }
  }

  // Format file size
  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Format timestamp
  const formatTime = (ts) => {
    if (!ts) return '—'
    return ts.replace('T', ' ').replace('Z', ' UTC')
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <LoadingState message={`Retrieving analysis record #${id} from database...`} />
      </div>
    )
  }

  // 404 Not Found state
  if (is404) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <EmptyState
          title={`Analysis Report #${id} Not Found`}
          description="The requested inspection report does not exist in the database or may have been cleared."
          actionLabel="View Detection Catalog"
          onAction={() => {}}
          actionRoute="/history"
        />
        <div className="mt-4 text-center">
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--color-accent)] hover:underline"
          >
            <ArrowLeft size={14} />
            <span>Return to History</span>
          </Link>
        </div>
      </div>
    )
  }

  // Backend error state
  if (error || !report) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <ErrorState
          title="Analysis Load Error"
          message={error || 'Unable to load analysis report.'}
          onRetry={fetchReport}
          retryLabel="Retry Connection"
        />
      </div>
    )
  }

  // Extract core properties with fallbacks
  const isDemo =
    report.analysis_source === 'demo' ||
    report.analysis_source === 'seed_demo' ||
    (report.summary && report.summary.toLowerCase().includes('synthetic identifier'))

  const features = report.features || {}
  const observedMask = report.observed_mask || {}
  const classifierOutput = report.classifier_output || null
  const evidenceList = [...(report.evidence || [])].sort(
    (a, b) => (b.points_contributed || 0) - (a.points_contributed || 0)
  )
  const contextList = report.context || []
  const behaviorEvents = report.behavior_events || []
  const networkEvents = report.network_events || []
  const iocs = report.iocs || []
  const recommendedSteps = report.recommended_steps || []

  const rawPoints = report.raw_points !== undefined ? report.raw_points : report.risk_score
  const hasTelemetry =
    (observedMask.network_connections || false) && (observedMask.process_count || false)

  // Static properties
  const fileEntropy = features.file_entropy !== undefined ? features.file_entropy : null
  const importCount = features.import_count !== undefined ? Math.round(features.import_count) : null
  const suspiciousImports = features.suspicious_imports !== undefined ? Math.round(features.suspicious_imports) : null

  // File type mismatch check
  const isTxtClaimingExe =
    report.filename?.toLowerCase().endsWith('.exe') && report.file_type === 'text'

  return (
    <div className="space-y-6 font-sans pb-16 max-w-7xl mx-auto">
      {/* Navigation Breadcrumb & Back Links */}
      <div className="flex items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>History</span>
          </Link>
          <span className="text-[var(--color-text-muted)]">/</span>
          <Link
            to="/"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-[var(--color-text-muted)]">/</span>
          <span className="text-[var(--color-accent)] font-semibold">Report #{report.id}</span>
        </div>

        <div className="flex items-center gap-2">
          {isDemo ? (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                color: 'var(--color-accent)',
                border: '1px solid var(--color-accent-dim)',
              }}
            >
              Demo Simulation Run
            </span>
          ) : (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              Live Sample Upload
            </span>
          )}
        </div>
      </div>

      {/* Simulated Telemetry Banner for Demo Runs */}
      {isDemo && (
        <SimulatedBanner
          message="Simulated telemetry, not monitored from a real host."
          detail="This analysis was generated by the TrojanGuard demonstration lab. Telemetry events and SHA-256 identifiers are synthetically generated."
        />
      )}

      {/* Section 1: Header Card */}
      <div
        className="rounded-lg border p-5 font-sans space-y-4"
        style={{
          backgroundColor: 'var(--color-surface-1)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <FileCode size={20} className="text-[var(--color-accent)]" />
              <h1 className="text-base font-bold font-mono text-[var(--color-text-primary)]">
                {report.filename}
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-3)] text-[var(--color-text-muted)]">
                {report.file_type}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Evaluated on {formatTime(report.timestamp)} &bull; Source: {report.analysis_source}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge value={report.classification} source={report.analysis_source} size="md" />
            <SeverityBadge value={report.risk_level} size="md" />
          </div>
        </div>

        {/* SHA-256 and Metadata Grid */}
        <div className="pt-3 border-t border-[var(--color-border-subtle)] grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* SHA-256 with Copy Button */}
          <div className="md:col-span-2 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[var(--color-text-muted)] uppercase">
                {isDemo ? 'Synthetic Identifier (SHA-256)' : 'SHA-256 Hash'}
              </span>
              {isDemo && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[var(--color-surface-2)] text-[var(--color-accent)]">
                  DERIVED
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 bg-[var(--color-surface-2)] p-1.5 rounded border border-[var(--color-border-subtle)]">
              <span className="font-mono text-[11px] text-[var(--color-text-primary)] truncate select-all">
                {report.sha256}
              </span>
              <button
                type="button"
                onClick={() => handleCopySha(report.sha256)}
                className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)] shrink-0 transition-colors"
                title="Copy SHA-256"
                aria-label="Copy SHA-256"
              >
                {copiedSha ? <Check size={14} className="text-[var(--color-risk-low)]" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* File Size */}
          <div className="space-y-1">
            <span className="font-mono text-[11px] text-[var(--color-text-muted)] uppercase">
              File Size
            </span>
            <div className="font-mono text-xs text-[var(--color-text-primary)] font-semibold py-1">
              {formatBytes(report.file_size)}
            </div>
          </div>

          {/* Analysis Source */}
          <div className="space-y-1">
            <span className="font-mono text-[11px] text-[var(--color-text-muted)] uppercase">
              Pipeline Mode
            </span>
            <div className="font-mono text-xs text-[var(--color-text-primary)] font-semibold py-1">
              {hasTelemetry ? 'Multi-Source (Telemetry)' : 'Static Inspection Only'}
            </div>
          </div>
        </div>

        {/* Analysis Isolation (Isolated Analysis Worker Status) */}
        <div className="pt-3 border-t border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Shield size={14} className="text-[var(--color-accent)] shrink-0" />
            <span className="font-mono text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider">
              Analysis Isolation:
            </span>
            {isDemo || report.sandbox?.status === 'not_applicable' ? (
              <span className="text-xs text-[var(--color-text-secondary)] italic">
                Not applicable (simulated scenario)
              </span>
            ) : (
              <div className="flex items-center gap-3 font-mono text-xs text-[var(--color-text-primary)] flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <span className="text-[var(--color-text-muted)]">Network isolated:</span>
                  <span className={report.sandbox?.network_isolated ? 'text-[var(--color-risk-low)] font-semibold' : 'text-[var(--color-risk-medium)] font-semibold'}>
                    {report.sandbox?.network_isolated ? 'Yes' : 'No'}
                  </span>
                </span>
                <span className="text-[var(--color-border)]">&bull;</span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-[var(--color-text-muted)]">Resource limits applied:</span>
                  <span className="text-[var(--color-risk-low)] font-semibold">Yes</span>
                </span>
                <span className="text-[var(--color-border)]">&bull;</span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-[var(--color-text-muted)]">Worker duration:</span>
                  <span>{report.sandbox?.duration_ms !== undefined ? `${report.sandbox.duration_ms} ms` : '—'}</span>
                </span>
                <span className="text-[var(--color-border)]">&bull;</span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-[var(--color-text-muted)]">Status:</span>
                  <span className="px-1.5 py-0.2 rounded bg-[var(--color-surface-2)] text-[var(--color-risk-low)] font-semibold uppercase text-[10px]">
                    {report.sandbox?.status || 'ok'}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Summary Row (Gauge + Classifier Output & Agreement + Summary Text) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Col 1: Large RiskGauge */}
        <div
          className="rounded-lg border p-6 flex flex-col items-center justify-center text-center font-sans"
          style={{
            backgroundColor: 'var(--color-surface-1)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <RiskGauge
            score={report.risk_score}
            level={report.risk_level}
            size={220}
            label="Composite Risk Score"
          />
          <div className="mt-4 flex items-center gap-2">
            <SeverityBadge value={report.classification} source={report.analysis_source} size="md" />
            <SeverityBadge value={report.risk_level} size="md" />
          </div>
          <div className="mt-2 text-xs font-mono text-[var(--color-text-muted)]">
            Score: {report.risk_score} / 100 ({rawPoints} raw pts)
          </div>
        </div>

        {/* Col 2 & 3: Classifier Output, Agreement, and Pipeline Summary */}
        <div
          className="lg:col-span-2 rounded-lg border p-6 font-sans flex flex-col justify-between space-y-4"
          style={{
            backgroundColor: 'var(--color-surface-1)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-[var(--color-accent)]" />
                <h2 className="text-sm font-mono font-bold uppercase text-[var(--color-text-primary)]">
                  Detection Summary & Decision Logic
                </h2>
              </div>

              {/* Classifier Agreement Tag */}
              {classifierOutput?.applicable ? (
                report.classifier_agrees ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded font-semibold"
                    style={{
                      backgroundColor: 'var(--color-risk-low-bg)',
                      color: 'var(--color-risk-low)',
                      border: '1px solid hsl(145 50% 25%)',
                    }}
                  >
                    <ShieldCheck size={13} />
                    <span>Rules and Classifier Agree</span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded font-semibold"
                    style={{
                      backgroundColor: 'var(--color-risk-medium-bg)',
                      color: 'var(--color-risk-medium)',
                      border: '1px solid hsl(45 50% 25%)',
                    }}
                  >
                    <AlertTriangle size={13} />
                    <span>Rules Decided Final Outcome</span>
                  </span>
                )
              ) : null}
            </div>

            {/* Classifier Output Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-xs">
              <div className="space-y-1">
                <span className="text-[var(--color-text-muted)] font-mono text-[11px] uppercase">
                  Classifier Output (model confidence, not accuracy)
                </span>
                <div className="font-mono font-semibold text-sm text-[var(--color-text-primary)]">
                  {classifierOutput?.applicable ? (
                    <span>
                      {classifierOutput.predicted_label}{' '}
                      <span className="text-[var(--color-accent)] font-normal text-xs">
                        ({(report.confidence * 100).toFixed(1)}% confidence)
                      </span>
                    </span>
                  ) : (
                    <span className="text-[var(--color-text-muted)] italic font-normal">
                      Not applicable — Telemetry required for classifier inference
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[var(--color-text-muted)] font-mono text-[11px] uppercase">
                  Decision Engine Result
                </span>
                <div className="font-mono font-semibold text-sm text-[var(--color-text-primary)]">
                  {report.analysis_source === 'upload' && report.classification === 'Benign'
                    ? 'No indicators found (limited static analysis)'
                    : report.classification}{' '}
                  ({report.risk_level} Risk)
                </div>
              </div>
            </div>

            {/* Disagreement Warning if false */}
            {report.classifier_agrees === false && (
              <div
                className="p-3 rounded-md text-xs font-mono leading-relaxed border space-y-1"
                style={{
                  backgroundColor: 'var(--color-risk-medium-bg)',
                  borderColor: 'hsl(45 50% 25%)',
                  color: 'var(--color-risk-medium)',
                }}
              >
                <div className="font-bold uppercase text-[11px] flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  <span>Classifier Disagreement Explanation</span>
                </div>
                <div>
                  {report.classifier_disagreement_reason ||
                    'Defensive domain rules overrode the statistical ML output based on observed high-severity indicators.'}
                </div>
              </div>
            )}

            {/* Summary Text */}
            <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed font-sans">
              {report.summary}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)]">
            <span>Points Contributed: {rawPoints} pts</span>
            <span>Final Clamped Score: {report.risk_score} / 100</span>
          </div>
        </div>
      </div>

      {/* Section 3: Evidence Breakdown (Sorted by Points + Share Bar + Collapsed Context) */}
      <div
        className="rounded-lg border p-5 font-sans space-y-4"
        style={{
          backgroundColor: 'var(--color-surface-1)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <ListOrdered size={16} className="text-[var(--color-accent)]" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
              Explainable Risk Evidence Items ({evidenceList.length})
            </h3>
          </div>
          <span className="text-xs font-mono text-[var(--color-text-muted)]">
            Total Points: {rawPoints} pts &bull; Clamped Score: {report.risk_score}/100
          </span>
        </div>

        {evidenceList.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
            No positive risk evidence items observed. All indicators are at benign baseline.
          </div>
        ) : (
          <div className="space-y-2.5">
            {evidenceList.map((ev, idx) => {
              const share = rawPoints > 0 ? Math.round(((ev.points_contributed || 0) / rawPoints) * 100) : 0
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border bg-[var(--color-surface-2)] border-[var(--color-border-subtle)] hover:border-[var(--color-border)] transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">
                        {ev.indicator}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] text-[var(--color-text-muted)]">
                        {ev.source}
                      </span>
                      {ev.is_simulated && (
                        <span
                          className="text-[9px] font-mono px-1 py-0.2 rounded uppercase font-semibold"
                          style={{
                            color: 'var(--color-risk-medium)',
                            backgroundColor: 'var(--color-risk-medium-bg)',
                            border: '1px solid hsl(45 50% 25%)',
                          }}
                        >
                          SIMULATED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        Observed: <strong className="text-[var(--color-text-primary)]">{String(ev.observed_value)}</strong>
                      </span>
                      <span
                        className="font-mono font-bold text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--color-risk-critical-bg)',
                          color: 'var(--color-risk-critical)',
                          border: '1px solid hsl(0 50% 25%)',
                        }}
                      >
                        +{ev.points_contributed} pts ({share}%)
                      </span>
                    </div>
                  </div>

                  {/* Share Progress Bar */}
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-surface-3)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, share)}%`,
                        backgroundColor: 'var(--color-accent)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Collapsible Context (0 points) Section */}
        {contextList.length > 0 && (
          <div className="pt-2 border-t border-[var(--color-border-subtle)]">
            <button
              type="button"
              onClick={() => setContextOpen(!contextOpen)}
              className="w-full flex items-center justify-between p-2 rounded text-xs font-mono text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <span className="flex items-center gap-2">
                {contextOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>Context Baseline Indicators (0 points, {contextList.length} items)</span>
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {contextOpen ? 'Click to collapse' : 'Click to expand'}
              </span>
            </button>

            {contextOpen && (
              <div className="mt-2 space-y-2 pl-4 border-l-2 border-[var(--color-border-subtle)]">
                {contextList.map((ctx, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-2 rounded border bg-[var(--color-surface-1)] border-[var(--color-border-subtle)] text-xs font-mono flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)]">
                        {ctx.indicator} ({String(ctx.observed_value)})
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)] font-sans">
                        {ctx.description}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] shrink-0">
                      0 pts (Baseline)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 4: Static Indicators */}
      <div
        className="rounded-lg border p-5 font-sans space-y-4"
        style={{
          backgroundColor: 'var(--color-surface-1)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-[var(--color-accent)]" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
              {isDemo ? 'Simulated Static Profile' : 'Static File Inspection Indicators'}
            </h3>
          </div>
          {isDemo && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-accent)]">
              SIMULATED PROFILE
            </span>
          )}
        </div>

        {/* Warning if filename extension and detected magic bytes mismatch */}
        {isTxtClaimingExe && (
          <div
            className="p-3 rounded-md text-xs font-mono flex items-center gap-2 border"
            style={{
              backgroundColor: 'var(--color-risk-medium-bg)',
              borderColor: 'hsl(45 50% 25%)',
              color: 'var(--color-risk-medium)',
            }}
          >
            <AlertTriangle size={15} className="shrink-0" />
            <span>
              <strong>File Extension Mismatch:</strong> File has a .exe extension but internal magic bytes indicate text content. Evaluated safely as text format.
            </span>
          </div>
        )}

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-1">
            <span className="text-[11px] text-[var(--color-text-muted)] uppercase">
              Shannon Entropy
            </span>
            <div className="text-base font-bold text-[var(--color-text-primary)]">
              {fileEntropy !== null ? fileEntropy.toFixed(2) : '—'} / 8.00
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)] font-sans">
              {fileEntropy >= 6.8
                ? 'High entropy (potential packed/encrypted executable)'
                : fileEntropy >= 5.5
                ? 'Moderate entropy (standard compiled binary)'
                : 'Normal low entropy (unpacked text or data)'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-1">
            <span className="text-[11px] text-[var(--color-text-muted)] uppercase">
              Import Table Count
            </span>
            <div className="text-base font-bold text-[var(--color-text-primary)]">
              {importCount !== null ? importCount : '—'}
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)] font-sans">
              {importCount >= 60
                ? 'Large import footprint across external DLLs'
                : 'Standard API import dependency table'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-1">
            <span className="text-[11px] text-[var(--color-text-muted)] uppercase">
              Suspicious API Imports
            </span>
            <div
              className="text-base font-bold"
              style={{
                color: (suspiciousImports || 0) >= 3 ? 'var(--color-risk-critical)' : 'var(--color-text-primary)',
              }}
            >
              {suspiciousImports !== null ? suspiciousImports : '0'} flagged
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)] font-sans">
              {(suspiciousImports || 0) >= 4
                ? 'Flagged APIs matching process injection and memory hooks'
                : 'Zero or minimal sensitive API dependencies'}
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Behavioral Timeline & Network Events */}
      <div className="space-y-6">
        {/* Behavioral Events Timeline */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[var(--color-accent)]" />
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
                Behavioral Activity Timeline
              </h3>
            </div>
            {isDemo && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-accent)]">
                SIMULATED
              </span>
            )}
          </div>

          {behaviorEvents.length === 0 ? (
            <div
              className="rounded-lg border p-6 text-center text-xs font-mono"
              style={{
                backgroundColor: 'var(--color-surface-1)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              Not available for static-only analysis
            </div>
          ) : (
            <EventTimeline behaviorEvents={behaviorEvents} networkEvents={networkEvents} />
          )}
        </div>

        {/* Network Events Table */}
        <div
          className="rounded-lg border p-5 font-sans space-y-4"
          style={{
            backgroundColor: 'var(--color-surface-1)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-[var(--color-accent)]" />
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
                Network Telemetry Events ({networkEvents.length})
              </h3>
            </div>
            {isDemo && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-accent)]">
                SIMULATED
              </span>
            )}
          </div>

          {networkEvents.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono text-[var(--color-text-muted)]">
              Not available for static-only analysis
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)] text-left">
                    <th className="py-2 px-3 font-semibold">Timestamp</th>
                    <th className="py-2 px-3 font-semibold">Protocol</th>
                    <th className="py-2 px-3 font-semibold">Source &rarr; Destination</th>
                    <th className="py-2 px-3 font-semibold">Event Type</th>
                    <th className="py-2 px-3 font-semibold">Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {networkEvents.map((net, nIdx) => (
                    <tr key={net.id || nIdx} className="hover:bg-[var(--color-surface-2)] transition-colors">
                      <td className="py-2 px-3 text-[var(--color-text-muted)] whitespace-nowrap">
                        {net.timestamp ? net.timestamp.replace('T', ' ').replace('Z', '') : '—'}
                      </td>
                      <td className="py-2 px-3 uppercase text-[var(--color-text-primary)] font-semibold">
                        {net.protocol}
                      </td>
                      <td className="py-2 px-3 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {net.source}:{net.port || '—'} &rarr; {net.destination}:{net.port || '—'}
                      </td>
                      <td className="py-2 px-3 text-[var(--color-accent)]">
                        {net.event_type}
                      </td>
                      <td className="py-2 px-3">
                        {(net.is_simulated || isDemo) && (
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold"
                            style={{
                              color: 'var(--color-risk-medium)',
                              backgroundColor: 'var(--color-risk-medium-bg)',
                              border: '1px solid hsl(45 50% 25%)',
                            }}
                          >
                            SIMULATED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section 6: IOC List & Recommended Defensive Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left: IOC List */}
        <IocList
          iocs={iocs}
          title="Extracted Indicators of Compromise"
          emptyMessage="No network, host, or hash IOCs observed for this analysis."
        />

        {/* Right: Recommended Defensive Steps */}
        <div
          className="rounded-lg border p-5 font-sans space-y-4"
          style={{
            backgroundColor: 'var(--color-surface-1)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[var(--color-accent)]" />
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
                Recommended Defensive Steps
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
              {recommendedSteps.length} recommendations
            </span>
          </div>

          <div className="space-y-2.5">
            {recommendedSteps.map((step, sIdx) => (
              <div
                key={sIdx}
                className="flex items-start gap-2.5 p-3 rounded-md border bg-[var(--color-surface-2)] border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] leading-relaxed font-sans"
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 font-mono text-[10px] font-bold border"
                  style={{
                    backgroundColor: 'var(--color-surface-3)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-accent)',
                  }}
                >
                  {sIdx + 1}
                </div>
                <div>{step}</div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[10px] text-[var(--color-text-muted)] italic leading-relaxed">
            Note: Recommended steps provide defensive response guidance based on detected heuristics.
          </div>
        </div>
      </div>
    </div>
  )
}
