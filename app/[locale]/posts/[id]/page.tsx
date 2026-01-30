'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import api from '@/lib/api'
import Layout from '@/components/Layout'
import ImageModal from '@/components/ImageModal'
import { ArrowLeft, Edit, MapPin, Copy, Check } from 'lucide-react'
import { format } from 'date-fns'
import { generateArabicMessage } from '@/lib/maps'

interface Post {
  _id?: string
  id?: string
  title: string
  content?: string | null
  authorId?: string
  authorName?: string
  status: string
  priority: string
  category?: string
  tags?: string[]
  images?: { localUrl: string; publicUrl: string }[]
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
  createdAt: string
  updatedAt: string
  publishedAt?: string
  reviewedBy?: string
  reviewedAt?: string
}

export default function PostDetailPage() {
  const t = useTranslations()
  const params = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [imageViewerIndex, setImageViewerIndex] = useState(0)

  const postId = (params?.id as string) || ''

  useEffect(() => {
    if (!postId) return
    fetchPost()
  }, [postId])

  const fetchPost = async () => {
    try {
      const response = await api.get(`/posts/${postId}`)
      const data = response?.result ?? response?.data?.result ?? response
      setPost(Array.isArray(data) ? null : data)
    } catch (error) {
      console.error('Error fetching post:', error)
    } finally {
      setLoading(false)
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

  const handleCopyUrl = async () => {
    if (!post?.location) return

    const message = generateArabicMessage({
      title: post.title,
      content: post.content ?? '',
      category: post.category || 'road',
      location: post.location,
    })
    
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">{t('common.loading')}</div>
      </Layout>
    )
  }

  if (!post) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-300">{t('common.error')}</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/posts"
            className="flex items-center gap-2 text-text dark:text-gray-100 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('posts.backToReports')}
          </Link>
          <Link href={`/posts/${post._id || post.id}/edit`} className="btn-primary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            {t('posts.editPost')}
          </Link>
        </div>

        <div className="card space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-text dark:text-gray-100 mb-4">{post.title}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                {getStatusBadge(post.status)}
                {getPriorityBadge(post.priority)}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 pt-6 space-y-4">
            {(post.content != null && post.content !== '') && (
              <div>
                <label className="label">{t('posts.contentLabel')}</label>
                <div className="prose max-w-none text-text dark:text-gray-100 whitespace-pre-wrap">
                  {post.content}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('posts.authorLabel')}</label>
                <p className="text-text dark:text-gray-100">{post.authorName?.trim() || '—'}</p>
              </div>
              <div>
                <label className="label">{t('posts.createdAtLabel')}</label>
                <p className="text-text dark:text-gray-100">
                  {format(new Date(post.createdAt), 'PPpp')}
                </p>
              </div>
              <div>
                <label className="label">{t('posts.updatedAtLabel')}</label>
                <p className="text-text dark:text-gray-100">
                  {format(new Date(post.updatedAt), 'PPpp')}
                </p>
              </div>
              {post.publishedAt && (
                <div>
                  <label className="label">Published At</label>
                  <p className="text-text dark:text-gray-100">
                    {format(new Date(post.publishedAt), 'PPpp')}
                  </p>
                </div>
              )}
            </div>

            {post.tags && post.tags.length > 0 && (
              <div>
                <label className="label">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="badge bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {post.images && post.images.length > 0 && (
              <div>
                <label className="label">Images</label>
                <div className="flex flex-wrap gap-3">
                  {post.images.map((img, index) => {
                    const src = img.publicUrl || (img.localUrl?.startsWith('http') ? img.localUrl : null)
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (src) {
                            setImageViewerIndex(index)
                            setImageViewerOpen(true)
                          }
                        }}
                        className="relative rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        {src ? (
                          <img
                            src={src}
                            alt=""
                            className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg border border-dashed border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 dark:text-gray-300">
                            Local only
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                <ImageModal
                  open={imageViewerOpen}
                  onClose={() => setImageViewerOpen(false)}
                  images={post.images
                    .map((img) => img.publicUrl || (img.localUrl?.startsWith('http') ? img.localUrl : null))
                    .filter(Boolean) as string[]}
                  currentIndex={imageViewerIndex}
                  onIndexChange={setImageViewerIndex}
                  alt={post.title}
                />
              </div>
            )}

            {post.location && (
              <div>
                <label className="label">Location</label>
                <div className="space-y-2">
                  {post.location.address?.trim() && (
                    <p className="text-text dark:text-gray-100 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      {post.location.address}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>Coordinates:</span>
                    <span className="font-mono">
                      {Number(post.location.latitude).toFixed(6)}, {Number(post.location.longitude).toFixed(6)}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium transition-colors border border-blue-200 dark:border-blue-500/50"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        <span>Copy Google Maps URL</span>
                        <Copy className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
