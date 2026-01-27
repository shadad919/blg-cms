'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import MapView from '@/components/MapView'
import { FileText, Clock, CheckCircle, Globe, MapPin, TrendingUp, Users } from 'lucide-react'
import { Post } from '@/lib/types'
import { format } from 'date-fns'
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
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    pendingPosts: 0,
    approvedPosts: 0,
    publishedPosts: 0,
  })
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(true)

  useEffect(() => {
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

    fetchData()
  }, [])

  const statCards = [
    {
      title: t('dashboard.totalPosts'),
      value: stats.totalPosts,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      change: '+12%',
    },
    {
      title: t('dashboard.pendingPosts'),
      value: stats.pendingPosts,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      change: '+5%',
    },
    {
      title: t('dashboard.approvedPosts'),
      value: stats.approvedPosts,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      change: '+8%',
    },
    {
      title: t('dashboard.publishedPosts'),
      value: stats.publishedPosts,
      icon: Globe,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      change: '+15%',
    },
  ]

  const recentPosts = posts
    .filter((post) => post.location && post.location.latitude && post.location.longitude)
    .slice(0, 5)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">{t('dashboard.title')}</h1>
              <p className="text-gray-600">{t('dashboard.overview')}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Last updated:</span>
              <span className="font-medium">{format(new Date(), 'MMM d, yyyy HH:mm')}</span>
            </div>
          </div>

          {/* Stats Cards */}
          {loading ? (
            <div className="text-center py-12">{t('common.loading')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <div key={index} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${card.bgColor} ${card.color} p-3 rounded-lg`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-medium text-success flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {card.change}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                      <p className="text-3xl font-bold text-text">{card.value}</p>
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
                  <h2 className="text-xl font-semibold">Posts Location Map</h2>
                </div>
                <div className="h-[500px] p-4">
                  {mapLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-gray-500">{t('common.loading')}</div>
                    </div>
                  ) : (
                    <MapView posts={posts} />
                  )}
                </div>
              </div>
            </div>

            {/* Recent Posts with Locations */}
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-text">Recent Posts</h2>
                </div>
                <div className="space-y-4">
                  {recentPosts.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No posts with locations yet
                    </p>
                  ) : (
                    recentPosts.map((post) => (
                      <div
                        key={post._id || post.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-sm text-text line-clamp-1">
                            {post.title}
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${
                                post.status === 'published'
                                  ? '#16A34A'
                                  : post.status === 'approved'
                                    ? '#1E3A8A'
                                    : post.status === 'pending'
                                      ? '#F59E0B'
                                      : '#DC2626'
                              }20`,
                              color:
                                post.status === 'published'
                                  ? '#16A34A'
                                  : post.status === 'approved'
                                    ? '#1E3A8A'
                                    : post.status === 'pending'
                                      ? '#F59E0B'
                                      : '#DC2626',
                            }}
                          >
                            {post.status}
                          </span>
                        </div>
                        {post.content && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{post.content}</p>
                        )}
                        {post.location && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {post.location.address ||
                                `${post.location.latitude.toFixed(4)}, ${post.location.longitude.toFixed(4)}`}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          {format(new Date(post.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card bg-gradient-to-br from-primary/5 to-primary/10">
                <h3 className="font-semibold text-text mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full btn-primary text-left flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Create New Post
                  </button>
                  <button className="w-full btn-secondary text-left flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Review Pending
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
