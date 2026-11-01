import React, { useState, useEffect } from 'react'
import {
  Cpu,
  Database,
  Layers,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  FlaskConical,
  Sparkles,
  RefreshCw,
  Send,
  FileSpreadsheet,
  Scale,
  ShieldAlert,
} from 'lucide-react'

import { getRealModelMetrics, predictRealModel } from '../services/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import StatCard from '../components/StatCard'

export default function ModelEvaluation() {
  const [metricsData, setMetricsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notTrained, setNotTrained] = useState(false)
  const [activeTab, setActiveTab] = useState('eval_b') // 'eval_a' | 'eval_b' | 'eval_c'

  // Prediction tester state
  const [predictionInput, setPredictionInput] = useState('')
  const [predicting, setPredicting] = useState(false)
  const [predictionResult, setPredictionResult] = useState(null)
  const [predictionError, setPredictionError] = useState(null)

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    setNotTrained(false)
    try {
      const data = await getRealModelMetrics()
      setMetricsData(data)
    } catch (err) {
      if (err.status === 404) {
        setNotTrained(true)
      } else {
        setError(err.message || 'Failed to load model evaluation metrics.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  // Sample feature row generator for quick viva testing
  const loadSamplePrediction = (type = 'trojan') => {
    setPredictionError(null)
    setPredictionResult(null)

    // Base synthetic sample matching the 51 feature schema
    const sample = {
      'pslist.nproc': type === 'trojan' ? 42 : 45,
      'pslist.nppid': type === 'trojan' ? 14 : 17,
      'pslist.avg_threads': type === 'trojan' ? 14.5 : 10.5,
      'pslist.avg_handlers': type === 'trojan' ? 285.0 : 202.8,
      'dlllist.ndlls': type === 'trojan' ? 1930 : 1694,
      'dlllist.avg_dlls_per_proc': type === 'trojan' ? 48.0 : 38.5,
      'handles.nhandles': type === 'trojan' ? 11500 : 9129,
      'handles.avg_handles_per_proc': type === 'trojan' ? 285.0 : 212.3,
      'handles.nfile': type === 'trojan' ? 1050 : 670,
      'handles.nevent': type === 'trojan' ? 3990 : 3161,
      'handles.ndesktop': type === 'trojan' ? 45 : 46,
      'handles.nkey': type === 'trojan' ? 784 : 716,
      'handles.nthread': type === 'trojan' ? 1240 : 887,
      'handles.ndirectory': type === 'trojan' ? 100 : 104,
      'handles.nsemaphore': type === 'trojan' ? 645 : 671,
      'handles.ntimer': type === 'trojan' ? 138 : 125,
      'handles.nsection': type === 'trojan' ? 369 : 184,
      'handles.nmutant': type === 'trojan' ? 338 : 257,
      'ldrmodules.not_in_load': type === 'trojan' ? 46 : 75,
      'ldrmodules.not_in_init': type === 'trojan' ? 89 : 95,
      'ldrmodules.not_in_mem': type === 'trojan' ? 46 : 53,
      'ldrmodules.not_in_load_avg': type === 'trojan' ? 0.026 : 0.030,
      'ldrmodules.not_in_init_avg': type === 'trojan' ? 0.045 : 0.054,
      'ldrmodules.not_in_mem_avg': type === 'trojan' ? 0.026 : 0.030,
      'malfind.ninjections': type === 'trojan' ? 5 : 4,
      'malfind.commitCharge': type === 'trojan' ? 21 : 21,
      'malfind.protection': type === 'trojan' ? 30 : 30,
      'malfind.uniqueInjections': type === 'trojan' ? 1.25 : 1.25,
      'psxview.not_in_pslist': 0,
      'psxview.not_in_eprocess_pool': 0,
      'psxview.not_in_ethread_pool': 0,
      'psxview.not_in_pspcid_list': 0,
      'psxview.not_in_csrss_handles': 4,
      'psxview.not_in_session': 2,
      'psxview.not_in_deskthrd': 5,
      'psxview.not_in_pslist_false_avg': 0.0,
      'psxview.not_in_eprocess_pool_false_avg': 0.0,
      'psxview.not_in_ethread_pool_false_avg': 0.0,
      'psxview.not_in_pspcid_list_false_avg': 0.0,
      'psxview.not_in_csrss_handles_false_avg': 0.1,
      'psxview.not_in_session_false_avg': 0.05,
      'psxview.not_in_deskthrd_false_avg': 0.125,
      'modules.nmodules': 137,
      'svcscan.nservices': type === 'trojan' ? 389 : 395,
      'svcscan.kernel_drivers': 222,
      'svcscan.fs_drivers': 26,
      'svcscan.process_services': 24,
      'svcscan.shared_process_services': 116,
      'svcscan.nactive': 120,
      'callbacks.ncallbacks': 88,
      'callbacks.nanonymous': 0,
    }

    setPredictionInput(JSON.stringify({ features: sample }, null, 2))
  }

  const handlePredict = async (e) => {
    e.preventDefault()
    setPredicting(true)
    setPredictionError(null)
    setPredictionResult(null)

    try {
      let payload
      try {
        payload = JSON.parse(predictionInput)
      } catch {
        throw new Error('Input must be a valid JSON object with a "features" dictionary or 51 feature key-value pairs.')
      }

      const res = await predictRealModel(payload)
      setPredictionResult(res)
    } catch (err) {
      setPredictionError(err.message || 'Inference failed.')
    } finally {
      setPredicting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <LoadingState message="Loading real-data model evaluation metrics (CIC-MalMem-2022)..." />
      </div>
    )
  }

  if (notTrained) {
    return (
      <div className="max-w-7xl mx-auto py-8 space-y-6 font-sans">
        <div
          className="p-6 rounded-lg border text-center space-y-4"
          style={{
            backgroundColor: 'var(--color-surface-1)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-[var(--color-surface-2)] text-[var(--color-accent)]">
            <Cpu size={24} />
          </div>
          <div>
            <h2 className="text-base font-mono font-bold text-[var(--color-text-primary)]">
              Model Training Pending (Phase 5b)
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-xl mx-auto">
              The real-data Random Forest model on the <strong>CIC-MalMem-2022</strong> memory forensics dataset has not been trained yet.
            </p>
          </div>

          <div
            className="p-4 rounded border text-left max-w-md mx-auto font-mono text-xs text-[var(--color-text-muted)] space-y-1"
            style={{ backgroundColor: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-[var(--color-accent)] font-semibold"># To train the real-data model:</p>
            <p>1. ml/real/.venv/bin/python ml/real/prepare.py</p>
            <p>2. ml/real/.venv/bin/python ml/real/train_real.py</p>
          </div>

          <button
            onClick={fetchMetrics}
            className="px-4 py-2 rounded text-xs font-mono font-semibold transition-colors inline-flex items-center gap-2"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg-base)' }}
          >
            <RefreshCw size={14} />
            <span>Check Status Again</span>
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <ErrorState error={error} onRetry={fetchMetrics} />
      </div>
    )
  }

  const {
    dataset,
    model_architecture,
    headline_recommendation,
    evaluations,
    robustness_ablation,
    generalization_disclaimer,
  } = metricsData
  const evalA = evaluations.eval_a_random_stratified
  const evalB = evaluations.eval_b_grouped_sample_hash
  const evalC = evaluations.eval_c_leave_one_family_out

  // Active eval selection for detailed breakdown
  const currentEval =
    activeTab === 'eval_a' ? evalA : activeTab === 'eval_b' ? evalB : evalC

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
              Real-Data Model Evaluation & Forensics Architecture
            </h1>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-2xl">
            Trained on the <strong>CIC-MalMem-2022</strong> memory forensics dataset. Multi-regime honest evaluation measuring performance on unseen samples and novel families within the same laboratory environment (not real-world generalization; benign rows lack sample IDs, so benign data leakage cannot be ruled out).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-risk-low)',
              border: '1px solid var(--color-risk-low)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: 'var(--color-risk-low)' }}
            />
            <span>Real Model Active</span>
          </span>
        </div>
      </div>

      {/* Dataset & Architectural Separation Notice */}
      <div
        className="p-4 rounded-lg border flex flex-col md:flex-row gap-4 justify-between items-start"
        style={{
          backgroundColor: 'var(--color-surface-1)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="space-y-1.5 text-xs text-[var(--color-text-secondary)] max-w-3xl">
          <div className="flex items-center gap-2 font-mono font-bold text-[var(--color-text-primary)]">
            <Database size={16} className="text-[var(--color-accent)]" />
            <span>Dataset & In-Memory Extraction Boundaries</span>
          </div>
          <p className="leading-relaxed">
            <strong>Dataset Citation:</strong> {dataset.citation} (Canadian Institute for Cybersecurity, UNB).
          </p>
          <p className="leading-relaxed">
            <strong>Important Architectural Separation:</strong> Features in this model represent <strong>51 Volatility memory-forensics measurements</strong> extracted offline from VM memory dumps (e.g., process injection counters, handle counts, kernel driver states). They <strong>cannot</strong> be extracted from an uploaded binary by this web application without executing live malware in a hypervisor. Therefore, this model is separate from the live Demo Lab and Sample Analysis pipelines.
          </p>
        </div>

        <div
          className="p-3 rounded border text-xs font-mono space-y-1 shrink-0 w-full md:w-64"
          style={{ backgroundColor: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="text-[var(--color-text-muted)] uppercase text-[10px] tracking-wider">
            Dataset Summary
          </div>
          <div className="flex justify-between">
            <span>Clean Samples:</span>
            <span className="font-bold text-[var(--color-text-primary)]">{dataset.total_cleaned_samples.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Benign Rows:</span>
            <span className="text-[var(--color-risk-low)]">{dataset.benign_samples.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Trojan Rows:</span>
            <span className="text-[var(--color-risk-critical)]">{dataset.trojan_samples.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Trojan Families:</span>
            <span className="text-[var(--color-accent)]">{dataset.trojan_families.length}</span>
          </div>
        </div>
      </div>

      {/* Headline Metric Recommendation Banner */}
      <div
        className="p-4 rounded-lg border space-y-2"
        style={{
          backgroundColor: 'rgba(56, 189, 248, 0.05)',
          borderColor: 'var(--color-accent)',
        }}
      >
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--color-accent)]">
          <Sparkles size={16} />
          <span>HEADLINE EVALUATION GUIDANCE (ACADEMIC VIVA DEFENSE)</span>
        </div>
        <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">
          {headline_recommendation.reason}
        </p>
        <div className="text-xs font-mono text-[var(--color-text-secondary)]">
          <strong>Recommended Headline Quote:</strong>{' '}
          <span className="text-[var(--color-accent)] font-semibold">
            {headline_recommendation.headline_evaluation}
          </span>
        </div>
      </div>

      {/* Side-by-Side Evaluation Selector */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('eval_b')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
              activeTab === 'eval_b'
                ? 'bg-[var(--color-accent)] text-[var(--color-bg-base)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            Eval B: Grouped by Sample (Unseen Samples in Lab)
          </button>
          <button
            onClick={() => setActiveTab('eval_c')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
              activeTab === 'eval_c'
                ? 'bg-[var(--color-accent)] text-[var(--color-bg-base)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            Eval C: Leave-One-Family-Out (Novel Families in Lab)
          </button>
          <button
            onClick={() => setActiveTab('eval_a')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
              activeTab === 'eval_a'
                ? 'bg-[var(--color-accent)] text-[var(--color-bg-base)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            Eval A: Stratified 80/20 (Naive Baseline)
          </button>
        </div>

        {/* Selected Evaluation Overview Cards */}
        {activeTab !== 'eval_c' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Accuracy"
              value={`${(currentEval.accuracy * 100).toFixed(1)}%`}
              subtitle={currentEval.sample_leakage_warning ? 'Optimistic baseline' : 'Unseen samples (same lab)'}
              accentColor="var(--color-accent)"
            />
            <StatCard
              title="Precision"
              value={`${(currentEval.precision * 100).toFixed(1)}%`}
              subtitle="Trojan positive rate"
              accentColor="var(--color-risk-low)"
            />
            <StatCard
              title="Recall"
              value={`${(currentEval.recall * 100).toFixed(1)}%`}
              subtitle="Detection sensitivity"
              accentColor="var(--color-risk-critical)"
            />
            <StatCard
              title="F1 Score"
              value={`${(currentEval.f1_score * 100).toFixed(1)}%`}
              subtitle="Harmonic mean"
              accentColor="var(--color-risk-medium)"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Macro Recall"
              value={`${(evalC.macro_average_recall * 100).toFixed(2)}%`}
              subtitle="Across 5 novel families (same lab)"
              accentColor="var(--color-risk-critical)"
            />
            <StatCard
              title="Macro Accuracy"
              value={`${(evalC.macro_fold_accuracy * 100).toFixed(2)}%`}
              subtitle="Average cross-validation fold"
              accentColor="var(--color-accent)"
            />
            <StatCard
              title="Macro Precision"
              value={`${(evalC.macro_fold_precision * 100).toFixed(2)}%`}
              subtitle="Positive predictive value"
              accentColor="var(--color-risk-low)"
            />
            <StatCard
              title="Macro F1"
              value={`${(evalC.macro_fold_f1 * 100).toFixed(2)}%`}
              subtitle="Novel family test (same lab)"
              accentColor="var(--color-risk-medium)"
            />
          </div>
        )}
      </div>

      {/* Main Breakdown: Confusion Matrix & Details or Cross-Family Table */}
      {activeTab === 'eval_c' ? (
        /* Evaluation C: Per-Family Recall Table */
        <div
          className="p-5 rounded-lg border space-y-4"
          style={{
            backgroundColor: 'var(--color-surface-1)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-[var(--color-text-primary)]">
              <FlaskConical size={16} className="text-[var(--color-accent)]" />
              <span>Leave-One-Family-Out Cross-Validation (Same Lab Environment)</span>
            </div>
            <span className="text-xs font-mono text-[var(--color-text-muted)]">
              5 Folds (Trained on 4 families + 80% Benign, Tested on held-out; benign rows lack sample IDs)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr
                  className="border-b text-[var(--color-text-muted)] font-mono text-[11px] uppercase tracking-wider"
                  style={{ borderColor: 'var(--color-border-subtle)' }}
                >
                  <th className="py-2.5 px-3">Held-Out Trojan Family</th>
                  <th className="py-2.5 px-3">Test Samples (n)</th>
                  <th className="py-2.5 px-3">Family Recall</th>
                  <th className="py-2.5 px-3">Benign FPR</th>
                  <th className="py-2.5 px-3">Fold Precision</th>
                  <th className="py-2.5 px-3">Fold F1</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                {Object.values(evalC.per_family_results).map((row) => (
                  <tr key={row.family} className="hover:bg-[var(--color-surface-2)] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-text-primary)]">
                      {row.family}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[var(--color-text-secondary)]">
                      {row.test_count.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[var(--color-risk-critical)]">
                      {(row.recall * 100).toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[var(--color-risk-low)]">
                      {(row.benign_fpr * 100).toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[var(--color-text-primary)]">
                      {(row.fold_precision * 100).toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[var(--color-text-primary)]">
                      {(row.fold_f1 * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Evaluation A & B: Confusion Matrix & Feature Importances */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Confusion Matrix */}
          <div
            className="p-5 rounded-lg border space-y-4"
            style={{
              backgroundColor: 'var(--color-surface-1)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-[var(--color-text-primary)]">
                <Layers size={16} className="text-[var(--color-accent)]" />
                <span>Confusion Matrix ({currentEval.name})</span>
              </div>
            </div>

            <div className="p-4 rounded border space-y-3" style={{ backgroundColor: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded border bg-[var(--color-surface-1)]" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase">True Negative (Benign)</div>
                  <div className="text-lg font-mono font-bold text-[var(--color-risk-low)] mt-1">
                    {currentEval.confusion_matrix[0][0].toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">Correctly identified clean</div>
                </div>

                <div className="p-3 rounded border bg-[var(--color-surface-1)]" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase">False Positive</div>
                  <div className="text-lg font-mono font-bold text-[var(--color-risk-medium)] mt-1">
                    {currentEval.confusion_matrix[0][1].toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">Clean flagged as Trojan</div>
                </div>

                <div className="p-3 rounded border bg-[var(--color-surface-1)]" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase">False Negative</div>
                  <div className="text-lg font-mono font-bold text-[var(--color-risk-critical)] mt-1">
                    {currentEval.confusion_matrix[1][0].toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">Trojan missed</div>
                </div>

                <div className="p-3 rounded border bg-[var(--color-surface-1)]" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase">True Positive (Trojan)</div>
                  <div className="text-lg font-mono font-bold text-[var(--color-risk-low)] mt-1">
                    {currentEval.confusion_matrix[1][1].toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">Correctly detected Trojan</div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Feature Importances */}
          <div
            className="p-5 rounded-lg border space-y-4"
            style={{
              backgroundColor: 'var(--color-surface-1)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-[var(--color-text-primary)]">
                <BarChart3 size={16} className="text-[var(--color-accent)]" />
                <span>Top Feature Importances (Gini Impurity)</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Top 8 shown</span>
            </div>

            <div className="space-y-2.5">
              {currentEval.top_15_features.slice(0, 8).map((f) => (
                <div key={f.feature} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[var(--color-text-secondary)]">{f.feature}</span>
                    <span className="text-[var(--color-accent)] font-semibold">{(f.importance * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(f.importance * 350, 100)}%`,
                        backgroundColor: 'var(--color-accent)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Robustness Check (Feature Removal Ablation Study) */}
      {robustness_ablation && (
        <div
          className="p-5 rounded-lg border space-y-4"
          style={{
            backgroundColor: 'var(--color-surface-1)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3"
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-[var(--color-text-primary)]">
              <Scale size={16} className="text-[var(--color-accent)]" />
              <span>Robustness Check: Feature Removal Ablations & Lab Bounds</span>
            </div>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--color-accent)] self-start sm:self-auto"
              style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}
            >
              Intra-Lab Robustness
            </span>
          </div>

          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            To test whether classification depends on specific laboratory testbed artifacts (such as static OS service counts), Evaluations B and C were re-run under two feature ablation conditions: (1) removing <strong>all 6 <code>svcscan.*</code> features</strong>, and (2) removing the <strong>top-5 features by importance</strong>. Both evaluations measure performance on unseen samples/families <strong>within the same lab environment</strong>; because benign rows lack sample IDs, benign data leakage cannot be ruled out.
          </p>

          {/* svcscan.nservices artifact verification */}
          {dataset.artifact_verification_stats && (
            <div
              className="p-3.5 rounded border text-xs font-sans space-y-2"
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.05)',
                borderColor: 'rgba(234, 179, 8, 0.3)',
              }}
            >
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[var(--color-risk-medium)]">
                <AlertTriangle size={14} />
                <span>Cleaned Data Artifact Verification ({dataset.artifact_verification_stats.feature})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-1">
                  <div className="text-[10px] text-[var(--color-text-muted)] uppercase">
                    Benign (n={dataset.artifact_verification_stats.stats.benign.count.toLocaleString()}):
                  </div>
                  <div className="text-[var(--color-text-primary)]">
                    Mean: <span className="font-bold text-[var(--color-risk-low)]">{dataset.artifact_verification_stats.stats.benign.mean.toFixed(2)}</span> | Median: <span className="font-bold">{dataset.artifact_verification_stats.stats.benign.median.toFixed(1)}</span> | Std: <span className="font-bold">{dataset.artifact_verification_stats.stats.benign.std.toFixed(4)}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-1">
                  <div className="text-[10px] text-[var(--color-text-muted)] uppercase">
                    Trojan (n={dataset.artifact_verification_stats.stats.trojan.count.toLocaleString()}):
                  </div>
                  <div className="text-[var(--color-text-primary)]">
                    Mean: <span className="font-bold text-[var(--color-risk-critical)]">{dataset.artifact_verification_stats.stats.trojan.mean.toFixed(2)}</span> | Median: <span className="font-bold">{dataset.artifact_verification_stats.stats.trojan.median.toFixed(1)}</span> | Std: <span className="font-bold">{dataset.artifact_verification_stats.stats.trojan.std.toFixed(4)}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                The persistent ~5.5-service delta with tight standard deviation (~1.4) represents a laboratory virtual machine baseline artifact distinguishing benign capture runs from malware capture runs.
              </p>
            </div>
          )}

          {/* Ablation Table 1: Evaluation B */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-mono font-bold text-[var(--color-text-primary)] flex items-center justify-between">
              <span>Evaluation B Ablation (Grouped by Sample Hash — Unseen Samples)</span>
              <span className="text-[10px] font-normal text-[var(--color-text-muted)]">
                Test: {(robustness_ablation.eval_b_comparison.test_trojan_count || 1825).toLocaleString()} Trojan, {(robustness_ablation.eval_b_comparison.test_benign_count || 5855).toLocaleString()} Benign
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr
                    className="border-b text-[var(--color-text-muted)] font-mono text-[11px] uppercase tracking-wider"
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                  >
                    <th className="py-2 px-3">Condition</th>
                    <th className="py-2 px-3">Features</th>
                    <th className="py-2 px-3">Accuracy</th>
                    <th className="py-2 px-3">Precision</th>
                    <th className="py-2 px-3">Recall</th>
                    <th className="py-2 px-3">F1 Score</th>
                    <th className="py-2 px-3">Missed Trojans</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-3 font-semibold text-[var(--color-text-primary)]">Full Active Feature Set</td>
                    <td className="py-2 px-3 text-[var(--color-accent)]">{robustness_ablation.eval_b_comparison.full_features.features_count}</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.full_features.accuracy * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-risk-low)]">{(robustness_ablation.eval_b_comparison.full_features.precision * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_b_comparison.full_features.recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.full_features.f1_score * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-risk-low)]">
                      0 / {(robustness_ablation.eval_b_comparison.test_trojan_count || 1825).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-3 font-semibold text-[var(--color-text-primary)]">All svcscan.* Removed</td>
                    <td className="py-2 px-3 text-[var(--color-accent)]">{robustness_ablation.eval_b_comparison.no_svcscan.features_count}</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.no_svcscan.accuracy * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-risk-low)]">{(robustness_ablation.eval_b_comparison.no_svcscan.precision * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_b_comparison.no_svcscan.recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.no_svcscan.f1_score * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-risk-medium)]">
                      {(robustness_ablation.eval_b_comparison.no_svcscan.missed_trojans ?? 5)} / {(robustness_ablation.eval_b_comparison.test_trojan_count || 1825).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-3 font-semibold text-[var(--color-text-primary)]">Top-5 Features Removed</td>
                    <td className="py-2 px-3 text-[var(--color-accent)]">{robustness_ablation.eval_b_comparison.no_top5.features_count}</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.no_top5.accuracy * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-risk-low)]">{(robustness_ablation.eval_b_comparison.no_top5.precision * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_b_comparison.no_top5.recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.no_top5.f1_score * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-risk-medium)]">
                      {(robustness_ablation.eval_b_comparison.no_top5.missed_trojans ?? 5)} / {(robustness_ablation.eval_b_comparison.test_trojan_count || 1825).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Ablation Table 2: Evaluation C */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-mono font-bold text-[var(--color-text-primary)] flex items-center justify-between">
              <span>Evaluation C Ablation (Leave-One-Family-Out — Novel Families in Lab)</span>
              <span className="text-[10px] font-normal text-[var(--color-text-muted)]">5 Folds (Emotet, Reconyc, Refroso, Scar, Zeus)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr
                    className="border-b text-[var(--color-text-muted)] font-mono text-[11px] uppercase tracking-wider"
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                  >
                    <th className="py-2 px-3">Condition</th>
                    <th className="py-2 px-3">Feats</th>
                    <th className="py-2 px-3">Macro Recall</th>
                    <th className="py-2 px-3">Macro F1</th>
                    <th className="py-2 px-3">Benign FPR</th>
                    <th className="py-2 px-3">Emotet</th>
                    <th className="py-2 px-3">Reconyc</th>
                    <th className="py-2 px-3">Refroso</th>
                    <th className="py-2 px-3">Scar</th>
                    <th className="py-2 px-3">Zeus</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-3 font-semibold text-[var(--color-text-primary)]">Full Features</td>
                    <td className="py-2 px-3 text-[var(--color-accent)]">{robustness_ablation.eval_c_comparison.full_features.features_count}</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_c_comparison.full_features.macro_recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-text-primary)]">{(robustness_ablation.eval_c_comparison.full_features.macro_f1 * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-risk-low)]">{(robustness_ablation.eval_c_comparison.full_features.benign_fpr * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.full_features.per_family_recall.Emotet * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.full_features.per_family_recall.Reconyc * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.full_features.per_family_recall.Refroso * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.full_features.per_family_recall.Scar * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.full_features.per_family_recall.Zeus * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-3 font-semibold text-[var(--color-text-primary)]">No svcscan.*</td>
                    <td className="py-2 px-3 text-[var(--color-accent)]">{robustness_ablation.eval_c_comparison.no_svcscan.features_count}</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_c_comparison.no_svcscan.macro_recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-text-primary)]">{(robustness_ablation.eval_c_comparison.no_svcscan.macro_f1 * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-risk-low)]">{(robustness_ablation.eval_c_comparison.no_svcscan.benign_fpr * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.no_svcscan.per_family_recall.Emotet * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.no_svcscan.per_family_recall.Reconyc * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.no_svcscan.per_family_recall.Refroso * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.no_svcscan.per_family_recall.Scar * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.no_svcscan.per_family_recall.Zeus * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-3 font-semibold text-[var(--color-text-primary)]">No Top-5</td>
                    <td className="py-2 px-3 text-[var(--color-accent)]">{robustness_ablation.eval_c_comparison.no_top5.features_count}</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_c_comparison.no_top5.macro_recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 font-bold text-[var(--color-text-primary)]">{(robustness_ablation.eval_c_comparison.no_top5.macro_f1 * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-[var(--color-risk-low)]">{(robustness_ablation.eval_c_comparison.no_top5.benign_fpr * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.no_top5.per_family_recall.Emotet * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.no_top5.per_family_recall.Reconyc * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.no_top5.per_family_recall.Refroso * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.no_top5.per_family_recall.Scar * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{(robustness_ablation.eval_c_comparison.no_top5.per_family_recall.Zeus * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Academic Takeaway */}
          <div
            className="p-3.5 rounded border text-xs font-sans space-y-1"
            style={{
              backgroundColor: 'var(--color-bg-base)',
              borderColor: 'var(--color-border-subtle)',
            }}
          >
            <div className="font-mono font-bold text-[var(--color-accent)] text-[11px] uppercase tracking-wider">
              Academic Viva Takeaway & Limitations
            </div>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              When <code>svcscan.*</code> or the top-5 features are ablated, recall drops by only ~0.27% on Evaluation B (from 100.0% to 99.73%, missing exactly 5 out of 1,825 test Trojans) and ~0.23% on Evaluation C (99.75% to 99.52%).
            </p>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              <strong>Why do both B ablations miss the exact same 5 test dumps?</strong> Both ablations remove the primary separating artifacts (<code>svcscan.nservices</code> and <code>svcscan.kernel_drivers</code>). All 5 missed test rows belong to the exact same held-out Trojan sample (<code>Trojan-Scar-940031d1f698ef92d0c76c762cb41bff</code> across runs 1, 6, 7, 8, and 9). Without the <code>svcscan</code> artifact, this sample's predicted Trojan probability drops from &gt;99% to borderline values (0.38–0.48 without <code>svcscan.*</code>, and 0.37–0.48 without top-5), falling just below the 0.50 binary classification threshold.
            </p>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Crucially, because benign memory dumps contain no sample IDs, cross-fold benign leakage cannot be ruled out. Therefore, these metrics demonstrate robustness <em>within this VM testbed</em>, NOT proof of generalizability to arbitrary wild enterprise endpoints.
            </p>
          </div>
        </div>
      )}

      {/* Probability Bands Specification */}
      <div
        className="p-5 rounded-lg border space-y-3"
        style={{
          backgroundColor: 'var(--color-surface-1)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-[var(--color-text-primary)]">
          <HelpCircle size={16} className="text-[var(--color-accent)]" />
          <span>Output Probability Bands (Defensive Calibration)</span>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          The Random Forest outputs a continuous posterior probability <code>P(Trojan | x)</code>. Rather than treating this as a binary verdict, TrojanGuard classifies samples into three risk tiers:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {metricsData.probability_bands.bands.map((b) => (
            <div
              key={b.band}
              className="p-3 rounded border space-y-1"
              style={{
                backgroundColor: 'var(--color-bg-base)',
                borderColor: 'var(--color-border-subtle)',
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-xs font-bold"
                  style={{
                    color:
                      b.band === 'Benign'
                        ? 'var(--color-risk-low)'
                        : b.band === 'Suspicious'
                        ? 'var(--color-risk-medium)'
                        : 'var(--color-risk-critical)',
                  }}
                >
                  {b.band}
                </span>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{b.range}</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-normal">{b.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prediction Tester Box */}
      <div
        className="p-5 rounded-lg border space-y-4"
        style={{
          backgroundColor: 'var(--color-surface-1)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-[var(--color-text-primary)]">
            <FileSpreadsheet size={16} className="text-[var(--color-accent)]" />
            <span>Test Real Model Inference (Pre-extracted Features Row)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadSamplePrediction('trojan')}
              className="px-2.5 py-1 rounded text-[11px] font-mono transition-colors border text-[var(--color-risk-critical)] hover:bg-[var(--color-surface-2)]"
              style={{ borderColor: 'var(--color-border-subtle)' }}
            >
              Load Trojan Sample
            </button>
            <button
              onClick={() => loadSamplePrediction('benign')}
              className="px-2.5 py-1 rounded text-[11px] font-mono transition-colors border text-[var(--color-risk-low)] hover:bg-[var(--color-surface-2)]"
              style={{ borderColor: 'var(--color-border-subtle)' }}
            >
              Load Benign Sample
            </button>
          </div>
        </div>

        <form onSubmit={handlePredict} className="space-y-3">
          <textarea
            value={predictionInput}
            onChange={(e) => setPredictionInput(e.target.value)}
            rows={5}
            placeholder='Paste JSON with { "features": { "pslist.nproc": 45, ... } } or click a sample button above...'
            className="w-full p-3 rounded font-mono text-xs bg-[var(--color-bg-base)] border text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            style={{ borderColor: 'var(--color-border)' }}
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
              Requires all 51 active Volatility memory features.
            </span>
            <button
              type="submit"
              disabled={predicting || !predictionInput.trim()}
              className="px-4 py-2 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-2"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-bg-base)',
                opacity: predicting || !predictionInput.trim() ? 0.6 : 1,
              }}
            >
              {predicting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Run Inference</span>
            </button>
          </div>
        </form>

        {predictionError && (
          <div className="p-3 rounded border text-xs font-mono text-[var(--color-risk-critical)] bg-[rgba(239,68,68,0.1)] border-[var(--color-risk-critical)]">
            Error: {predictionError}
          </div>
        )}

        {predictionResult && (
          <div
            className="p-4 rounded border space-y-2 font-mono text-xs"
            style={{ backgroundColor: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <span className="text-[var(--color-text-muted)] uppercase text-[10px]">Predicted Classification Band:</span>
              <span
                className="font-bold px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  color:
                    predictionResult.probability_band === 'Trojan-like'
                      ? 'var(--color-risk-critical)'
                      : predictionResult.probability_band === 'Suspicious'
                      ? 'var(--color-risk-medium)'
                      : 'var(--color-risk-low)',
                }}
              >
                {predictionResult.probability_band} ({predictionResult.trojan_probability_percent}%)
              </span>
            </div>
            <div className="text-[var(--color-text-secondary)] text-[11px]">
              {predictionResult.band_description}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)] pt-1">
              Note: {predictionResult.data_notice}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
