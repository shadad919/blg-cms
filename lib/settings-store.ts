import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PostCategory, WhatsappCategorySetting } from './types'

export type Theme = 'light' | 'dark' | 'system'

export const DEFAULT_PRIMARY_COLOR = '#0D9488'

const SETTINGS_STORAGE_KEY = 'settings-storage'

export type { PostCategory }

interface SettingsState {
  theme: Theme
  primaryColor: string
  /** Per-category WhatsApp Navigator settings (phone + linked). Synced to API on Save. */
  whatsappNavigatorSettings: Partial<Record<PostCategory, WhatsappCategorySetting>>
  setTheme: (theme: Theme) => void
  setPrimaryColor: (color: string) => void
  setWhatsAppNavigatorSetting: (category: PostCategory, value: WhatsappCategorySetting) => void
  setWhatsAppNavigatorSettings: (settings: Partial<Record<PostCategory, WhatsappCategorySetting>>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      primaryColor: DEFAULT_PRIMARY_COLOR,
      whatsappNavigatorSettings: {},
      setTheme: (theme) => set({ theme }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      setWhatsAppNavigatorSetting: (category, value) =>
        set((state) => ({
          whatsappNavigatorSettings: {
            ...state.whatsappNavigatorSettings,
            [category]: value,
          },
        })),
      setWhatsAppNavigatorSettings: (whatsappNavigatorSettings) =>
        set({ whatsappNavigatorSettings }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
