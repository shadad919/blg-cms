'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import api from '@/lib/api'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import MapView from '@/components/MapView'
import { FileText, Clock, CheckCircle, Globe, MapPin, TrendingUp, Users, Check, ChevronLeft, ChevronRight, XCircle } from 'lucide-react'
import { Post } from '@/lib/types'
import { formatLocaleDate } from '@/lib/date-locale'
import { dummyPosts } from '@/lib/dummyData'
import 'leaflet/dist/leaflet.css'

interface DashboardStats {
  totalPosts: number
  pendingPosts: number
  approvedPosts: number
  publishedPosts: number
}

export default function DashboardPage() {
  const t = useTranslations()
  const locale = useLocale()
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    pendingPosts: 0,
    approvedPosts: 0,
    publishedPosts: 0,
  })
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [completingPostId, setCompletingPostId] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectPostId, setRejectPostId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null)
  const POSTS_PER_PAGE = 5
  const [currentPage, setCurrentPage] = useState(1)

  const fetchData = async () => {
      try {
        const [allPosts, pending, approved, published, allPostsData] = await Promise.all([
          api.get('/posts?limit=1'),
          api.get('/posts?status=pending&limit=1'),
          api.get('/posts?status=approved&limit=1'),
          api.get('/posts?status=published&limit=1'),
          api.get('/posts?limit=100'),
        ])

        setStats({
          totalPosts: allPosts.result.pagination.total,
          pendingPosts: pending.result.pagination.total,
          approvedPosts: approved.result.pagination.total,
          publishedPosts: published.result.pagination.total,
        })

        setPosts(allPostsData.result.data)
      } catch (error) {
        console.error('Error fetching stats:', error)
        // Use dummy data when backend is not available
        const pendingCount = dummyPosts.filter((p) => p.status === 'pending').length
        const approvedCount = dummyPosts.filter((p) => p.status === 'approved').length
        const publishedCount = dummyPosts.filter((p) => p.status === 'published').length

        setStats({
          totalPosts: dummyPosts.length,
          pendingPosts: pendingCount,
          approvedPosts: approvedCount,
          publishedPosts: publishedCount,
        })

        setPosts(dummyPosts)
      } finally {
      setLoading(false)
      setMapLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSelectPost = async (postId: string, status?: string) => {
    setSelectedPostId(postId)
    if (status === 'completed' || status === 'processing' || status === 'rejected') return
    try {
      await api.patch(`/posts/${postId}`, { status: 'processing' })
      await fetchData()
    } catch (e) {
      console.error('Failed to set processing:', e)
    }
  }

  const handleCompletePost = async (postId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCompletingPostId(postId)
    try {
      await api.patch(`/posts/${postId}`, { status: 'completed' })
      await fetchData()
    } catch (e) {
      console.error('Failed to complete post:', e)
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
      await fetchData()
      closeRejectModal()
    } catch (e) {
      console.error('Failed to reject post:', e)
    } finally {
      setRejectingPostId(null)
    }
  }

  const statCards = [
    {
      title: t('dashboard.totalPosts'),
      value: stats.totalPosts,
      icon: FileText,
      iconBoxClass: 'bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-400',
      change: '+12%',
    },
    {
      title: t('dashboard.pendingPosts'),
      value: stats.pendingPosts,
      icon: Clock,
      iconBoxClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      change: '+5%',
    },
    {
      title: t('dashboard.approvedPosts'),
      value: stats.approvedPosts,
      icon: CheckCircle,
      iconBoxClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
      change: '+8%',
    },
    {
      title: t('dashboard.publishedPosts'),
      value: stats.publishedPosts,
      icon: Globe,
      iconBoxClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      change: '+15%',
    },
  ]

  const postsWithLocation = posts
    .filter((post) => post.location && post.location.latitude && post.location.longitude && post.status !== 'rejected')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalPages = Math.max(1, Math.ceil(postsWithLocation.length / POSTS_PER_PAGE))
  const pageStart = (currentPage - 1) * POSTS_PER_PAGE
  const recentPosts = postsWithLocation.slice(pageStart, pageStart + POSTS_PER_PAGE)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [currentPage, totalPages])

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
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
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
                    <MapView posts={posts} selectedPostId={selectedPostId} onPostUpdated={fetchData} />
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
                  {recentPosts.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-white text-center py-4">
                      {t('dashboard.noPostsWithLocations')}
                    </p>
                  ) : (
                    recentPosts.map((post) => (
                      <div
                        key={post._id || post.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectPost(post._id || post.id || '', post.status)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectPost(post._id || post.id || '', post.status)}
                        className={`border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer ${
                          selectedPostId === (post._id || post.id)
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sm dark:text-white text-text line-clamp-1 flex-1 min-w-0">
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleCompletePost(post._id || post.id || '', e)}
                              disabled={completingPostId === (post._id || post.id) || post.status === 'completed'}
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
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: `${
                                  post.status === 'published' || post.status === 'completed'
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
                {postsWithLocation.length > POSTS_PER_PAGE && (
                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t('common.previous')}
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t('common.pageOf', { current: currentPage, total: totalPages })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
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
