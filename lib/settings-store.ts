import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

export const DEFAULT_PRIMARY_COLOR = '#0D9488'

const SETTINGS_STORAGE_KEY = 'settings-storage'

interface SettingsState {
  theme: Theme
  primaryColor: string
  setTheme: (theme: Theme) => void
  setPrimaryColor: (color: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      primaryColor: DEFAULT_PRIMARY_COLOR,
      setTheme: (theme) => set({ theme }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
