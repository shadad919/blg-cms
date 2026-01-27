import { apiClient } from './hono'

// Helper to get auth headers
const getAuthHeaders = () => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Wrapper for API calls with auth
export const api = {
  get: async (path: string, options?: RequestInit) => {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options?.headers,
      },
    })
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }
      }
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  },
  post: async (path: string, data?: unknown, options?: RequestInit) => {
    const response = await fetch(`/api${path}`, {
      method: 'POST',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }
      }
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  },
  patch: async (path: string, data?: unknown, options?: RequestInit) => {
    const response = await fetch(`/api${path}`, {
      method: 'PATCH',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }
      }
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  },
  delete: async (path: string, options?: RequestInit) => {
    const response = await fetch(`/api${path}`, {
      method: 'DELETE',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options?.headers,
      },
    })
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }
      }
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  },
}

export default api
