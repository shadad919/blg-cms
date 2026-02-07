import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
// import type { PostCategory, WhatsappCategorySetting } from './types' // WhatsApp disabled

export type Theme = 'light' | 'dark' | 'system'

export const DEFAULT_PRIMARY_COLOR = '#0D9488'

const SETTINGS_STORAGE_KEY = 'settings-storage'

// export type { PostCategory } // WhatsApp disabled

interface SettingsState {
  theme: Theme
  primaryColor: string
  // WhatsApp disabled – whatsappNavigatorSettings, setWhatsAppNavigatorSetting, setWhatsAppNavigatorSettings
  setTheme: (theme: Theme) => void
  setPrimaryColor: (color: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      primaryColor: DEFAULT_PRIMARY_COLOR,
      // whatsappNavigatorSettings: {},
      setTheme: (theme) => set({ theme }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      // setWhatsAppNavigatorSetting: (category, value) => set(...),
      // setWhatsAppNavigatorSettings: (whatsappNavigatorSettings) => set({ whatsappNavigatorSettings }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
