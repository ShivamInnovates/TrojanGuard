import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  FileCode,
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Check,
  Copy,
  Info,
  Play,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react'

import { analyzeFile } from '../services/api'
import SeverityBadge from '../components/SeverityBadge'
import SimulatedBanner from '../components/SimulatedBanner'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export default function SampleAnalysis() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progressStage, setProgressStage] = useState('')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [copiedSha, setCopiedSha] = useState(false)

  // Handle file selection and client-side validation
  const validateAndSetFile = (file) => {
    setError(null)
    setResult(null)

    if (!file) return

    // Empty file validation
    if (file.size === 0) {
      setError('Selected file is empty (0 bytes). Please select a valid sample.')
      setSelectedFile(null)
      return
    }

    // 10 MB limit validation
    if (file.size > MAX_BYTES) {
      setError(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10 MB upload limit.`
      )
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  // Upload and analyze file
  const handleAnalyze = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)
    setResult(null)
    setProgressStage('Uploading sample into isolated memory buffer...')

    try {
      setTimeout(() => {
        setProgressStage('Calculating SHA-256 and Shannon entropy...')
      }, 350)

      setTimeout(() => {
        setProgressStage('Parsing PE headers and evaluating static heuristics...')
      }, 700)

      const report = await analyzeFile(selectedFile)
      setResult(report)
    } catch (err) {
      // Backend error handling (413, 422, or 500)
      if (err.status === 413 || err.message?.includes('413')) {
        setError('Upload rejected: File exceeds the 10 MB security limit (HTTP 413).')
      } else if (err.status === 422 || err.message?.includes('422')) {
        setError('Upload rejected: Empty or unprocessable file format (HTTP 422).')
      } else {
        setError(err.message || 'Static file analysis failed. Please verify file integrity.')
      }
    } finally {
      setUploading(false)
      setProgressStage('')
    }
  }

  // Reset state to inspect another sample
  const handleReset = () => {
    setSelectedFile(null)
    setResult(null)
    setError(null)
    setUploading(false)
    setProgressStage('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Mismatch check (e.g. claimed .exe but text detected)
  const hasExtensionMismatch =
    result &&
    result.filename?.toLowerCase().endsWith('.exe') &&
    result.file_type === 'script/text'

  return (
    <div className="space-y-6 font-sans pb-16 max-w-7xl mx-auto">
      {/* Page Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <FileCode size={20} className="text-[var(--color-accent)]" />
            <h1 className="text-base font-bold font-mono text-[var(--color-text-primary)]">
              Safe In-Memory Sample Inspection
            </h1>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-2xl">
            Upload binary files, scripts, or documents for static metadata extraction, entropy inspection, and heuristic risk scoring.
          </p>
        </div>
      </div>

      {/* Safety Policy Guarantee Notice */}
      <div
        className="p-4 rounded-lg border text-xs leading-relaxed flex items-start gap-3"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          borderColor: 'var(--color-accent-dim)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <ShieldCheck size={20} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-mono font-bold text-[var(--color-text-primary)] uppercase text-[11px] tracking-wider">
            Defensive In-Memory Sandbox Guarantee
          </div>
          <p>
            Uploaded files are analyzed <strong className="text-[var(--color-text-primary)]">strictly in-memory</strong> and are never written to disk, imported, executed, or dynamically evaluated. Under TrojanGuard safety policy, static-only analysis is capped at <strong className="text-[var(--color-text-primary)]">Suspicious</strong> because Trojan-like verdicts strictly require dynamic host or network telemetry.
          </p>
        </div>
      </div>

      {/* Upload Box or Result Panel */}
      {!result ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Upload Dropzone (Col 1 & 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[260px]"
              style={{
                backgroundColor: dragActive ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
                borderColor: dragActive ? 'var(--color-accent)' : 'var(--color-border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform hover:scale-105"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  color: 'var(--color-accent)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <UploadCloud size={24} />
              </div>

              <div className="text-sm font-semibold font-mono text-[var(--color-text-primary)]">
                {selectedFile ? selectedFile.name : 'Drag & drop a sample file here'}
              </div>

              <div className="text-xs text-[var(--color-text-muted)] mt-1 font-sans">
                {selectedFile
                  ? `Size: ${formatBytes(selectedFile.size)} &bull; Click to choose a different file`
                  : 'or click to browse from local workstation'}
              </div>

              <div className="mt-4 text-[11px] font-mono text-[var(--color-text-muted)] flex items-center gap-2">
                <span>Maximum file size: 10 MB</span>
                <span>&bull;</span>
                <span>PE executables, scripts, text, documents</span>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div
                className="p-3 rounded-md text-xs font-mono flex items-center gap-2 border"
                style={{
                  backgroundColor: 'var(--color-risk-critical-bg)',
                  borderColor: 'hsl(0 50% 25%)',
                  color: 'var(--color-risk-critical)',
                }}
              >
                <AlertTriangle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Upload & Analyze Action Button */}
            {selectedFile && !uploading && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  className="px-4 py-2 text-xs font-mono font-bold rounded transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#0a0f1d',
                  }}
                >
                  Analyze Sample File
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 text-xs font-mono rounded border transition-colors cursor-pointer text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Clear Selection
                </button>
              </div>
            )}

            {/* Progress Stage Spinner */}
            {uploading && (
              <div
                className="p-4 rounded-lg border bg-[var(--color-surface-1)] space-y-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-accent)] font-semibold">
                  <span className="w-2 h-2 rounded-full animate-ping bg-[var(--color-accent)]" />
                  <span>{progressStage || 'Inspecting sample...'}</span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--color-surface-3)' }}
                >
                  <div
                    className="h-full rounded-full animate-pulse"
                    style={{
                      width: '75%',
                      backgroundColor: 'var(--color-accent)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Safe Demo Samples Picker (Col 3) */}
          <div
            className="rounded-lg border p-5 font-sans space-y-4"
            style={{
              backgroundColor: 'var(--color-surface-1)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <Play size={16} className="text-[var(--color-accent)]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                  Safe Synthetic Samples
                </h3>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Prefer not to upload files? Test with deterministic synthetic scenarios from our test generators:
              </p>
            </div>

            <div className="space-y-2.5">
              <Link
                to="/demo"
                className="block p-3 rounded-md border bg-[var(--color-surface-2)] border-[var(--color-border-subtle)] hover:border-[var(--color-accent-dim)] transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-[var(--color-risk-low)]">
                  <span>1. Normal System (Clean)</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-sans">
                  Benign background service activity, zero suspicious API imports.
                </p>
              </Link>

              <Link
                to="/demo"
                className="block p-3 rounded-md border bg-[var(--color-surface-2)] border-[var(--color-border-subtle)] hover:border-[var(--color-accent-dim)] transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-[var(--color-risk-medium)]">
                  <span>2. Suspicious Stager</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-sans">
                  Hidden child processes, temporary directory staging.
                </p>
              </Link>

              <Link
                to="/demo"
                className="block p-3 rounded-md border bg-[var(--color-surface-2)] border-[var(--color-border-subtle)] hover:border-[var(--color-accent-dim)] transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-[var(--color-risk-critical)]">
                  <span>3. Trojan-like Executable</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-sans">
                  Process memory injection, startup persistence, C2 beacons.
                </p>
              </Link>
            </div>

            <div className="pt-2 border-t border-[var(--color-border-subtle)] text-[10px] font-mono text-[var(--color-text-muted)]">
              Note: Demo scenarios run simulated in-memory telemetry, not real malware.
            </div>
          </div>
        </div>
      ) : (
        /* Inspection Result Panel */
        <div
          className="rounded-lg border p-6 font-sans space-y-6"
          style={{
            backgroundColor: 'var(--color-surface-1)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Result Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Check size={18} className="text-[var(--color-risk-low)]" />
                <h2 className="text-base font-mono font-bold text-[var(--color-text-primary)]">
                  Static Inspection Complete &bull; Report #{result.id}
                </h2>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Sample analyzed safely in memory &bull; Classification: {result.classification}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border transition-colors cursor-pointer text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <RotateCcw size={13} />
                <span>Analyze Another</span>
              </button>

              <Link
                to={`/analysis/${result.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded transition-colors"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#0a0f1d',
                }}
              >
                <span>View Full Report</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>

          {/* Extension Mismatch Notice */}
          {hasExtensionMismatch && (
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
                <strong>File Extension Mismatch:</strong> File filename ends with .exe but file contents match text format. Analyzed safely as text.
              </span>
            </div>
          )}

          {/* Static-only Policy Caption */}
          <div
            className="p-3 rounded-md text-xs font-sans border text-[var(--color-text-secondary)]"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              borderColor: 'var(--color-border-subtle)',
            }}
          >
            Dynamic host and network telemetry are not collected for file uploads. Under TrojanGuard safety policy, static-only analysis is strictly capped at Suspicious; a Trojan-like verdict requires behavioral or network evidence.
          </div>

          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-1">
              <span className="text-[11px] text-[var(--color-text-muted)] uppercase">Filename</span>
              <div className="font-semibold text-[var(--color-text-primary)] truncate">
                {result.filename}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-1">
              <span className="text-[11px] text-[var(--color-text-muted)] uppercase">Detected Type</span>
              <div className="font-semibold text-[var(--color-accent)] truncate">
                {result.file_type}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-1">
              <span className="text-[11px] text-[var(--color-text-muted)] uppercase">File Size</span>
              <div className="font-semibold text-[var(--color-text-primary)]">
                {formatBytes(result.file_size)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-1">
              <span className="text-[11px] text-[var(--color-text-muted)] uppercase">Risk Score</span>
              <div className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                <span>{result.risk_score} / 100</span>
                <SeverityBadge value={result.classification} size="sm" />
              </div>
            </div>
          </div>

          {/* SHA-256 Box */}
          <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-[var(--color-text-muted)] uppercase">
                SHA-256 Checksum
              </span>
              <button
                type="button"
                onClick={() => handleCopySha(result.sha256)}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                {copiedSha ? <Check size={12} className="text-[var(--color-risk-low)]" /> : <Copy size={12} />}
                <span>{copiedSha ? 'Copied' : 'Copy Hash'}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-[var(--color-text-primary)] truncate select-all">
              {result.sha256}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
