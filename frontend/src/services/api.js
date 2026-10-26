/**
 * TrojanGuard Frontend API Client
 *
 * Lightweight, unified API client for backend communication.
 * Provides typed ApiError handling, network-down detection,
 * and mapped endpoints for analysis, dashboard, history, threats, and demo.
 */

export class ApiError extends Error {
  constructor(message, status = 500, isNetworkError = false, detail = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.isNetworkError = isNetworkError
    this.detail = detail || message
  }
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`
  const config = {
    ...options,
    headers: {
      ...(!options.body || !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(options.headers || {}),
    },
  }

  let response
  try {
    response = await fetch(url, config)
  } catch (err) {
    // Network errors or backend unreachable
    throw new ApiError(
      'Unable to connect to TrojanGuard backend API. Ensure the backend server is running on port 8001.',
      0,
      true,
      err.message
    )
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`
    try {
      const errorJson = await response.json()
      if (typeof errorJson.detail === 'string') {
        errorDetail = errorJson.detail
      } else if (Array.isArray(errorJson.detail)) {
        errorDetail = errorJson.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
      } else if (errorJson.error) {
        errorDetail = errorJson.error
      }
    } catch {
      errorDetail = response.statusText || errorDetail
    }
    throw new ApiError(errorDetail, response.status, false)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

/**
 * Health check endpoint
 */
export async function getHealth() {
  return request('/api/health')
}

/**
 * Real-time SOC dashboard metrics
 */
export async function getDashboard() {
  return request('/api/dashboard')
}

/**
 * In-memory safe sample file inspection
 * @param {File} file
 */
export async function analyzeFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request('/api/analyze', {
    method: 'POST',
    body: formData,
  })
}

/**
 * Retrieve full analysis report by ID
 * @param {number|string} id
 */
export async function getAnalysis(id) {
  return request(`/api/analysis/${id}`)
}

/**
 * Start an interactive simulated demo run
 * @param {'normal'|'suspicious'|'trojan'} scenario
 */
export async function startDemo(scenario = 'trojan') {
  return request('/api/demo/start', {
    method: 'POST',
    body: JSON.stringify({ scenario }),
  })
}

/**
 * Stream/poll demo event progression
 * @param {string} demoId
 * @param {boolean} fast
 */
export async function getDemoEvents(demoId, fast = false) {
  const query = fast ? '?fast=true' : ''
  return request(`/api/demo/${demoId}/events${query}`)
}

/**
 * Paginated historical analyses with filters and search
 * @param {object} params
 */
export async function getHistory(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, val)
    }
  })
  const qs = searchParams.toString()
  return request(`/api/history${qs ? `?${qs}` : ''}`)
}

/**
 * Retrieve high-severity threat detections
 */
export async function getThreats() {
  return request('/api/threats')
}

/**
 * Retrieve extracted IOCs for a specific analysis
 * @param {number|string} analysisId
 */
export async function getIocs(analysisId) {
  return request(`/api/iocs/${analysisId}`)
}
