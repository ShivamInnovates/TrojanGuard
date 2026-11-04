import React, { useState, useEffect } from 'react'
import {
  Cpu,
  Database,
  AlertTriangle,
  RefreshCw,
  Send,
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
  const [activeTab, setActiveTab] = useState('eval_b')

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

  const loadSamplePrediction = (type = 'trojan') => {
    setPredictionError(null)
    setPredictionResult(null)

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
      'modules.nmodules': type === 'trojan' ? 138 : 138,
      'svcscan.nservices': type === 'trojan' ? 392 : 389,
      'svcscan.kernel_drivers': type === 'trojan' ? 222 : 221,
      'svcscan.fs_drivers': type === 'trojan' ? 26 : 26,
      'svcscan.process_services': type === 'trojan' ? 24 : 24,
      'svcscan.shared_process_services': type === 'trojan' ? 116 : 116,
      'svcscan.interactive_process_services': 0,
      'svcscan.nactive': type === 'trojan' ? 122 : 122,
      'callbacks.ncallbacks': type === 'trojan' ? 88 : 86,
      'callbacks.nanonymous': 0,
      'callbacks.ngeneric': 0,
    }

    setPredictionInput(JSON.stringify({ features: sample }, null, 2))
  }

  const handlePredict = async (e) => {
    e.preventDefault()
    if (!predictionInput.trim()) return

    setPredicting(true)
    setPredictionError(null)
    setPredictionResult(null)

    try {
      let parsed
      try {
        parsed = JSON.parse(predictionInput)
      } catch (err) {
        throw new Error('Input must be valid JSON: { "features": { ... } }')
      }

      if (!parsed.features || typeof parsed.features !== 'object') {
        throw new Error('JSON must contain a "features" key with an object of feature: value pairs.')
      }

      const res = await predictRealModel(parsed.features)
      setPredictionResult(res)
    } catch (err) {
      setPredictionError(err.message || 'Prediction failed. Check feature vector schema.')
    } finally {
      setPredicting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <LoadingState message="Loading real-dataset evaluation metrics..." />
      </div>
    )
  }

  if (notTrained) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div
          className="p-6 rounded-[4px] border text-center space-y-3 bg-[var(--color-surface-1)]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Cpu size={24} className="mx-auto text-[var(--color-text-muted)]" />
          <h2 className="text-sm font-semibold font-mono text-[var(--color-text-primary)]">
            Real Model Not Trained Yet
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-md mx-auto leading-normal">
            The real-data evaluation pipeline (CIC-MalMem-2022) has not yet been executed in this environment.
            Run the training script to generate metrics:
          </p>
          <pre className="p-3 rounded-[3px] font-mono text-xs text-[var(--color-text-primary)] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] inline-block text-left">
            cd ml/real && python train_real.py
          </pre>
          <div>
            <button
              onClick={fetchMetrics}
              className="px-3 py-1.5 rounded-[3px] text-xs font-mono font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] transition-colors cursor-pointer"
            >
              Refresh Metrics
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error || !metricsData) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <ErrorState error={error} onRetry={fetchMetrics} />
      </div>
    )
  }

  const {
    dataset,
    headline_recommendation,
    evaluations,
    robustness_ablation,
  } = metricsData

  const evalA = evaluations.eval_a_random_stratified
  const evalB = evaluations.eval_b_grouped_sample_hash
  const evalC = evaluations.eval_c_leave_one_family_out

  const currentEval =
    activeTab === 'eval_a' ? evalA : activeTab === 'eval_b' ? evalB : evalC

  return (
    <div className="space-y-4 font-sans pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-sm font-semibold font-mono text-[var(--color-text-primary)]">
            Real-Data Model Evaluation & Forensics Architecture
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 max-w-3xl leading-normal">
            Trained on the <strong>CIC-MalMem-2022</strong> memory forensics dataset. Multi-regime honest evaluation measuring performance on unseen samples and novel families within the same laboratory environment (not real-world generalization; benign rows lack sample IDs, so benign data leakage cannot be ruled out).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="px-2 py-0.5 rounded-[3px] text-xs font-mono font-medium flex items-center gap-1.5 text-[var(--color-risk-low)] bg-[var(--color-surface-2)] border border-[rgba(34,197,94,0.25)]"
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block bg-[var(--color-risk-low)]"
            />
            <span>Real model active</span>
          </span>
        </div>
      </div>

      {/* Dataset & Architectural Separation Notice */}
      <div
        className="p-3.5 rounded-[4px] border flex flex-col md:flex-row gap-4 justify-between items-start bg-[var(--color-surface-1)]"
        style={{
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="space-y-1 text-xs text-[var(--color-text-secondary)] max-w-3xl font-sans">
          <div className="flex items-center gap-1.5 font-mono font-semibold text-[var(--color-text-primary)]">
            <Database size={13} className="text-[var(--color-text-muted)]" />
            <span>Dataset & in-memory extraction boundaries</span>
          </div>
          <p className="leading-normal">
            <strong>Dataset Citation:</strong> {dataset.citation} (Canadian Institute for Cybersecurity, UNB).
          </p>
          <p className="leading-normal text-[var(--color-text-muted)]">
            <strong>Important Architectural Separation:</strong> Features in this model represent <strong>51 Volatility memory-forensics measurements</strong> extracted offline from VM memory dumps (e.g., process injection counters, handle counts, kernel driver states). They <strong>cannot</strong> be extracted from an uploaded binary by this web application without executing live malware in a hypervisor. Therefore, this model is separate from the live Demo Lab and Sample Analysis pipelines.
          </p>
        </div>

        <div
          className="p-2.5 rounded-[3px] border text-xs font-mono space-y-0.5 shrink-0 w-full md:w-60 bg-[var(--color-bg-base)] border-[var(--color-border-subtle)] tabular-nums"
        >
          <div className="text-[var(--color-text-muted)] text-[10px]">
            Dataset Summary
          </div>
          <div className="flex justify-between">
            <span>Clean Samples:</span>
            <span className="font-semibold text-[var(--color-text-primary)]">{dataset.total_cleaned_samples.toLocaleString()}</span>
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
            <span className="text-[var(--color-text-primary)]">{dataset.trojan_families.length}</span>
          </div>
        </div>
      </div>

      {/* Headline Metric Recommendation Banner */}
      <div
        className="p-3 rounded-[4px] border space-y-1 bg-[var(--color-surface-1)] border-[var(--color-border)]"
      >
        <div className="text-xs font-mono font-semibold text-[var(--color-text-primary)]">
          Headline evaluation guidance (Academic viva defense)
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] leading-normal font-sans">
          {headline_recommendation.reason}
        </p>
        <div className="text-xs font-mono text-[var(--color-text-muted)] pt-0.5">
          <strong>Recommended Headline Quote:</strong>{' '}
          <span className="text-[var(--color-text-primary)] font-medium">
            {headline_recommendation.headline_evaluation}
          </span>
        </div>
      </div>

      {/* Side-by-Side Evaluation Selector */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('eval_b')}
            className={`px-2.5 py-1 rounded-[3px] text-xs font-mono transition-colors cursor-pointer border ${
              activeTab === 'eval_b'
                ? 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border-[var(--color-border)] font-medium'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border-transparent'
            }`}
          >
            Eval B: Grouped by Sample (Unseen Samples in Lab)
          </button>
          <button
            onClick={() => setActiveTab('eval_c')}
            className={`px-2.5 py-1 rounded-[3px] text-xs font-mono transition-colors cursor-pointer border ${
              activeTab === 'eval_c'
                ? 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border-[var(--color-border)] font-medium'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border-transparent'
            }`}
          >
            Eval C: Leave-One-Family-Out (Novel Families in Lab)
          </button>
          <button
            onClick={() => setActiveTab('eval_a')}
            className={`px-2.5 py-1 rounded-[3px] text-xs font-mono transition-colors cursor-pointer border ${
              activeTab === 'eval_a'
                ? 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border-[var(--color-border)] font-medium'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border-transparent'
            }`}
          >
            Eval A: Stratified 80/20 (Naive Baseline)
          </button>
        </div>

        {/* Selected Evaluation Overview Cards */}
        {activeTab !== 'eval_c' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              title="Accuracy"
              value={`${(currentEval.accuracy * 100).toFixed(1)}%`}
              subtitle={currentEval.sample_leakage_warning ? 'Optimistic baseline' : 'Unseen samples (same lab)'}
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
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            />
          </div>
        )}
      </div>

      {/* Main Breakdown: Confusion Matrix & Details or Cross-Family Table */}
      {activeTab === 'eval_c' ? (
        <div
          className="p-4 rounded-[4px] border space-y-3 bg-[var(--color-surface-1)]"
          style={{
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-medium text-[var(--color-text-primary)]">
              Leave-One-Family-Out Cross-Validation (Same Lab Environment)
            </h3>
            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
              5 Folds (Trained on 4 families + 80% Benign, Tested on held-out; benign rows lack sample IDs)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr
                  className="border-b text-[var(--color-text-muted)] font-mono text-[11px]"
                  style={{ borderColor: 'var(--color-border-subtle)' }}
                >
                  <th className="py-2 px-2.5">Held-Out Trojan Family</th>
                  <th className="py-2 px-2.5">Test Samples (n)</th>
                  <th className="py-2 px-2.5">Family Recall</th>
                  <th className="py-2 px-2.5">Benign FPR</th>
                  <th className="py-2 px-2.5">Fold Precision</th>
                  <th className="py-2 px-2.5">Fold F1</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-[11px] tabular-nums" style={{ borderColor: 'var(--color-border-subtle)' }}>
                {Object.values(evalC.per_family_results).map((row) => (
                  <tr key={row.family} className="hover:bg-[var(--color-surface-2)] transition-colors">
                    <td className="py-2 px-2.5 font-medium text-[var(--color-text-primary)]">
                      {row.family}
                    </td>
                    <td className="py-2 px-2.5 text-[var(--color-text-secondary)]">
                      {row.test_count.toLocaleString()}
                    </td>
                    <td className="py-2 px-2.5 font-semibold text-[var(--color-risk-critical)]">
                      {(row.recall * 100).toFixed(2)}%
                    </td>
                    <td className="py-2 px-2.5 text-[var(--color-risk-low)]">
                      {(row.benign_fpr * 100).toFixed(2)}%
                    </td>
                    <td className="py-2 px-2.5 text-[var(--color-text-primary)]">
                      {(row.fold_precision * 100).toFixed(2)}%
                    </td>
                    <td className="py-2 px-2.5 text-[var(--color-text-primary)]">
                      {(row.fold_f1 * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Confusion Matrix */}
          <div
            className="p-4 rounded-[4px] border space-y-3 bg-[var(--color-surface-1)]"
            style={{
              borderColor: 'var(--color-border)',
            }}
          >
            <h3 className="font-mono text-xs font-medium text-[var(--color-text-primary)]">
              Confusion Matrix ({currentEval.name})
            </h3>

            <div className="p-3 rounded-[3px] border space-y-2 bg-[var(--color-bg-base)] border-[var(--color-border-subtle)]">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-[3px] border bg-[var(--color-surface-1)] border-[var(--color-border-subtle)]">
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)]">True Negative (Benign)</div>
                  <div className="text-base font-mono font-semibold text-[var(--color-risk-low)] mt-0.5 tabular-nums">
                    {currentEval.confusion_matrix[0][0].toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">Correctly identified clean</div>
                </div>

                <div className="p-2.5 rounded-[3px] border bg-[var(--color-surface-1)] border-[var(--color-border-subtle)]">
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)]">False Positive</div>
                  <div className="text-base font-mono font-semibold text-[var(--color-risk-medium)] mt-0.5 tabular-nums">
                    {currentEval.confusion_matrix[0][1].toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">Clean flagged as Trojan</div>
                </div>

                <div className="p-2.5 rounded-[3px] border bg-[var(--color-surface-1)] border-[var(--color-border-subtle)]">
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)]">False Negative</div>
                  <div className="text-base font-mono font-semibold text-[var(--color-risk-critical)] mt-0.5 tabular-nums">
                    {currentEval.confusion_matrix[1][0].toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">Trojan missed</div>
                </div>

                <div className="p-2.5 rounded-[3px] border bg-[var(--color-surface-1)] border-[var(--color-border-subtle)]">
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)]">True Positive (Trojan)</div>
                  <div className="text-base font-mono font-semibold text-[var(--color-risk-low)] mt-0.5 tabular-nums">
                    {currentEval.confusion_matrix[1][1].toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">Correctly detected Trojan</div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Feature Importances */}
          <div
            className="p-4 rounded-[4px] border space-y-3 bg-[var(--color-surface-1)]"
            style={{
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-medium text-[var(--color-text-primary)]">
                Top feature importances (Gini impurity)
              </h3>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Top 8 shown</span>
            </div>

            <div className="space-y-2">
              {currentEval.top_15_features.slice(0, 8).map((f) => (
                <div key={f.feature} className="space-y-0.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[var(--color-text-secondary)]">{f.feature}</span>
                    <span className="text-[var(--color-text-primary)] font-medium tabular-nums">{(f.importance * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 bg-[var(--color-accent)]"
                      style={{
                        width: `${Math.min(f.importance * 350, 100)}%`,
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
          className="p-4 rounded-[4px] border space-y-3 bg-[var(--color-surface-1)]"
          style={{
            borderColor: 'var(--color-border)',
          }}
        >
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5"
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            <h3 className="font-mono text-xs font-medium text-[var(--color-text-primary)]">
              Robustness Check: Feature Removal Ablations & Lab Bounds
            </h3>
            <span
              className="px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]"
            >
              Intra-Lab Robustness
            </span>
          </div>

          <p className="text-xs text-[var(--color-text-secondary)] leading-normal font-sans">
            To test whether classification depends on specific laboratory testbed artifacts (such as static OS service counts), Evaluations B and C were re-run under two feature ablation conditions: (1) removing <strong>all 6 <code>svcscan.*</code> features</strong>, and (2) removing the <strong>top-5 features by importance</strong>. Both evaluations measure performance on unseen samples/families <strong>within the same lab environment</strong>; because benign rows lack sample IDs, benign data leakage cannot be ruled out.
          </p>

          {/* svcscan.nservices artifact verification */}
          {dataset.artifact_verification_stats && (
            <div
              className="p-3 rounded-[3px] border text-xs font-sans space-y-1.5 bg-[var(--color-surface-2)] border-[var(--color-border-subtle)]"
            >
              <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--color-risk-medium)]">
                <AlertTriangle size={13} />
                <span>Cleaned Data Artifact Verification ({dataset.artifact_verification_stats.feature})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                <div className="p-2 rounded-[2px] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-0.5 tabular-nums">
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    Benign (n={dataset.artifact_verification_stats.stats.benign.count.toLocaleString()}):
                  </div>
                  <div className="text-[var(--color-text-primary)]">
                    Mean: <span className="font-semibold text-[var(--color-risk-low)]">{dataset.artifact_verification_stats.stats.benign.mean.toFixed(2)}</span> | Median: <span className="font-semibold">{dataset.artifact_verification_stats.stats.benign.median.toFixed(1)}</span> | Std: <span className="font-semibold">{dataset.artifact_verification_stats.stats.benign.std.toFixed(4)}</span>
                  </div>
                </div>
                <div className="p-2 rounded-[2px] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-0.5 tabular-nums">
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    Trojan (n={dataset.artifact_verification_stats.stats.trojan.count.toLocaleString()}):
                  </div>
                  <div className="text-[var(--color-text-primary)]">
                    Mean: <span className="font-semibold text-[var(--color-risk-critical)]">{dataset.artifact_verification_stats.stats.trojan.mean.toFixed(2)}</span> | Median: <span className="font-semibold">{dataset.artifact_verification_stats.stats.trojan.median.toFixed(1)}</span> | Std: <span className="font-semibold">{dataset.artifact_verification_stats.stats.trojan.std.toFixed(4)}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-normal font-sans">
                The persistent ~5.5-service delta with tight standard deviation (~1.4) represents a laboratory virtual machine baseline artifact distinguishing benign capture runs from malware capture runs.
              </p>
            </div>
          )}

          {/* Ablation Table 1: Evaluation B */}
          <div className="space-y-1.5 pt-1">
            <div className="text-xs font-mono font-medium text-[var(--color-text-primary)] flex items-center justify-between">
              <span>Evaluation B Ablation (Grouped by Sample Hash — Unseen Samples)</span>
              <span className="text-[10px] font-normal text-[var(--color-text-muted)] tabular-nums">
                Test: {(robustness_ablation.eval_b_comparison.test_trojan_count || 1825).toLocaleString()} Trojan, {(robustness_ablation.eval_b_comparison.test_benign_count || 5855).toLocaleString()} Benign
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr
                    className="border-b text-[var(--color-text-muted)] font-mono text-[11px]"
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                  >
                    <th className="py-2 px-2.5">Condition</th>
                    <th className="py-2 px-2.5">Features</th>
                    <th className="py-2 px-2.5">Accuracy</th>
                    <th className="py-2 px-2.5">Precision</th>
                    <th className="py-2 px-2.5">Recall</th>
                    <th className="py-2 px-2.5">F1 Score</th>
                    <th className="py-2 px-2.5">Missed Trojans</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono text-[11px] tabular-nums" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-2.5 font-medium text-[var(--color-text-primary)]">Full Active Feature Set</td>
                    <td className="py-2 px-2.5 text-[var(--color-text-primary)]">{robustness_ablation.eval_b_comparison.full_features.features_count}</td>
                    <td className="py-2 px-2.5 font-semibold text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.full_features.accuracy * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 text-[var(--color-risk-low)]">{(robustness_ablation.eval_b_comparison.full_features.precision * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 font-semibold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_b_comparison.full_features.recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.full_features.f1_score * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 text-[var(--color-risk-low)]">
                      0 / {(robustness_ablation.eval_b_comparison.test_trojan_count || 1825).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-2.5 font-medium text-[var(--color-text-primary)]">All svcscan.* Removed</td>
                    <td className="py-2 px-2.5 text-[var(--color-text-primary)]">{robustness_ablation.eval_b_comparison.no_svcscan.features_count}</td>
                    <td className="py-2 px-2.5 font-semibold text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.no_svcscan.accuracy * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 text-[var(--color-risk-low)]">{(robustness_ablation.eval_b_comparison.no_svcscan.precision * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 font-semibold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_b_comparison.no_svcscan.recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.no_svcscan.f1_score * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 text-[var(--color-risk-medium)]">
                      {(robustness_ablation.eval_b_comparison.no_svcscan.missed_trojans ?? 5)} / {(robustness_ablation.eval_b_comparison.test_trojan_count || 1825).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-2.5 font-medium text-[var(--color-text-primary)]">Top-5 Features Removed</td>
                    <td className="py-2 px-2.5 text-[var(--color-text-primary)]">{robustness_ablation.eval_b_comparison.no_top5.features_count}</td>
                    <td className="py-2 px-2.5 font-semibold text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.no_top5.accuracy * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 text-[var(--color-risk-low)]">{(robustness_ablation.eval_b_comparison.no_top5.precision * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 font-semibold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_b_comparison.no_top5.recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 text-[var(--color-text-primary)]">{(robustness_ablation.eval_b_comparison.no_top5.f1_score * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2.5 text-[var(--color-risk-medium)]">
                      {(robustness_ablation.eval_b_comparison.no_top5.missed_trojans ?? 5)} / {(robustness_ablation.eval_b_comparison.test_trojan_count || 1825).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Ablation Table 2: Evaluation C */}
          <div className="space-y-1.5 pt-1">
            <div className="text-xs font-mono font-medium text-[var(--color-text-primary)] flex items-center justify-between">
              <span>Evaluation C Ablation (Leave-One-Family-Out — Novel Families in Lab)</span>
              <span className="text-[10px] font-normal text-[var(--color-text-muted)]">5 Folds (Emotet, Reconyc, Refroso, Scar, Zeus)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr
                    className="border-b text-[var(--color-text-muted)] font-mono text-[11px]"
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                  >
                    <th className="py-2 px-2">Condition</th>
                    <th className="py-2 px-2">Feats</th>
                    <th className="py-2 px-2">Macro Recall</th>
                    <th className="py-2 px-2">Macro F1</th>
                    <th className="py-2 px-2">Benign FPR</th>
                    <th className="py-2 px-2">Emotet</th>
                    <th className="py-2 px-2">Reconyc</th>
                    <th className="py-2 px-2">Refroso</th>
                    <th className="py-2 px-2">Scar</th>
                    <th className="py-2 px-2">Zeus</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono text-[11px] tabular-nums" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-2 font-medium text-[var(--color-text-primary)]">Full Features</td>
                    <td className="py-2 px-2">{robustness_ablation.eval_c_comparison.full_features.features_count}</td>
                    <td className="py-2 px-2 font-semibold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_c_comparison.full_features.macro_recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2 font-semibold text-[var(--color-text-primary)]">{(robustness_ablation.eval_c_comparison.full_features.macro_f1 * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2 text-[var(--color-risk-low)]">{(robustness_ablation.eval_c_comparison.full_features.benign_fpr * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.full_features.per_family_recall.Emotet * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.full_features.per_family_recall.Reconyc * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.full_features.per_family_recall.Refroso * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.full_features.per_family_recall.Scar * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.full_features.per_family_recall.Zeus * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-2 font-medium text-[var(--color-text-primary)]">No svcscan.*</td>
                    <td className="py-2 px-2">{robustness_ablation.eval_c_comparison.no_svcscan.features_count}</td>
                    <td className="py-2 px-2 font-semibold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_c_comparison.no_svcscan.macro_recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2 font-semibold text-[var(--color-text-primary)]">{(robustness_ablation.eval_c_comparison.no_svcscan.macro_f1 * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2 text-[var(--color-risk-low)]">{(robustness_ablation.eval_c_comparison.no_svcscan.benign_fpr * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.no_svcscan.per_family_recall.Emotet * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.no_svcscan.per_family_recall.Reconyc * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.no_svcscan.per_family_recall.Refroso * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.no_svcscan.per_family_recall.Scar * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.no_svcscan.per_family_recall.Zeus * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="hover:bg-[var(--color-surface-2)]">
                    <td className="py-2 px-2 font-medium text-[var(--color-text-primary)]">No Top-5</td>
                    <td className="py-2 px-2">{robustness_ablation.eval_c_comparison.no_top5.features_count}</td>
                    <td className="py-2 px-2 font-semibold text-[var(--color-risk-critical)]">{(robustness_ablation.eval_c_comparison.no_top5.macro_recall * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2 font-semibold text-[var(--color-text-primary)]">{(robustness_ablation.eval_c_comparison.no_top5.macro_f1 * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2 text-[var(--color-risk-low)]">{(robustness_ablation.eval_c_comparison.no_top5.benign_fpr * 100).toFixed(2)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.no_top5.per_family_recall.Emotet * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.no_top5.per_family_recall.Reconyc * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.no_top5.per_family_recall.Refroso * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.no_top5.per_family_recall.Scar * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2">{(robustness_ablation.eval_c_comparison.no_top5.per_family_recall.Zeus * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Academic Takeaway */}
          <div
            className="p-3 rounded-[3px] border text-xs font-sans space-y-1 bg-[var(--color-bg-base)] border-[var(--color-border-subtle)]"
          >
            <div className="font-mono font-semibold text-[var(--color-text-primary)] text-[11px]">
              Academic Viva Takeaway & Limitations
            </div>
            <p className="text-[var(--color-text-secondary)] leading-normal">
              When <code>svcscan.*</code> or the top-5 features are ablated, recall drops by only ~0.27% on Evaluation B (from 100.0% to 99.73%, missing exactly 5 out of 1,825 test Trojans) and ~0.23% on Evaluation C (99.75% to 99.52%).
            </p>
            <p className="text-[var(--color-text-secondary)] leading-normal">
              <strong>Why do both B ablations miss the exact same 5 test dumps?</strong> Both ablations remove the primary separating artifacts (<code>svcscan.nservices</code> and <code>svcscan.kernel_drivers</code>). All 5 missed test rows belong to the exact same held-out Trojan sample (<code>Trojan-Scar-940031d1f698ef92d0c76c762cb41bff</code> across runs 1, 6, 7, 8, and 9). Without the <code>svcscan</code> artifact, this sample's predicted Trojan probability drops from &gt;99% to borderline values (0.38–0.48 without <code>svcscan.*</code>, and 0.37–0.48 without top-5), falling just below the 0.50 binary classification threshold.
            </p>
            <p className="text-[var(--color-text-secondary)] leading-normal">
              Crucially, because benign memory dumps contain no sample IDs, cross-fold benign leakage cannot be ruled out. Therefore, these metrics demonstrate robustness <em>within this VM testbed</em>, NOT proof of generalizability to arbitrary wild enterprise endpoints.
            </p>
          </div>
        </div>
      )}

      {/* Probability Bands Specification */}
      <div
        className="p-4 rounded-[4px] border space-y-2.5 bg-[var(--color-surface-1)]"
        style={{
          borderColor: 'var(--color-border)',
        }}
      >
        <h3 className="font-mono text-xs font-medium text-[var(--color-text-primary)]">
          Output probability bands (Defensive calibration)
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] leading-normal font-sans">
          The Random Forest outputs a continuous posterior probability <code>P(Trojan | x)</code>. Rather than treating this as a binary verdict, TrojanGuard classifies samples into three risk tiers:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {metricsData.probability_bands.bands.map((b) => (
            <div
              key={b.band}
              className="p-2.5 rounded-[3px] border space-y-0.5 bg-[var(--color-bg-base)] border-[var(--color-border-subtle)]"
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-xs font-semibold"
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
                <span className="text-[10px] font-mono text-[var(--color-text-muted)] tabular-nums">{b.range}</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-normal font-sans">{b.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prediction Tester Box */}
      <div
        className="p-4 rounded-[4px] border space-y-3 bg-[var(--color-surface-1)]"
        style={{
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-mono text-xs font-medium text-[var(--color-text-primary)]">
            Test real model inference (Pre-extracted features row)
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadSamplePrediction('trojan')}
              className="px-2 py-0.5 rounded-[3px] text-[11px] font-mono transition-colors border text-[var(--color-text-secondary)] bg-[var(--color-surface-2)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)] cursor-pointer"
            >
              Load Trojan sample
            </button>
            <button
              onClick={() => loadSamplePrediction('benign')}
              className="px-2 py-0.5 rounded-[3px] text-[11px] font-mono transition-colors border text-[var(--color-text-secondary)] bg-[var(--color-surface-2)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)] cursor-pointer"
            >
              Load Benign sample
            </button>
          </div>
        </div>

        <form onSubmit={handlePredict} className="space-y-2.5">
          <textarea
            value={predictionInput}
            onChange={(e) => setPredictionInput(e.target.value)}
            rows={4}
            placeholder='Paste JSON with { "features": { "pslist.nproc": 45, ... } } or click a sample button above...'
            className="w-full p-2.5 rounded-[3px] font-mono text-xs bg-[var(--color-bg-base)] border text-[var(--color-text-primary)] border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)]"
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
              Requires all 51 active Volatility memory features.
            </span>
            <button
              type="submit"
              disabled={predicting || !predictionInput.trim()}
              className="px-3 py-1.5 rounded-[3px] text-xs font-mono font-medium transition-colors flex items-center gap-1.5 text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] disabled:opacity-40 cursor-pointer"
            >
              {predicting ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              <span>Run inference</span>
            </button>
          </div>
        </form>

        {predictionError && (
          <div className="p-2.5 rounded-[3px] border text-xs font-mono text-[var(--color-risk-critical)] bg-[var(--color-risk-critical-bg)] border-[rgba(239,68,68,0.3)]">
            Error: {predictionError}
          </div>
        )}

        {predictionResult && (
          <div
            className="p-3 rounded-[3px] border space-y-1.5 font-mono text-xs bg-[var(--color-bg-base)] border-[var(--color-border)]"
          >
            <div className="flex items-center justify-between border-b pb-1.5 border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-muted)] text-[10px]">Predicted classification band:</span>
              <span
                className="font-medium px-1.5 py-0.2 rounded-[2px] text-xs tabular-nums"
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
            <div className="text-[var(--color-text-secondary)] text-[11px] font-sans">
              {predictionResult.band_description}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)] pt-0.5">
              Note: {predictionResult.data_notice}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
