'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import api from '@/lib/api'
import { toast } from 'sonner'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import MapView, { type MapFilters } from '@/components/MapView'
import { FileText, Clock, CheckCircle, Globe, MapPin, TrendingUp, Users, Check, ChevronLeft, ChevronRight, XCircle } from 'lucide-react'
import { Post } from '@/lib/types'
import { formatLocaleDate } from '@/lib/date-locale'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import 'leaflet/dist/leaflet.css'

const DEFAULT_MAP_FILTERS: MapFilters = {
  category: 'all',
  status: 'all',
  dateRange: 'all',
  customStartDate: '',
  customEndDate: '',
}

const LIST_PAGE_SIZE = 5
const MAP_POSTS_LIMIT = 1000

function buildPostsQueryParams(
  filters: MapFilters,
  options: { page?: number; limit: number }
): string {
  const params = new URLSearchParams()
  if (filters.category && filters.category !== 'all') params.set('category', filters.category)
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (options.page != null) params.set('page', String(options.page))
  params.set('limit', String(options.limit))
  params.set('sortBy', 'createdAt')
  params.set('sortOrder', 'desc')
  params.set('hasLocation', 'true')

  let startDate: string | undefined
  let endDate: string | undefined
  if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
    startDate = new Date(filters.customStartDate).toISOString()
    endDate = new Date(filters.customEndDate).toISOString()
  } else if (filters.dateRange && filters.dateRange !== 'all') {
    const now = new Date()
    switch (filters.dateRange) {
      case 'today':
        startDate = startOfDay(now).toISOString()
        endDate = endOfDay(now).toISOString()
        break
      case 'week':
        startDate = startOfDay(subDays(now, 7)).toISOString()
        endDate = endOfDay(now).toISOString()
        break
      case 'month':
        startDate = startOfDay(subDays(now, 30)).toISOString()
        endDate = endOfDay(now).toISOString()
        break
    }
  }
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  return params.toString()
}

interface DashboardStats {
  totalPosts: number
  pendingPosts: number
  processingPosts: number
  completedPosts: number
}

/** From GET /api/stats – trend vs previous period (by sent date). */
interface StatsTrend {
  trend7Days: number | null
  trend30Days: number | null
}

interface ListResult {
  data: Post[]
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean }
}

export default function DashboardPage() {
  const t = useTranslations()
  const locale = useLocale()
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    pendingPosts: 0,
    processingPosts: 0,
    completedPosts: 0,
  })
  const [statsTrend, setStatsTrend] = useState<StatsTrend>({ trend7Days: null, trend30Days: null })
  const [mapFilters, setMapFilters] = useState<MapFilters>(DEFAULT_MAP_FILTERS)
  const [listPage, setListPage] = useState(1)
  const [mapPosts, setMapPosts] = useState<Post[]>([])
  const [listResult, setListResult] = useState<ListResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [listLoading, setListLoading] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [completingPostId, setCompletingPostId] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectPostId, setRejectPostId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/stats')
      const data = (res as { result?: { byStatus: Record<string, number>; trend7Days?: number | null; trend30Days?: number | null } })?.result
      if (!data?.byStatus) {
        setStats({ totalPosts: 0, pendingPosts: 0, processingPosts: 0, completedPosts: 0 })
        setStatsTrend({ trend7Days: null, trend30Days: null })
        return
      }
      const s = data.byStatus
      setStats({
        totalPosts: s.total ?? 0,
        pendingPosts: s.pending ?? 0,
        processingPosts: s.processing ?? 0,
        completedPosts: s.completed ?? 0,
      })
      setStatsTrend({
        trend7Days: data.trend7Days ?? null,
        trend30Days: data.trend30Days ?? null,
      })
    } catch (e) {
      console.error('Error fetching stats:', e)
      setStats({ totalPosts: 0, pendingPosts: 0, processingPosts: 0, completedPosts: 0 })
      setStatsTrend({ trend7Days: null, trend30Days: null })
    }
  }, [])

  const fetchMapPosts = useCallback(async (filters: MapFilters) => {
    setMapLoading(true)
    try {
      const q = buildPostsQueryParams(filters, { limit: MAP_POSTS_LIMIT })
      const res = await api.get(`/posts?${q}`) as { result: { data: Post[] } }
      setMapPosts(res.result?.data ?? [])
    } catch (e) {
      console.error('Error fetching map posts:', e)
      setMapPosts([])
    } finally {
      setMapLoading(false)
    }
  }, [])

  const fetchListPosts = useCallback(async (filters: MapFilters, page: number) => {
    setListLoading(true)
    try {
      const q = buildPostsQueryParams(filters, { page, limit: LIST_PAGE_SIZE })
      const res = await api.get(`/posts?${q}`) as { result: { data: Post[]; pagination: ListResult['pagination'] } }
      setListResult({
        data: res.result?.data ?? [],
        pagination: res.result?.pagination ?? { page: 1, limit: LIST_PAGE_SIZE, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
      })
    } catch (e) {
      console.error('Error fetching list posts:', e)
      setListResult({ data: [], pagination: { page: 1, limit: LIST_PAGE_SIZE, total: 0, totalPages: 1, hasNext: false, hasPrev: false } })
    } finally {
      setListLoading(false)
    }
  }, [])

  const refetchAll = useCallback(() => {
    fetchStats()
    fetchMapPosts(mapFilters)
    fetchListPosts(mapFilters, listPage)
  }, [mapFilters, listPage, fetchStats, fetchMapPosts, fetchListPosts])

  /** Refetch only list + stats (e.g. after selecting a post). Avoids refetching map so the map doesn't re-fit bounds and re-render. */
  const refetchListAndStats = useCallback(() => {
    fetchStats()
    fetchListPosts(mapFilters, listPage)
  }, [mapFilters, listPage, fetchStats, fetchListPosts])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchMapPosts(mapFilters)
  }, [mapFilters])

  useEffect(() => {
    fetchListPosts(mapFilters, listPage)
  }, [mapFilters, listPage])

  const handleFiltersChange = useCallback((filters: MapFilters) => {
    setMapFilters(filters)
    setListPage(1)
  }, [])

  const handleSelectPost = async (postId: string, status?: string) => {
    setSelectedPostId(postId)
    // if (status === 'completed' || status === 'processing' || status === 'rejected') return
    // try {
    //   await api.patch(`/posts/${postId}`, { status: 'processing' }).catch((e) => {
    //     console.error('Failed to set processing:', e)
    //   })
    //   refetchListAndStats()
    // } catch (e) {
    //   console.error('Failed to set processing:', e)
    // }
  }

  const handleCompletePost = async (postId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCompletingPostId(postId)
    try {
      await api.patch(`/posts/${postId}`, { status: 'processing' })
      refetchAll()
      toast.success(t('common.toast.processingSuccess'))
    } catch (e) {
      console.error('Failed to complete post:', e)
      toast.error(t('common.toast.processingError'))
    } finally {
      setCompletingPostId(null)
    }
  }

  const handleMarkAsCompleted = async (postId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCompletingPostId(postId)
    try {
      await api.patch(`/posts/${postId}`, { status: 'completed' })
      refetchAll()
      toast.success(t('common.toast.completeSuccess'))
    } catch (e) {
      console.error('Failed to complete post:', e)
      toast.error(t('common.toast.completeError'))
    } finally {
      setCompletingPostId(null)
    }
  }

  const openRejectModal = (postId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setRejectPostId(postId)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const closeRejectModal = () => {
    setRejectModalOpen(false)
    setRejectPostId(null)
    setRejectReason('')
    setRejectingPostId(null)
  }

  const handleConfirmReject = async () => {
    if (!rejectPostId) return
    setRejectingPostId(rejectPostId)
    try {
      await api.patch(`/posts/${rejectPostId}`, {
        status: 'rejected',
        rejectionReason: rejectReason.trim() || undefined,
      })
      refetchAll()
      closeRejectModal()
      toast.success(t('common.toast.rejectSuccess'))
    } catch (e) {
      console.error('Failed to reject post:', e)
      toast.error(t('common.toast.rejectError'))
    } finally {
      setRejectingPostId(null)
    }
  }

  const formatTrend = (value: number | null): string => {
    if (value === null) return '—'
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value}%`
  }
  const trendLabel = statsTrend.trend7Days !== null ? t('dashboard.trendVsPrevious7Days') : null

  const statCards = [
    {
      title: t('dashboard.totalPosts'),
      value: stats.totalPosts,
      icon: FileText,
      iconBoxClass: 'bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-400',
      change: formatTrend(statsTrend.trend7Days),
      changePositive: statsTrend.trend7Days === null ? null : (statsTrend.trend7Days ?? 0) >= 0,
    },
    {
      title: t('dashboard.pendingPosts'),
      value: stats.pendingPosts,
      icon: Clock,
      iconBoxClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      change: '—',
      changePositive: null,
    },
    {
      title: t('dashboard.processingPosts'),
      value: stats.processingPosts,
      icon: Globe,
      iconBoxClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      change: '—',
      changePositive: null,
    },
    {
      title: t('dashboard.completedPosts'),
      value: stats.completedPosts,
      icon: CheckCircle,
      iconBoxClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
      change: formatTrend(statsTrend.trend30Days),
      changePositive: statsTrend.trend30Days === null ? null : (statsTrend.trend30Days ?? 0) >= 0,
    },
  ]

  const listPosts = listResult?.data ?? []
  const pagination = listResult?.pagination
  const totalPages = Math.max(1, pagination?.totalPages ?? 1)
  const currentListPage = pagination?.page ?? 1

  useEffect(() => {
    if (listPage > totalPages && totalPages >= 1) setListPage(1)
  }, [listPage, totalPages])

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text text-gray-900 dark:text-gray-50 mb-2">{t('dashboard.title')}</h1>
              <p className="text-gray-600 dark:text-gray-200">{t('dashboard.overview')}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-200">
              <span>{t('dashboard.lastUpdated')}:</span>
              <span className="font-medium">{formatLocaleDate(new Date(), 'MMM d, yyyy HH:mm', locale)}</span>
            </div>
          </div>

          {/* Stats Cards */}
          {loading ? (
            <div className="text-center py-12 text-gray-600 dark:text-gray-200">{t('common.loading')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <div key={index} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${card.iconBoxClass} p-3 rounded-lg`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-xs font-medium flex items-center gap-1 ${
                          card.changePositive === null
                            ? 'text-gray-500 dark:text-gray-400'
                            : card.changePositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}
                        title={index === 0 ? trendLabel ?? undefined : index === 3 ? t('dashboard.trendVsPrevious30Days') : undefined}
                      >
                        {card.changePositive !== null && (card.changePositive ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />)}
                        {card.change}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-200 mb-1">{card.title}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{card.value}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Map and Recent Posts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Section */}
            <div className="lg:col-span-2">
              <div className="card p-0 overflow-hidden">
                <div className="bg-primary text-white px-6 py-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <h2 className="text-xl font-semibold">{t('dashboard.mapTitle')}</h2>
                </div>
                <div className="h-[500px] p-4">
                  {mapLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-gray-500">{t('common.loading')}</div>
                    </div>
                  ) : (
                    <MapView
                      posts={mapPosts}
                      selectedPostId={selectedPostId}
                      onPostUpdated={refetchAll}
                      filters={mapFilters}
                      onFiltersChange={handleFiltersChange}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Recent Posts with Locations */}
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-text dark:text-white">{t('dashboard.recentPosts')}</h2>
                </div>
                <div className="space-y-4">
                  {listLoading ? (
                    <p className="text-sm text-gray-500 dark:text-white text-center py-4">{t('common.loading')}</p>
                  ) : listPosts.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-white text-center py-4">
                      {t('dashboard.noPostsWithLocations')}
                    </p>
                  ) : (
                    listPosts.map((post) => (
                      <div
                        key={post._id || post.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); handleSelectPost(post._id || post.id || '', post.status) }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectPost(post._id || post.id || '', post.status)}
                        className={`border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer ${selectedPostId === (post._id || post.id)
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-gray-200 dark:border-gray-600'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sm dark:text-white text-text line-clamp-1 flex-1 min-w-0">
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            {post.status === 'completed' ? (
                              <span
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium"
                                title={t('posts.status.completed')}
                              >
                                <CheckCircle className="w-4 h-4" />
                                {t('posts.status.completed')}
                              </span>
                            ) : post.status === 'processing' ? (
                              <button
                                type="button"
                                onClick={(e) => handleMarkAsCompleted(post._id || post.id || '', e)}
                                disabled={completingPostId === (post._id || post.id)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                title={t('map.markComplete')}
                              >
                                {completingPostId === (post._id || post.id) ? (
                                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => handleCompletePost(post._id || post.id || '', e)}
                                  disabled={completingPostId === (post._id || post.id)}
                                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={t('map.markComplete')}
                                >
                                  {completingPostId === (post._id || post.id) ? (
                                    <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => openRejectModal(post._id || post.id || '', e)}
                                  disabled={post.status === 'rejected'}
                                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={t('posts.rejectPost')}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: `${post.status === 'published' || post.status === 'completed'
                                    ? '#16A34A'
                                    : post.status === 'approved'
                                      ? '#1E3A8A'
                                      : post.status === 'processing'
                                        ? '#2563EB'
                                        : post.status === 'pending'
                                          ? '#F59E0B'
                                          : '#DC2626'
                                  }20`,
                                color:
                                  post.status === 'published' || post.status === 'completed'
                                    ? '#16A34A'
                                    : post.status === 'approved'
                                      ? '#1E3A8A'
                                      : post.status === 'processing'
                                        ? '#2563EB'
                                        : post.status === 'pending'
                                          ? '#F59E0B'
                                          : '#DC2626',
                              }}
                            >
                              {post.status ? t(`posts.status.${post.status}`) : post.status}
                            </span>
                          </div>
                        </div>
                        {post.content && (
                          <p className="text-xs text-gray-600 dark:text-gray-200 mb-2 line-clamp-2">{post.content}</p>
                        )}
                        {post.location && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-200">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {post.location.address ||
                                `${post.location.latitude.toFixed(4)}, ${post.location.longitude.toFixed(4)}`}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-300 mt-2">
                          {formatLocaleDate(post.createdAt, 'MMM d, yyyy', locale)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {pagination && pagination.total > LIST_PAGE_SIZE && (
                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => setListPage((p) => Math.max(1, p - 1))}
                      disabled={currentListPage <= 1}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t('common.previous')}
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t('common.pageOf', { current: currentListPage, total: totalPages })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentListPage >= totalPages}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {t('common.next')}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="card bg-gradient-to-br from-primary/5 to-primary/10">
                <h3 className="font-semibold text-text dark:text-white mb-3">{t('dashboard.quickActions')}</h3>
                <div className="space-y-2">
                  {/* <Link
                    href="/posts/new"
                    className="w-full btn-primary text-left flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {t('dashboard.createNewPost')}
                  </Link> */}
                  <Link
                    href="/posts?status=pending"
                    className="w-full btn-secondary text-left flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    {t('dashboard.reviewPending')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reject confirmation modal */}
        {rejectModalOpen && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-modal-title"
            onClick={() => !rejectingPostId && closeRejectModal()}
          >
            <div
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="reject-modal-title" className="text-lg font-semibold text-text dark:text-white mb-2">
                {t('posts.rejectConfirmTitle')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {t('posts.rejectConfirmMessage')}
              </p>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('posts.rejectionReasonLabel')}
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('posts.rejectionReasonPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  disabled={!!rejectingPostId}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!!rejectingPostId}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {rejectingPostId ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  {t('posts.confirmReject')}
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  )
}
