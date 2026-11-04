import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'

import { getHistory } from '../services/api'
import AnalysisTable from '../components/AnalysisTable'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const PAGE_SIZE = 10

export default function History() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Read URL query parameters
  const querySearch = searchParams.get('search') || ''
  const queryClassification = searchParams.get('classification') || ''
  const querySeverity = searchParams.get('severity') || ''
  const querySort = searchParams.get('sort') || 'timestamp'
  const queryOrder = searchParams.get('order') || 'desc'
  const queryPage = parseInt(searchParams.get('page') || '1', 10)

  // Local state for immediate input feedback
  const [searchInput, setSearchInput] = useState(querySearch)
  const [data, setData] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Debounce search input updating URL query params
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== querySearch) {
        updateParams({ search: searchInput, page: 1 })
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [searchInput, querySearch])

  // Synchronize search input if URL changes externally
  useEffect(() => {
    setSearchInput(querySearch)
  }, [querySearch])

  // Helper to update search params
  const updateParams = useCallback((newParams) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === undefined || val === null || val === '' || (key === 'page' && val === 1)) {
          next.delete(key)
        } else {
          next.set(key, String(val))
        }
      })
      return next
    })
  }, [setSearchParams])

  // Fetch paginated history from API
  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)

    const offset = Math.max(0, (queryPage - 1) * PAGE_SIZE)

    try {
      const res = await getHistory({
        search: querySearch || undefined,
        classification: queryClassification || undefined,
        severity: querySeverity || undefined,
        sort: querySort,
        order: queryOrder,
        limit: PAGE_SIZE,
        offset: offset,
      })
      setData({
        items: res?.items || [],
        total: res?.total || 0,
      })
    } catch (err) {
      setError(err.message || 'Failed to retrieve analysis history from backend.')
    } finally {
      setLoading(false)
    }
  }, [querySearch, queryClassification, querySeverity, querySort, queryOrder, queryPage])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Reset all filters
  const handleClearFilters = () => {
    setSearchInput('')
    setSearchParams({})
  }

  // Calculate pagination boundaries
  const totalItems = data.total
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, queryPage), totalPages)
  const startIdx = totalItems > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0
  const endIdx = Math.min(currentPage * PAGE_SIZE, totalItems)

  const hasActiveFilters = Boolean(querySearch || queryClassification || querySeverity)

  return (
    <div className="space-y-4 font-sans pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-sm font-semibold font-mono text-[var(--color-text-primary)]">
            Historical Threat Detection Catalog
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Search, filter, and review persistent inspection records across uploads and synthetic simulation runs.
          </p>
        </div>

        <div className="text-xs font-mono text-[var(--color-text-muted)] shrink-0 tabular-nums">
          Total recorded: <strong className="text-[var(--color-text-primary)]">{totalItems}</strong> analyses
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div
        className="p-3 rounded-[4px] border bg-[var(--color-surface-1)] space-y-2.5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search filename or SHA-256..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono rounded-[3px] border bg-[var(--color-bg-base)] text-[var(--color-text-primary)] border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          {/* Classification Filter */}
          <div>
            <select
              value={queryClassification}
              onChange={(e) => updateParams({ classification: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-[3px] border bg-[var(--color-bg-base)] text-[var(--color-text-primary)] border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
            >
              <option value="">All Classifications</option>
              <option value="Benign">Benign</option>
              <option value="Suspicious">Suspicious</option>
              <option value="Trojan-like">Trojan-like</option>
            </select>
          </div>

          {/* Severity Risk Level Filter */}
          <div>
            <select
              value={querySeverity}
              onChange={(e) => updateParams({ severity: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-[3px] border bg-[var(--color-bg-base)] text-[var(--color-text-primary)] border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
            >
              <option value="">All Severity Levels</option>
              <option value="Low">Low Risk (0–30)</option>
              <option value="Medium">Medium Risk (31–60)</option>
              <option value="High">High Risk (61–80)</option>
              <option value="Critical">Critical Risk (81–100)</option>
            </select>
          </div>

          {/* Sort Column & Order */}
          <div className="flex items-center gap-1.5">
            <select
              value={querySort}
              onChange={(e) => updateParams({ sort: e.target.value, page: 1 })}
              className="w-full px-2 py-1.5 text-xs font-mono rounded-[3px] border bg-[var(--color-bg-base)] text-[var(--color-text-primary)] border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
            >
              <option value="timestamp">Date / Time</option>
              <option value="risk_score">Risk Score</option>
              <option value="filename">Filename</option>
            </select>

            <button
              type="button"
              onClick={() => updateParams({ order: queryOrder === 'desc' ? 'asc' : 'desc', page: 1 })}
              className="px-2 py-1.5 text-xs font-mono rounded-[3px] border bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)] transition-colors shrink-0 cursor-pointer"
              title={`Sort ${queryOrder === 'desc' ? 'Ascending' : 'Descending'}`}
            >
              <ArrowUpDown size={12} className="inline-block" />
              <span className="ml-1 uppercase text-[10px] font-medium">{queryOrder}</span>
            </button>
          </div>
        </div>

        {/* Active Filters Clear Button */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)] text-xs font-mono text-[var(--color-text-muted)]">
            <span>Filtered results active</span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>Clear filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Table or State */}
      {loading ? (
        <LoadingState message="Loading catalog records from database..." />
      ) : error ? (
        <ErrorState
          title="History Catalog Error"
          message={error}
          onRetry={fetchHistory}
          retryLabel="Retry Catalog"
        />
      ) : data.items.length === 0 ? (
        <div className="py-6">
          <EmptyState
            title={hasActiveFilters ? 'No Analyses Match Your Filters' : 'No Analysis Records Found'}
            description={
              hasActiveFilters
                ? 'Try broadening your search term or clearing classification and severity filters.'
                : 'The historical catalog is currently empty. Run a simulation in the Demo Lab or upload a file sample to generate records.'
            }
            actionLabel={hasActiveFilters ? 'Clear All Filters' : 'Go to Demo Lab'}
            onAction={hasActiveFilters ? handleClearFilters : () => navigate('/demo')}
            actionRoute={hasActiveFilters ? null : '/demo'}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* AnalysisTable with Clickable Rows */}
          <AnalysisTable analyses={data.items} />

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-[var(--color-text-muted)] pt-1">
            <div className="tabular-nums">
              Showing <strong className="text-[var(--color-text-primary)]">{startIdx}</strong>–
              <strong className="text-[var(--color-text-primary)]">{endIdx}</strong> of{' '}
              <strong className="text-[var(--color-text-primary)]">{totalItems}</strong> analyses
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateParams({ page: Math.max(1, currentPage - 1) })}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] border bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={12} />
                <span>Prev</span>
              </button>

              <span className="px-2 tabular-nums">
                Page <strong className="text-[var(--color-text-primary)]">{currentPage}</strong> of{' '}
                <strong className="text-[var(--color-text-primary)]">{totalPages}</strong>
              </span>

              <button
                type="button"
                onClick={() => updateParams({ page: Math.min(totalPages, currentPage + 1) })}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] border bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
