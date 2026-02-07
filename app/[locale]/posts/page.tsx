'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import api from '@/lib/api'
import { toast } from 'sonner'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { formatLocaleDate } from '@/lib/date-locale'

interface Post {
  _id?: string
  id?: string
  title?: string | null
  content?: string | null
  authorName?: string
  status: string
  priority: string
  category?: string
  createdAt: string
  updatedAt: string
  images?: Array<{ localUrl: string; publicUrl: string } | string>
}

export default function PostsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('status')
    if (status) setStatusFilter(status)
  }, [])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: '100' }
      if (statusFilter) params.status = statusFilter
      if (search.trim()) params.search = search.trim()

      const queryParams = new URLSearchParams(params).toString()
      const response = await api.get(`/posts?${queryParams}`)
      const result = response?.result ?? response?.data?.result ?? response
      const data = result?.data
      setPosts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    const delay = search.trim() ? 400 : 0
    const timer = setTimeout(() => fetchPosts(), delay)
    return () => clearTimeout(timer)
  }, [statusFilter, search, fetchPosts])

  const handleDelete = async (id: string) => {
    if (!confirm(t('posts.deleteConfirm'))) return

    try {
      await api.delete(`/posts/${id}`)
      toast.success(t('common.toast.deleteSuccess'))
      fetchPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error(t('common.toast.deleteError'))
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: t('posts.status.pending'), className: 'badge-warning' },
      processing: { label: t('posts.status.processing'), className: 'badge bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
      completed: { label: t('posts.status.completed'), className: 'badge-success' },
      approved: { label: t('posts.status.approved'), className: 'badge-success' },
      rejected: { label: t('posts.status.rejected'), className: 'badge-critical' },
      published: { label: t('posts.status.published'), className: 'badge-primary' },
    }
    const statusInfo = statusMap[status] || { label: status, className: 'badge bg-gray-100 dark:bg-gray-600 dark:text-gray-200' }
    return <span className={statusInfo.className}>{statusInfo.label}</span>
  }

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; className: string }> = {
      low: { label: t('posts.priority.low'), className: 'badge bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200' },
      medium: { label: t('posts.priority.medium'), className: 'badge-warning' },
      high: { label: t('posts.priority.high'), className: 'badge bg-orange-100 text-orange-700' },
      critical: { label: t('posts.priority.critical'), className: 'badge-critical' },
    }
    const priorityInfo = priorityMap[priority] || priorityMap.medium
    return <span className={priorityInfo.className}>{priorityInfo.label}</span>
  }

  // When using API search, posts are already filtered; client filter only when not sending search
  const filteredPosts = posts

  return (
    <ProtectedRoute>
      <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text dark:text-gray-100 mb-2">{t('posts.title')}</h1>
            <p className="text-gray-600 dark:text-gray-200">{t('posts.subtitle')}</p>
          </div>
          {/* <Link href="/posts/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('posts.createPost')}
          </Link> */}
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input min-w-[140px]"
            >
              <option value="">{t('map.allStatuses')}</option>
              <option value="pending">{t('posts.status.pending')}</option>
              <option value="processing">{t('posts.status.processing')}</option>
              <option value="completed">{t('posts.status.completed')}</option>
              {/* <option value="approved">{t('posts.status.approved')}</option> */}
              <option value="rejected">{t('posts.status.rejected')}</option>
              {/* <option value="published">{t('posts.status.published')}</option> */}
            </select>
          </div>
        </div>

        {/* Posts Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t('common.noData')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] table-fixed border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-start py-3 px-4 font-semibold text-text dark:text-gray-100 whitespace-nowrap w-[28%]">{t('posts.titleLabel')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-text dark:text-gray-100 whitespace-nowrap w-[14%]">{t('posts.authorLabel')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-text dark:text-gray-100 whitespace-nowrap w-[12%]">{t('posts.statusLabel')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-text dark:text-gray-100 whitespace-nowrap w-[12%]">{t('posts.priorityLabel')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-text dark:text-gray-100 whitespace-nowrap w-[14%]">{t('posts.tableCreated')}</th>
                    <th className="text-end py-3 px-4 font-semibold text-text dark:text-gray-100 whitespace-nowrap w-[20%]">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredPosts.map((post) => {
                    const postId = post._id ?? post.id ?? ''
                    return (
                      <tr key={postId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3 px-4 align-top text-start">
                          <div className="font-medium text-text dark:text-gray-100 truncate text-start min-w-0" title={(post.title ?? '').trim() || undefined}>
                            {(post.title ?? '').trim() || '—'}
                          </div>
                          {(post.content ?? '').trim() && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate text-start min-w-0" title={String(post.content).slice(0, 100)}>
                              {post.content}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap truncate align-top text-start min-w-0" title={(post.authorName ?? '').trim() || undefined}>
                          {(post.authorName ?? '').trim() || '—'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap align-top text-start">{getStatusBadge(post.status)}</td>
                        <td className="py-3 px-4 whitespace-nowrap align-top text-start">{getPriorityBadge(post.priority)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap align-top text-start">
                          {formatLocaleDate(post.createdAt, 'PP', locale)}
                        </td>
                        <td className="py-3 px-4 align-top text-end">
                          <div className="flex items-center justify-end gap-1 shrink-0">
                            <Link
                              href={`/posts/${postId}`}
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title={t('posts.postDetails')}
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/posts/${postId}/edit`}
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title={t('posts.editPost')}
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(postId)}
                              className="p-2 text-critical hover:bg-critical/10 rounded-lg transition-colors"
                              title={t('posts.deletePost')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
    </ProtectedRoute>
  )
}
