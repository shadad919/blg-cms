'use client'

import { useTranslations, useLocale } from 'next-intl'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Globe, Moon, Sun, Monitor, Check, Palette } from 'lucide-react'
import { usePathname, useRouter } from '@/i18n/routing'
import { useSettingsStore, type Theme, DEFAULT_PRIMARY_COLOR } from '@/lib/settings-store'
import { useState } from 'react'

const PRIMARY_PRESETS = [
  { name: 'Blue', value: '#1E3A8A' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Teal', value: '#0D9488' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Sky', value: '#0284C7' },
  { name: 'Rose', value: '#C026D3' },
  { name: 'Amber', value: '#D97706' },
]

const LOCALE_OPTIONS = [
  { value: 'en' as const, label: 'English' },
  { value: 'ar' as const, label: 'العربية' },
]

export default function SettingsPage() {
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()
  const { theme, setTheme, primaryColor, setPrimaryColor } = useSettingsStore()
  const [saved, setSaved] = useState(false)

  const handleLocaleChange = (locale: string) => {
    router.replace(pathname || '/dashboard', { locale: locale as 'en' | 'ar' })
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePrimaryColorChange = (color: string) => {
    setPrimaryColor(color)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const themeOptions: { value: Theme; icon: typeof Sun; labelKey: string }[] = [
    { value: 'light', icon: Sun, labelKey: 'themeLight' },
    { value: 'dark', icon: Moon, labelKey: 'themeDark' },
    { value: 'system', icon: Monitor, labelKey: 'themeSystem' },
  ]

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text dark:text-gray-100 mb-2">
                {t('settings.title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {t('settings.subtitle')}
              </p>
            </div>
            {saved && (
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <Check className="w-4 h-4" />
                {t('settings.saved')}
              </div>
            )}
          </div>

          {/* Language */}
          <div className="card">
            <h2 className="text-xl font-semibold text-text dark:text-white mb-2 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              {t('settings.language.title')}
            </h2>
            <p className="text-gray-600 dark:text-white text-sm mb-4">
              {t('settings.language.description')}
            </p>
            <div className="flex flex-wrap gap-2">
              {LOCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleLocaleChange(opt.value)}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-colors border ${
                    locale === opt.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-gray-800 text-text dark:text-gray-100 border-gray-300 dark:border-gray-500 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Appearance */}
          <div className="card">
            <h2 className="text-xl font-semibold text-text dark:text-white mb-2 flex items-center gap-2">
              <Sun className="w-5 h-5 text-primary" />
              {t('settings.appearance.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              {t('settings.appearance.description')}
            </p>
            <p className="label text-text dark:text-gray-100 mb-2">
              {t('settings.appearance.theme')}
            </p>
            <div className="flex flex-wrap gap-3">
              {themeOptions.map((opt) => {
                const Icon = opt.icon
                const isActive = theme === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleThemeChange(opt.value)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      isActive
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-gray-800 text-text dark:text-gray-100 border-gray-300 dark:border-gray-500 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {t(`settings.appearance.${opt.labelKey}`)}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <p className="label text-text dark:text-gray-100 mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                {t('settings.appearance.primaryColor')}
              </p>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                {t('settings.appearance.primaryColorDescription')}
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                {PRIMARY_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handlePrimaryColorChange(preset.value)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                      primaryColor === preset.value
                        ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-primary ring-offset-white dark:ring-offset-gray-900'
                        : 'border-gray-300 dark:border-gray-500 hover:border-gray-400 dark:hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => handlePrimaryColorChange(e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-500 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-md"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Custom</span>
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                {primaryColor}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
