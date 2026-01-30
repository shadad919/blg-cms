'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/lib/settings-store'

function adjustHex(hex: string, percent: number, darken: boolean): string {
  const num = parseInt(hex.slice(1), 16)
  const factor = darken ? 1 - percent / 100 : 1 + percent / 100
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) * factor))
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) * factor))
  const b = Math.min(255, Math.round((num & 0xff) * factor))
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const theme = useSettingsStore((s) => s.theme)
  const primaryColor = useSettingsStore((s) => s.primaryColor)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-primary', primaryColor)
    root.style.setProperty('--color-primary-light', adjustHex(primaryColor, 15, false))
    root.style.setProperty('--color-primary-dark', adjustHex(primaryColor, 8, true))
  }, [primaryColor])

  useEffect(() => {
    const root = document.documentElement
    const applyTheme = (isDark: boolean) => {
      root.classList.remove('light', 'dark')
      root.classList.add(isDark ? 'dark' : 'light')
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mq.matches)
      const handler = () => applyTheme(mq.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    applyTheme(theme === 'dark')
  }, [theme])

  return <>{children}</>
}
