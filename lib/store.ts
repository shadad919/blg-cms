import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface Admin {
  id: string
  email: string
  name: string
  role: 'admin' | 'super_admin'
  isActive: boolean
}

interface AuthState {
  admin: Admin | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (admin: Admin, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      setAuth: (admin, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token)
        }
        set({ admin, token, isAuthenticated: true })
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
        }
        set({ admin: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
