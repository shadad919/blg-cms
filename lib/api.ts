import { apiClient } from './hono'
import { useAuthStore } from './store'

// Helper to build request headers (HeadersInit-safe)
function buildHeaders(overrides?: HeadersInit): HeadersInit {
  const record: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) record.Authorization = `Bearer ${token}`
  }
  const headers = new Headers(record)
  if (overrides) {
    new Headers(overrides).forEach((value, key) => headers.set(key, value))
  }
  return headers
}

// When token is malformed or expired, server returns 401. Clear auth and redirect to login.
function handleUnauthorized() {
  if (typeof window === 'undefined') return
  useAuthStore.getState().clearAuth()
  window.location.href = '/login'
}

// Wrapper for API calls with auth
export const api = {
  get: async (path: string, options?: RequestInit) => {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: buildHeaders(options?.headers),
    })
    if (!response.ok) {
      if (response.status === 401) handleUnauthorized()
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  },
  post: async (path: string, data?: unknown, options?: RequestInit) => {
    const response = await fetch(`/api${path}`, {
      method: 'POST',
      ...options,
      headers: buildHeaders(options?.headers),
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!response.ok) {
      if (response.status === 401) handleUnauthorized()
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  },
  patch: async (path: string, data?: unknown, options?: RequestInit) => {
    const response = await fetch(`/api${path}`, {
      method: 'PATCH',
      ...options,
      headers: buildHeaders(options?.headers),
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!response.ok) {
      if (response.status === 401) handleUnauthorized()
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  },
  delete: async (path: string, options?: RequestInit) => {
    const response = await fetch(`/api${path}`, {
      method: 'DELETE',
      ...options,
      headers: buildHeaders(options?.headers),
    })
    if (!response.ok) {
      if (response.status === 401) handleUnauthorized()
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  },
}

export default api
