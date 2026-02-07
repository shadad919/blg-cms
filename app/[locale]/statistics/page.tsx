'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { FileText, Clock, Globe, CheckCircle, XCircle, FileSpreadsheet, FileDown } from 'lucide-react'

interface StatsByStatus {
  total: number
  pending: number
  processing: number
  completed: number
  rejected: number
}

interface ChartsData {
  daily: { date: string; count: number }[]
  byCategory: { category: string; count: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  rejected: '#ef4444',
}

/** English-only labels for PDF export (jsPDF default font does not support Arabic) */
const PDF_LABELS = {
  title: 'Statistics',
  statusDistribution: 'Status distribution',
  byCategory: 'Reports by category',
  reportsOverTime: 'Reports over time (last 30 days)',
  reportsCount: 'Reports',
  totalPosts: 'Total Reports',
  pendingPosts: 'Pending Reports',
  processingPosts: 'Processing Reports',
  completedPosts: 'Completed Reports',
  rejected: 'Rejected',
  category: 'Category',
  date: 'Date',
  categoryNames: { road: 'Road', electricity: 'Electricity', street_light: 'Street Light', building: 'Building', wall: 'Wall', water: 'Water', mine: 'Mine' } as Record<string, string>,
}

export default function StatisticsPage() {
  const t = useTranslations()
  const tPosts = useTranslations('posts')
  const tMap = useTranslations('map')
  const [byStatus, setByStatus] = useState<StatsByStatus | null>(null)
  const [charts, setCharts] = useState<ChartsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, chartsRes] = await Promise.all([
        api.get('/stats'),
        api.get('/stats/charts'),
      ])
      const statsData = (statsRes as { result?: { byStatus: StatsByStatus } })?.result
      const chartsData = (chartsRes as { result?: ChartsData })?.result
      if (statsData?.byStatus) setByStatus(statsData.byStatus)
      if (chartsData) setCharts(chartsData)
    } catch (e) {
      console.error('Failed to load statistics:', e)
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const pieData = byStatus
    ? [
        { name: tPosts('status.pending'), value: byStatus.pending, key: 'pending' },
        { name: tPosts('status.processing'), value: byStatus.processing, key: 'processing' },
        { name: tPosts('status.completed'), value: byStatus.completed, key: 'completed' },
        { name: tPosts('status.rejected'), value: byStatus.rejected, key: 'rejected' },
      ].filter((d) => d.value > 0)
    : []

  const CATEGORY_KEYS = ['road', 'electricity', 'street_light', 'building', 'wall', 'water', 'mine'] as const
  const categoryLabel = (key: string) => {
    if (key === 'other') return key
    if (CATEGORY_KEYS.includes(key as (typeof CATEGORY_KEYS)[number])) {
      return tMap(`categories.${key}` as 'categories.road')
    }
    return key
  }

  const barCategoryData = (charts?.byCategory ?? []).map((r) => ({
    name: categoryLabel(r.category),
    count: r.count,
  }))

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      const filename = `statistics-${new Date().toISOString().slice(0, 10)}.xlsx`

      if (byStatus) {
        const statusRows = [
          [t('statistics.statusDistribution')],
          [t('dashboard.totalPosts'), byStatus.total],
          [t('dashboard.pendingPosts'), byStatus.pending],
          [t('dashboard.processingPosts'), byStatus.processing],
          [t('dashboard.completedPosts'), byStatus.completed],
          [tPosts('status.rejected'), byStatus.rejected],
        ]
        const wsStatus = XLSX.utils.aoa_to_sheet(statusRows)
        XLSX.utils.book_append_sheet(wb, wsStatus, t('statistics.statusDistribution').slice(0, 31))
      }

      if (charts?.byCategory?.length) {
        const categoryRows = [[t('map.categoryLabelShort') || 'Category', t('statistics.reportsCount')], ...charts.byCategory.map((r) => [categoryLabel(r.category), r.count])]
        const wsCat = XLSX.utils.aoa_to_sheet(categoryRows)
        XLSX.utils.book_append_sheet(wb, wsCat, (t('statistics.byCategory') || 'By Category').slice(0, 31))
      }

      if (charts?.daily?.length) {
        const dailyRows = [['Date', t('statistics.reportsCount')], ...charts.daily.map((d) => [d.date, d.count])]
        const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows)
        XLSX.utils.book_append_sheet(wb, wsDaily, (t('statistics.reportsOverTime') || 'Daily').slice(0, 31))
      }

      XLSX.writeFile(wb, filename)
    } catch (e) {
      console.error('Export Excel failed:', e)
    } finally {
      setExporting(null)
    }
  }

  const handleExportPdf = async () => {
    setExporting('pdf')
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default as (doc: import('jspdf').jsPDF, options: Record<string, unknown>) => void
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text(PDF_LABELS.title, 14, 20)
      doc.setFontSize(10)
      doc.text(new Date().toISOString().slice(0, 10), 14, 28)
      let y = 36

      const pdfCategoryLabel = (key: string) => PDF_LABELS.categoryNames[key] || key

      if (byStatus) {
        doc.setFontSize(12)
        doc.text(PDF_LABELS.statusDistribution, 14, y)
        y += 6
        autoTable(doc, {
          startY: y,
          head: [['', PDF_LABELS.reportsCount]],
          body: [
            [PDF_LABELS.totalPosts, String(byStatus.total)],
            [PDF_LABELS.pendingPosts, String(byStatus.pending)],
            [PDF_LABELS.processingPosts, String(byStatus.processing)],
            [PDF_LABELS.completedPosts, String(byStatus.completed)],
            [PDF_LABELS.rejected, String(byStatus.rejected)],
          ],
        })
        y = (doc as import('jspdf').jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 14
      }

      if (charts?.byCategory?.length && y < 260) {
        doc.setFontSize(12)
        doc.text(PDF_LABELS.byCategory, 14, y)
        y += 6
        autoTable(doc, {
          startY: y,
          head: [[PDF_LABELS.category, PDF_LABELS.reportsCount]],
          body: charts.byCategory.map((r) => [pdfCategoryLabel(r.category), String(r.count)]),
        })
        y = (doc as import('jspdf').jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 14
      }

      if (charts?.daily?.length && y < 250) {
        doc.setFontSize(12)
        doc.text(PDF_LABELS.reportsOverTime, 14, y)
        y += 6
        autoTable(doc, {
          startY: y,
          head: [[PDF_LABELS.date, PDF_LABELS.reportsCount]],
          body: charts.daily.map((d) => [d.date, String(d.count)]),
          pageBreak: 'auto',
        })
      }

      doc.save(`statistics-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e) {
      console.error('Export PDF failed:', e)
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center py-24">
            <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300">
            {error}
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {t('statistics.title')}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-300">
                {t('statistics.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!!exporting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === 'excel' ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                {t('statistics.exportExcel')}
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!!exporting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === 'pdf' ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                {t('statistics.exportPdf')}
              </button>
            </div>
          </div>

          {/* Summary cards */}
          {byStatus && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.totalPosts')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{byStatus.total}</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.pendingPosts')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{byStatus.pending}</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.processingPosts')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{byStatus.processing}</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.completedPosts')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{byStatus.completed}</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tPosts('status.rejected')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{byStatus.rejected}</p>
                </div>
              </div>
            </div>
          )}

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status distribution (Pie) */}
            <div className="card p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
                {t('statistics.statusDistribution')}
              </h2>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" className="space-x-4" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      className='p-4'
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={entry.key} className='p-4' fill={STATUS_COLORS[entry.key] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number | undefined) => [value ?? 0, '']} />
                    <Legend wrapperStyle={{ padding: '16px 0 0' }} verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-500 dark:text-gray-400">
                  {t('statistics.noData')}
                </div>
              )}
            </div>

            {/* Reports by category (Bar) */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
                {t('statistics.byCategory')}
              </h2>
              {barCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barCategoryData} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      className="text-gray-600 dark:text-gray-400"
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tw-bg-opacity, 1)',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="var(--color-primary, #0d9488)" radius={[4, 4, 0, 0]} name={t('statistics.reportsCount')} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-500 dark:text-gray-400">
                  {t('statistics.noData')}
                </div>
              )}
            </div>
          </div>

          {/* Reports over time (full width) */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              {t('statistics.reportsOverTime')}
            </h2>
            {charts?.daily && charts.daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={charts.daily.map((d) => ({ ...d, dateShort: d.date.slice(5) }))}
                  margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    dataKey="dateShort"
                    tick={{ fontSize: 11 }}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(_, payload) => (Array.isArray(payload) && payload[0]?.payload?.date) ?? ''}
                    contentStyle={{
                      backgroundColor: 'var(--tw-bg-opacity, 1)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-primary, #0d9488)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={t('statistics.reportsCount')}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[320px] text-gray-500 dark:text-gray-400">
                {t('statistics.noData')}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
