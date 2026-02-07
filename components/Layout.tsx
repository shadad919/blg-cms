'use client'

import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/lib/store'
import { LogOut, LayoutDashboard, FileText, Settings, User, BarChart3 } from 'lucide-react'
import { Link, usePathname, useRouter } from '@/i18n/routing'

export default function Layout({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const { admin, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('navigation.dashboard') },
    { href: '/posts', icon: FileText, label: t('navigation.posts') },
    { href: '/statistics', icon: BarChart3, label: t('navigation.statistics') },
    { href: '/settings', icon: Settings, label: t('navigation.settings') },
  ]

  return (
    <div className="min-h-screen bg-background dark:bg-dark-page">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-600 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white font-semibold text-sm shrink-0">
                ب
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
                بلٌغ dashboard
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                <User className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[180px]">
                  {admin?.name || admin?.email || 'Admin'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav strip (when sidebar is hidden) */}
      <nav className="md:hidden flex gap-1 px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex w-56 flex-col border-r border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 min-h-[calc(100vh-4rem)]">
          <nav className="flex-1 p-4 space-y-1">
            <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('navigation.menuTitle')}
            </p>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0 opacity-90" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
