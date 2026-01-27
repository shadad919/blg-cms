'use client'

import { useTranslations } from 'next-intl'
import Layout from '@/components/Layout'
import { Globe, Moon, Sun } from 'lucide-react'

export default function SettingsPage() {
  const t = useTranslations()

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">{t('navigation.settings')}</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language Settings
          </h2>
          <p className="text-gray-600">Language settings will be available in a future update.</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5" />
            Appearance
          </h2>
          <p className="text-gray-600">Appearance settings will be available in a future update.</p>
        </div>
      </div>
    </Layout>
  )
}
