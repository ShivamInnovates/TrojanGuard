import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Play,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Radio,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  Info,
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
  // Scenario definitions loaded dynamically from backend GET /api/demo/scenarios
  const [scenarios, setScenarios] = useState([])
  const [loadingScenarios, setLoadingScenarios] = useState(true)
  const [scenarioError, setScenarioError] = useState(null)

  // Execution state
  const [activeDemoId, setActiveDemoId] = useState(null)
  const [activeScenarioId, setActiveScenarioId] = useState(null)
  const [status, setStatus] = useState('idle') // 'idle' | 'starting' | 'running' | 'completing' | 'complete' | 'error'
  const [events, setEvents] = useState([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [analysisReport, setAnalysisReport] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)

  // Error handling states
  const [streamError, setStreamError] = useState(null)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)
  const [transientWarning, setTransientWarning] = useState(null)

  // Polling ref to ensure no leaked timers
  const pollTimerRef = useRef(null)
  const isMountedRef = useRef(true)

  // Helper to safely write to sessionStorage
  const saveSession = (demoId, scenarioId) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ demoId, scenarioId }))
    } catch {
      // Ignore storage quota/availability issues
    }
  }

  const clearSession = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }

  // Load scenarios from backend
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

  // Clear polling interval
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  // Poll demo events
  const pollEvents = useCallback(async (demoId) => {
    try {
      const data = await getDemoEvents(demoId)
      if (!isMountedRef.current) return

      // Reset transient failure counter on successful request
      setConsecutiveFailures(0)
      setTransientWarning(null)

      setElapsedSeconds(data.elapsed_seconds || 0)
      if (data.total_events) {
        setTotalEvents(data.total_events)
      }

      // Merge and deduplicate events by event properties
      if (Array.isArray(data.events)) {
        setEvents((prevEvents) => {
          const seen = new Set(prevEvents.map((e) => `${e.offset_seconds}-${e.event_type}-${e.timestamp}`))
          const newUnique = data.events.filter(
            (e) => !seen.has(`${e.offset_seconds}-${e.event_type}-${e.timestamp}`)
          )
          if (newUnique.length === 0) return prevEvents
          return [...prevEvents, ...newUnique]
        })
      }

      // Check if simulation run has completed
      if (data.status === 'complete') {
        stopPolling()
        clearSession()
        setStatus('complete')

        // Fetch persisted report from SQLite via canonical analysis pipeline
        if (data.analysis_id) {
          setLoadingReport(true)
          try {
            const report = await getAnalysis(data.analysis_id)
            if (isMountedRef.current) {
              setAnalysisReport(report)
            }
          } catch (repErr) {
            if (isMountedRef.current) {
              setTransientWarning(`Completed, but failed to load report details: ${repErr.message}`)
            }
          } finally {
            if (isMountedRef.current) {
              setLoadingReport(false)
            }
          }
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return
      setConsecutiveFailures((prev) => {
        const next = prev + 1
        if (next >= 5) {
          stopPolling()
          setStatus('error')
          setStreamError('Lost telemetry stream connection after 5 consecutive attempts.')
          clearSession()
        } else {
          setTransientWarning(`Telemetry poll jitter (attempt ${next}/5): retrying...`)
        }
        return next
      })
    }
  }, [stopPolling])

  // Start polling loop
  const startPolling = useCallback((demoId) => {
    stopPolling()
    pollEvents(demoId) // Initial immediate poll
    pollTimerRef.current = setInterval(() => {
      pollEvents(demoId)
    }, 1000)
  }, [pollEvents, stopPolling])

  // Start scenario handler
  const handleStartScenario = async (scenarioId) => {
    if (status === 'running' || status === 'starting') return

    // Clear previous simulation state
    stopPolling()
    setStatus('starting')
    setEvents([])
    setAnalysisReport(null)
    setStreamError(null)
    setTransientWarning(null)
    setConsecutiveFailures(0)
    setActiveScenarioId(scenarioId)

    const scMeta = scenarios.find((s) => s.id === scenarioId)
    if (scMeta) {
      setTotalDuration(scMeta.total_duration_seconds)
    }

    try {
      const resp = await startDemo(scenarioId)
      if (!isMountedRef.current) return

      const demoId = resp.demo_id
      setActiveDemoId(demoId)
      setTotalEvents(resp.total_events || 0)
      setTotalDuration(resp.total_duration_seconds || 15)
      setStatus('running')
      saveSession(demoId, scenarioId)

      // Begin 1000ms polling loop
      startPolling(demoId)
    } catch (err) {
      if (!isMountedRef.current) return
      setStatus('error')
      setStreamError(err.message || 'Failed to start demo scenario on backend.')
      clearSession()
    }
  }

  // Reset / Run Again handler
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

  // Component mount & resume logic
  useEffect(() => {
    isMountedRef.current = true
    loadScenarios()

    // Check for active demo session in sessionStorage
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

  // Compute progress ratio
  const progressPercent = totalDuration > 0
    ? Math.min(100, Math.round((elapsedSeconds / totalDuration) * 100))
    : totalEvents > 0
    ? Math.min(100, Math.round((events.length / totalEvents) * 100))
    : 0

  // Icon mapping for scenario cards
  const getScenarioIcon = (id) => {
    if (id === 'normal') return ShieldCheck
    if (id === 'suspicious') return AlertTriangle
    return Flame
  }

  // Scenario theme accents
  const getScenarioAccent = (id) => {
    if (id === 'normal') return 'var(--color-risk-low)'
    if (id === 'suspicious') return 'var(--color-risk-high)'
    return 'var(--color-risk-critical)'
  }

  // Top 3 evidence items
  const topEvidence = analysisReport?.evidence
    ? [...analysisReport.evidence]
        .sort((a, b) => (b.points_contributed || 0) - (a.points_contributed || 0))
        .slice(0, 3)
    : []

  return (
    <div className="space-y-6 font-sans pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <Radio size={20} className="text-[var(--color-accent)] animate-pulse" />
            <h2 className="text-lg font-bold font-mono tracking-tight text-[var(--color-text-primary)]">
              Demonstration Simulation Lab
            </h2>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-2xl leading-relaxed">
            Execute deterministic synthetic scenarios to observe live behavioral and network telemetry streaming into the explainable detection engine. All evaluation and scoring is computed by the live backend pipeline.
          </p>
        </div>

        {status === 'running' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border bg-[var(--color-surface-2)] border-[var(--color-accent-dim)] shrink-0 select-none">
            <span className="w-2 h-2 rounded-full animate-ping bg-[var(--color-accent)]" />
            <span className="text-xs font-mono font-semibold text-[var(--color-accent)]">
              STREAMING SIMULATION
            </span>
          </div>
        )}
      </div>

      {/* Simulated Telemetry Banner */}
      <SimulatedBanner
        message="Simulated telemetry, not monitored from a real host."
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {scenarios.map((sc) => {
            const IconComponent = getScenarioIcon(sc.id)
            const accent = getScenarioAccent(sc.id)
            const isThisRunning = activeScenarioId === sc.id && (status === 'running' || status === 'starting')
            const isAnyRunning = status === 'running' || status === 'starting'

            return (
              <div
                key={sc.id}
                className="rounded-lg border p-5 flex flex-col justify-between transition-all duration-200 relative overflow-hidden"
                style={{
                  backgroundColor: 'var(--color-surface-1)',
                  borderColor: isThisRunning ? accent : 'var(--color-border)',
                  boxShadow: isThisRunning
                    ? `0 0 0 1px ${accent}, var(--shadow-card)`
                    : 'var(--shadow-card)',
                }}
              >
                {/* Active Indicator Strip */}
                {isThisRunning && (
                  <div
                    className="absolute top-0 left-0 right-0 h-1 animate-pulse"
                    style={{ backgroundColor: accent }}
                  />
                )}

                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: 'var(--color-surface-2)',
                          borderColor: 'var(--color-border-subtle)',
                          color: accent,
                        }}
                      >
                        <IconComponent size={20} />
                      </div>
                      <div>
                        <h3 className="font-mono text-sm font-bold text-[var(--color-text-primary)]">
                          {sc.name}
                        </h3>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
                          Scenario ID: {sc.id}
                        </span>
                      </div>
                    </div>

                    {isThisRunning && (
                      <span
                        className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase"
                        style={{
                          backgroundColor: 'var(--color-surface-2)',
                          color: accent,
                          border: `1px solid ${accent}`,
                        }}
                      >
                        RUNNING
                      </span>
                    )}
                  </div>

                  {/* Description from Backend */}
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-4">
                    {sc.description}
                  </p>
                </div>

                {/* Footer Info & Action */}
                <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-text-muted)]">
                    <Clock size={13} />
                    <span>~{sc.total_duration_seconds}s sequence</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartScenario(sc.id)}
                    disabled={isAnyRunning}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      backgroundColor: isThisRunning ? 'var(--color-surface-2)' : accent,
                      color: isThisRunning ? accent : '#0a0f1d',
                      border: isThisRunning ? `1px solid ${accent}` : 'none',
                    }}
                  >
                    <Play size={13} className={isThisRunning ? 'animate-spin' : ''} />
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
          className="rounded-lg border p-4 font-mono transition-all"
          style={{
            backgroundColor: 'var(--color-surface-1)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-2 font-semibold text-[var(--color-text-primary)]">
              <span className="w-2 h-2 rounded-full animate-ping bg-[var(--color-accent)]" />
              <span>Simulating Telemetry Stream ({activeScenarioId})</span>
            </span>
            <span className="text-[var(--color-text-secondary)]">
              {elapsedSeconds.toFixed(1)}s / {totalDuration}s ({progressPercent}%) &bull; {events.length} / {totalEvents || '—'} events
            </span>
          </div>

          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface-3)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: 'var(--color-accent)',
              }}
            />
          </div>
        </div>
      )}

      {/* Stream Failure / Warning Alerts */}
      {transientWarning && (
        <div
          className="rounded-md p-3 text-xs font-mono flex items-center justify-between border"
          style={{
            backgroundColor: 'var(--color-risk-medium-bg)',
            borderColor: 'hsl(45 50% 25%)',
            color: 'var(--color-risk-medium)',
          }}
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
        maxHeight="320px"
        emptyMessage="Select a scenario above and click 'Start Simulation' to stream telemetry."
      />

      {/* Completion Result Panel */}
      {status === 'complete' && (
        <div
          className="rounded-lg border p-6 font-sans space-y-6 transition-all animate-in fade-in duration-300"
          style={{
            backgroundColor: 'var(--color-surface-1)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Header & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[var(--color-risk-low)]" />
                <h3 className="font-mono text-base font-bold text-[var(--color-text-primary)]">
                  Simulation Complete &bull; Canonical Analysis Result
                </h3>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-sans">
                Results computed by the same backend pipeline as uploaded files. Telemetry is simulated.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <RotateCcw size={13} />
                <span>Reset / Run Again</span>
              </button>

              {analysisReport?.id && (
                <Link
                  to={`/analysis/${analysisReport.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded transition-colors"
                  style={{
                    backgroundColor: 'var(--color-accent-subtle)',
                    color: 'var(--color-accent)',
                    border: '1px solid var(--color-accent-dim)',
                  }}
                >
                  <ExternalLink size={13} />
                  <span>View Full Report</span>
                </Link>
              )}
            </div>
          </div>

          {loadingReport ? (
            <LoadingState message="Retrieving persisted analysis from database..." />
          ) : analysisReport ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Column 1: Semicircle Gauge */}
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]">
                <RiskGauge
                  score={analysisReport.risk_score}
                  level={analysisReport.risk_level}
                  size={190}
                  label="Composite Risk"
                />
                <div className="mt-3 flex items-center gap-2">
                  <SeverityBadge value={analysisReport.classification} size="md" />
                  <SeverityBadge value={analysisReport.risk_level} size="md" />
                </div>
              </div>

              {/* Column 2: Classifier Output & Pipeline Summary */}
              <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-3">
                <div className="text-xs font-mono font-semibold uppercase text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[var(--color-accent)]" />
                  <span>Classifier & Decision Rule</span>
                </div>

                {/* Classifier Output Labelled explicitly (not 'accuracy') */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                    <span>Classifier output:</span>
                    <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                      {analysisReport.classifier_output?.predicted_label || analysisReport.classification}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                    <span>Model confidence:</span>
                    <span className="font-mono text-[var(--color-accent)]">
                      {analysisReport.confidence !== null && analysisReport.confidence !== undefined
                        ? `${(analysisReport.confidence * 100).toFixed(1)}%`
                        : 'Rule-based evaluation'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                    <span>Raw score points:</span>
                    <span className="font-mono text-[var(--color-text-primary)]">
                      {analysisReport.raw_points} pts
                    </span>
                  </div>
                </div>

                {/* Disagreement Notice if rules overrode ML */}
                {analysisReport.classifier_agrees === false && (
                  <div
                    className="p-2.5 rounded text-xs leading-relaxed border"
                    style={{
                      backgroundColor: 'var(--color-risk-medium-bg)',
                      borderColor: 'hsl(45 50% 25%)',
                      color: 'var(--color-risk-medium)',
                    }}
                  >
                    <div className="font-semibold uppercase text-[10px] mb-0.5">
                      Decision Rule Notice
                    </div>
                    <div>
                      {analysisReport.classifier_disagreement_reason ||
                        'Rules decided final classification based on deterministic domain logic over ML prediction.'}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="text-[11px] text-[var(--color-text-secondary)] pt-2 border-t border-[var(--color-border-subtle)] leading-relaxed">
                  {analysisReport.summary}
                </div>
              </div>

              {/* Column 3: Top 3 Evidence Items */}
              <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold uppercase text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <FileText size={14} className="text-[var(--color-accent)]" />
                    <span>Top Evidence (by points)</span>
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                    {topEvidence.length} items
                  </span>
                </div>

                {topEvidence.length === 0 ? (
                  <div className="text-xs text-[var(--color-text-muted)] py-4 text-center">
                    No positive risk points contributed.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topEvidence.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded border bg-[var(--color-surface-1)] border-[var(--color-border-subtle)] flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-semibold text-[var(--color-text-primary)] truncate">
                            {ev.indicator}
                          </div>
                          <div className="text-[11px] text-[var(--color-text-muted)] font-mono truncate">
                            Observed: {String(ev.observed_value)}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className="font-mono font-bold text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--color-risk-critical-bg)',
                              color: 'var(--color-risk-critical)',
                              border: '1px solid hsl(0 50% 25%)',
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
