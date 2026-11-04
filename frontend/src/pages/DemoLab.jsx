import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Play,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle2,
} from 'lucide-react'

import {
  getDemoScenarios,
  startDemo,
  getDemoEvents,
  getAnalysis,
} from '../services/api'

import SimulatedBanner from '../components/SimulatedBanner'
import EventStream from '../components/EventStream'
import RiskGauge from '../components/RiskGauge'
import SeverityBadge from '../components/SeverityBadge'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

const STORAGE_KEY = 'trojanguard_active_demo'

export default function DemoLab() {
  const [scenarios, setScenarios] = useState([])
  const [loadingScenarios, setLoadingScenarios] = useState(true)
  const [scenarioError, setScenarioError] = useState(null)

  const [activeDemoId, setActiveDemoId] = useState(null)
  const [activeScenarioId, setActiveScenarioId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [events, setEvents] = useState([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [analysisReport, setAnalysisReport] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)

  const [streamError, setStreamError] = useState(null)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)
  const [transientWarning, setTransientWarning] = useState(null)

  const pollTimerRef = useRef(null)
  const isMountedRef = useRef(true)

  const saveSession = (demoId, scenarioId) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ demoId, scenarioId }))
    } catch {
      // Ignore
    }
  }

  const clearSession = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }

  const loadScenarios = useCallback(async () => {
    setLoadingScenarios(true)
    setScenarioError(null)
    try {
      const data = await getDemoScenarios()
      if (isMountedRef.current) {
        setScenarios(data || [])
      }
    } catch (err) {
      if (isMountedRef.current) {
        setScenarioError(err.message || 'Failed to load scenario list from backend.')
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingScenarios(false)
      }
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const fetchAnalysisReport = useCallback(async (analysisId) => {
    setLoadingReport(true)
    try {
      const report = await getAnalysis(analysisId)
      if (isMountedRef.current) {
        setAnalysisReport(report)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setTransientWarning('Simulation completed, but analysis record took longer than expected to persist.')
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingReport(false)
      }
    }
  }, [])

  const startPolling = useCallback((demoId) => {
    stopPolling()
    setConsecutiveFailures(0)
    setStreamError(null)
    setTransientWarning(null)

    pollTimerRef.current = setInterval(async () => {
      try {
        const data = await getDemoEvents(demoId)
        if (!isMountedRef.current) return

        setEvents(data.events || [])
        setTotalEvents(data.total_events || data.events?.length || 0)
        setElapsedSeconds(data.elapsed_seconds || 0)
        setConsecutiveFailures(0)
        setTransientWarning(null)

        if (data.status === 'complete') {
          stopPolling()
          setStatus('complete')
          clearSession()
          if (data.analysis_id) {
            fetchAnalysisReport(data.analysis_id)
          }
        }
      } catch (err) {
        if (!isMountedRef.current) return
        setConsecutiveFailures((prev) => {
          const next = prev + 1
          if (next >= 5) {
            stopPolling()
            setStatus('error')
            setStreamError('Lost connection to active demo stream after multiple consecutive attempts.')
          } else {
            setTransientWarning(`Temporary network glitch (${next}/5 retries) — polling continues...`)
          }
          return next
        })
      }
    }, 1000)
  }, [stopPolling, fetchAnalysisReport])

  const handleStartScenario = async (scenarioId) => {
    stopPolling()
    clearSession()

    setActiveScenarioId(scenarioId)
    setStatus('starting')
    setEvents([])
    setTotalEvents(0)
    setElapsedSeconds(0)
    setAnalysisReport(null)
    setStreamError(null)
    setTransientWarning(null)
    setConsecutiveFailures(0)

    try {
      const resp = await startDemo(scenarioId)
      if (!isMountedRef.current) return

      const demoId = resp.demo_id
      setActiveDemoId(demoId)
      setTotalEvents(resp.total_events || 0)
      setTotalDuration(resp.total_duration_seconds || 15)
      setStatus('running')
      saveSession(demoId, scenarioId)

      startPolling(demoId)
    } catch (err) {
      if (!isMountedRef.current) return
      setStatus('error')
      setStreamError(err.message || 'Failed to start demo scenario on backend.')
      clearSession()
    }
  }

  const handleReset = () => {
    stopPolling()
    clearSession()
    setActiveDemoId(null)
    setActiveScenarioId(null)
    setStatus('idle')
    setEvents([])
    setTotalEvents(0)
    setElapsedSeconds(0)
    setAnalysisReport(null)
    setStreamError(null)
    setTransientWarning(null)
    setConsecutiveFailures(0)
  }

  useEffect(() => {
    isMountedRef.current = true
    loadScenarios()

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.demoId && parsed?.scenarioId) {
          setActiveDemoId(parsed.demoId)
          setActiveScenarioId(parsed.scenarioId)
          setStatus('running')
          startPolling(parsed.demoId)
        }
      }
    } catch {
      clearSession()
    }

    return () => {
      isMountedRef.current = false
      stopPolling()
    }
  }, [loadScenarios, startPolling, stopPolling])

  const progressPercent = totalDuration > 0
    ? Math.min(100, Math.round((elapsedSeconds / totalDuration) * 100))
    : totalEvents > 0
    ? Math.min(100, Math.round((events.length / totalEvents) * 100))
    : 0

  const getScenarioIcon = (id) => {
    if (id === 'normal') return ShieldCheck
    if (id === 'suspicious') return AlertTriangle
    return Flame
  }

  const topEvidence = analysisReport?.evidence
    ? [...analysisReport.evidence]
        .sort((a, b) => (b.points_contributed || 0) - (a.points_contributed || 0))
        .slice(0, 3)
    : []

  return (
    <div className="space-y-4 font-sans pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-sm font-semibold font-mono text-[var(--color-text-primary)]">
            Demonstration Simulation Lab
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-normal">
            Execute deterministic synthetic scenarios to observe live behavioral and network telemetry streaming into the explainable detection engine. All evaluation and scoring is computed by the live backend pipeline.
          </p>
        </div>

        {status === 'running' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border bg-[var(--color-surface-2)] border-[var(--color-border)] shrink-0 select-none">
            <span className="w-1.5 h-1.5 rounded-full animate-ping bg-[var(--color-accent)]" />
            <span className="text-xs font-mono font-medium text-[var(--color-text-primary)]">
              Streaming simulation
            </span>
          </div>
        )}
      </div>

      {/* Simulated Telemetry Banner */}
      <SimulatedBanner
        message="SIMULATED TELEMETRY, NOT MONITORED FROM A REAL HOST."
        detail="Scenario events and synthetic file hashes are generated in-memory by TrojanGuard test generators. No real malware or malicious artifacts are executed."
      />

      {/* Scenarios Loading or Error State */}
      {loadingScenarios ? (
        <LoadingState message="Connecting to TrojanGuard demo scenario registry..." />
      ) : scenarioError ? (
        <ErrorState
          title="Backend Connection Failed"
          message={scenarioError}
          onRetry={loadScenarios}
          retryLabel="Retry Scenario Registry"
        />
      ) : (
        /* Scenario Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scenarios.map((sc) => {
            const IconComponent = getScenarioIcon(sc.id)
            const isThisRunning = activeScenarioId === sc.id && (status === 'running' || status === 'starting')
            const isAnyRunning = status === 'running' || status === 'starting'

            return (
              <div
                key={sc.id}
                className="rounded-[4px] border p-3.5 flex flex-col justify-between transition-colors bg-[var(--color-surface-1)]"
                style={{
                  borderColor: isThisRunning ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <IconComponent size={15} className="text-[var(--color-text-muted)] shrink-0" />
                      <div>
                        <h3 className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">
                          {sc.name}
                        </h3>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                          Scenario ID: {sc.id}
                        </span>
                      </div>
                    </div>

                    {isThisRunning && (
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] bg-[var(--color-surface-2)] text-[var(--color-accent)] border border-[var(--color-border)]"
                      >
                        RUNNING
                      </span>
                    )}
                  </div>

                  {/* Description from Backend */}
                  <p className="text-xs text-[var(--color-text-secondary)] leading-normal mb-3 font-sans">
                    {sc.description}
                  </p>
                </div>

                {/* Footer Info & Action */}
                <div className="pt-2.5 border-t border-[var(--color-border-subtle)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums">
                    <Clock size={11} />
                    <span>~{sc.total_duration_seconds}s sequence</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartScenario(sc.id)}
                    disabled={isAnyRunning}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-[3px] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)]"
                  >
                    <Play size={11} className={isThisRunning ? 'animate-spin' : ''} />
                    <span>{isThisRunning ? 'Simulating...' : 'Start Simulation'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Progress Bar for Active Simulation */}
      {(status === 'running' || status === 'starting') && (
        <div
          className="rounded-[4px] border p-3 font-mono bg-[var(--color-surface-1)]"
          style={{
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
              <span className="w-1.5 h-1.5 rounded-full animate-ping bg-[var(--color-accent)]" />
              <span>Simulating Telemetry Stream ({activeScenarioId})</span>
            </span>
            <span className="text-[var(--color-text-muted)] text-[11px] tabular-nums">
              {elapsedSeconds.toFixed(1)}s / {totalDuration}s ({progressPercent}%) • {events.length} / {totalEvents || '—'} events
            </span>
          </div>

          <div
            className="w-full h-1 rounded-full overflow-hidden bg-[var(--color-surface-3)]"
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-out bg-[var(--color-accent)]"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Stream Failure / Warning Alerts */}
      {transientWarning && (
        <div
          className="rounded-[3px] p-2.5 text-xs font-mono flex items-center justify-between border bg-[var(--color-risk-medium-bg)] border-[rgba(234,179,8,0.3)] text-[var(--color-risk-medium)]"
        >
          <span>{transientWarning}</span>
          <span className="text-[10px] uppercase font-semibold">NON-BLOCKING</span>
        </div>
      )}

      {streamError && (
        <ErrorState
          title="Telemetry Stream Error"
          message={streamError}
          onRetry={() => {
            if (activeDemoId) startPolling(activeDemoId)
            else if (activeScenarioId) handleStartScenario(activeScenarioId)
          }}
          retryLabel="Retry Simulation Stream"
        />
      )}

      {/* Live Event Telemetry Stream */}
      <EventStream
        events={events}
        title={`Live Telemetry Stream ${activeScenarioId ? `(${activeScenarioId})` : ''}`}
        maxHeight="300px"
        emptyMessage="Select a scenario above and click 'Start Simulation' to stream telemetry."
      />

      {/* Completion Result Panel */}
      {status === 'complete' && (
        <div
          className="rounded-[4px] border p-4 font-sans space-y-4 bg-[var(--color-surface-1)]"
          style={{
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Header & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-[var(--color-risk-low)]" />
                <h3 className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">
                  Simulation Complete • Canonical Analysis Result
                </h3>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 font-sans">
                Results computed by the same backend pipeline as uploaded files. Telemetry is simulated.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-[3px] transition-colors cursor-pointer bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"
              >
                <RotateCcw size={12} />
                <span>Reset / Run again</span>
              </button>

              {analysisReport?.id && (
                <Link
                  to={`/analysis/${analysisReport.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-[3px] transition-colors text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)]"
                >
                  <ExternalLink size={12} />
                  <span>View full report</span>
                </Link>
              )}
            </div>
          </div>

          {loadingReport ? (
            <LoadingState message="Retrieving persisted analysis from database..." />
          ) : analysisReport ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
              {/* Column 1: Semicircle Gauge */}
              <div className="flex flex-col items-center justify-center p-3 rounded-[3px] bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]">
                <RiskGauge
                  score={analysisReport.risk_score}
                  level={analysisReport.risk_level}
                  size={160}
                  strokeWidth={10}
                  label="Composite Risk"
                />
                <div className="mt-2.5 flex items-center gap-1.5">
                  <SeverityBadge value={analysisReport.classification} size="sm" />
                  <SeverityBadge value={analysisReport.risk_level} size="sm" />
                </div>
              </div>

              {/* Column 2: Classifier Output & Pipeline Summary */}
              <div className="p-3 rounded-[3px] bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-2">
                <div className="text-xs font-mono font-medium text-[var(--color-text-primary)]">
                  Classifier & decision rule
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                    <span>Classifier output:</span>
                    <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                      {analysisReport.classifier_output?.predicted_label || analysisReport.classification}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                    <span>Model confidence:</span>
                    <span className="font-mono text-[var(--color-text-primary)] tabular-nums">
                      {analysisReport.confidence !== null && analysisReport.confidence !== undefined
                        ? `${(analysisReport.confidence * 100).toFixed(1)}%`
                        : 'Rule-based evaluation'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                    <span>Raw score points:</span>
                    <span className="font-mono text-[var(--color-text-primary)] tabular-nums">
                      {analysisReport.raw_points} pts
                    </span>
                  </div>
                </div>

                {analysisReport.classifier_agrees === false && (
                  <div
                    className="p-2 rounded-[2px] text-xs leading-normal border bg-[var(--color-risk-medium-bg)] border-[rgba(234,179,8,0.3)] text-[var(--color-risk-medium)]"
                  >
                    <div className="font-semibold text-[10px] mb-0.5">
                      Decision Rule Notice
                    </div>
                    <div>
                      {analysisReport.classifier_disagreement_reason ||
                        'Rules decided final classification based on deterministic domain logic over ML prediction.'}
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-[var(--color-text-secondary)] pt-1.5 border-t border-[var(--color-border-subtle)] leading-normal font-sans">
                  {analysisReport.summary}
                </div>
              </div>

              {/* Column 3: Top 3 Evidence Items */}
              <div className="p-3 rounded-[3px] bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-[var(--color-text-primary)]">
                    Top evidence (by points)
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] tabular-nums">
                    {topEvidence.length} items
                  </span>
                </div>

                {topEvidence.length === 0 ? (
                  <div className="text-xs text-[var(--color-text-muted)] py-3 text-center font-mono">
                    No positive risk points contributed.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {topEvidence.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-[2px] border bg-[var(--color-surface-1)] border-[var(--color-border-subtle)] flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-medium text-[var(--color-text-primary)] truncate text-[11px]">
                            {ev.indicator}
                          </div>
                          <div className="text-[10px] text-[var(--color-text-muted)] font-mono truncate">
                            Observed: {String(ev.observed_value)}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className="font-mono text-[11px] px-1.5 py-0.2 rounded-[2px] tabular-nums"
                            style={{
                              backgroundColor: 'var(--color-risk-critical-bg)',
                              color: 'var(--color-risk-critical)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                            }}
                          >
                            +{ev.points_contributed} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
