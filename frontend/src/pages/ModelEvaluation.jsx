import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Cpu,
  Clock,
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'

import { getHealth } from '../services/api'
import LoadingState from '../components/LoadingState'

export default function ModelEvaluation() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await getHealth()
        setHealth(data)
      } catch {
        // Fallback
      } finally {
        setLoading(false)
      }
    }
    loadHealth()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <LoadingState message="Checking ML model inference engine status..." />
      </div>
    )
  }

  const isModelActive = health?.ml_model_loaded === true

  return (
    <div className="space-y-6 font-sans pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <Cpu size={20} className="text-[var(--color-accent)]" />
            <h1 className="text-base font-bold font-mono text-[var(--color-text-primary)]">
              Machine Learning Model Evaluation & Architecture
            </h1>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-2xl">
            Inference engine metrics, synthetic feature classifier status, and upcoming real-world CIC-MalMem-2022 memory forensic model.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: isModelActive ? 'var(--color-risk-low)' : 'var(--color-risk-medium)',
              border: `1px solid ${isModelActive ? 'var(--color-risk-low)' : 'var(--color-risk-medium)'}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: isModelActive ? 'var(--color-risk-low)' : 'var(--color-risk-medium)' }}
            />
            <span>{isModelActive ? 'Synthetic RF Active' : 'Model Offline'}</span>
          </span>
        </div>
      </div>

      {/* Real-Data Model Training Pending Banner (Phase 5b) */}
      <div
        className="p-5 rounded-lg border space-y-3"
        style={{
          backgroundColor: 'var(--color-surface-1)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[var(--color-accent)]">
          <Clock size={16} />
          <span>Real-World Model Training Pending (Phase 5b Specification)</span>
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed font-sans max-w-3xl">
          The production real-world Random Forest model on the <strong>CIC-MalMem-2022</strong> memory forensics dataset will be trained and integrated in Phase 5b. Endpoints <code>GET /api/model/real/metrics</code> and <code>POST /api/model/real/predict</code> will provide confusion matrix visualizers, precision/recall/F1 metrics, and probability band classification [0.35, 0.65] for Suspicious activity.
        </p>

        <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--color-text-muted)] flex-wrap gap-2">
          <span>Target Dataset: CIC-MalMem-2022 (Obfuscated Malware Memory Forensics)</span>
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-primary)]">Phase 5b Deliverable</span>
        </div>
      </div>

      {/* Active Synthetic Model Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          className="p-4 rounded-lg border bg-[var(--color-surface-1)] space-y-2 font-mono text-xs"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-[var(--color-text-muted)] text-[11px] uppercase flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-[var(--color-risk-low)]" />
            <span>Active Inference Engine</span>
          </div>
          <div className="text-sm font-bold text-[var(--color-text-primary)]">
            Random Forest Classifier
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)] font-sans">
            Trained on 3,000 synthetic samples with 4% label noise and overlapping class boundaries.
          </div>
        </div>

        <div
          className="p-4 rounded-lg border bg-[var(--color-surface-1)] space-y-2 font-mono text-xs"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-[var(--color-text-muted)] text-[11px] uppercase flex items-center gap-1.5">
            <Database size={13} className="text-[var(--color-accent)]" />
            <span>Feature Dimension</span>
          </div>
          <div className="text-sm font-bold text-[var(--color-text-primary)]">
            9 Feature Vector
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)] font-sans">
            Includes entropy, import counts, process activity, network connections, and persistence flags.
          </div>
        </div>

        <div
          className="p-4 rounded-lg border bg-[var(--color-surface-1)] space-y-2 font-mono text-xs"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-[var(--color-text-muted)] text-[11px] uppercase flex items-center gap-1.5">
            <Layers size={13} className="text-[var(--color-risk-medium)]" />
            <span>Telemetry Applicability</span>
          </div>
          <div className="text-sm font-bold text-[var(--color-text-primary)]">
            Observed Mask Guard
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)] font-sans">
            Static uploads safely flag telemetry as unobserved; model only votes when behavioral signals exist.
          </div>
        </div>
      </div>

      {/* CTA to Demo Lab */}
      <div
        className="p-5 rounded-lg border bg-[var(--color-surface-2)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="text-xs font-mono font-bold text-[var(--color-text-primary)]">
            Observe Active Inference in the Demo Lab
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Launch live simulations to watch model confidence and explainable decision rules execute in real time.
          </p>
        </div>
        <Link
          to="/demo"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold rounded shrink-0 transition-colors"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#0a0f1d',
          }}
        >
          <span>Open Demo Lab</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
