'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import Layout from '@/components/Layout'
import { ArrowLeft, Edit, MapPin, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { generateArabicMessage } from '@/lib/maps'

interface Post {
  id: string
  title: string
  content: string
  authorId?: string
  authorName?: string
  status: 'pending' | 'approved' | 'rejected' | 'published'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category?: 'road' | 'electricity' | 'street_light' | 'building' | 'wall' | 'water' | 'mine'
  tags?: string[]
  images?: string[]
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
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchPost()
  }, [params.id])

  const fetchPost = async () => {
    try {
      const response = await api.get(`/posts/${params.id}`)
      setPost(response.data.result)
    } catch (error) {
      console.error('Error fetching post:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: t('posts.status.pending'), className: 'badge-warning' },
      approved: { label: t('posts.status.approved'), className: 'badge-success' },
      rejected: { label: t('posts.status.rejected'), className: 'badge-critical' },
      published: { label: t('posts.status.published'), className: 'badge-primary' },
    }
    const statusInfo = statusMap[status] || statusMap.pending
    return <span className={statusInfo.className}>{statusInfo.label}</span>
  }

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; className: string }> = {
      low: { label: t('posts.priority.low'), className: 'badge bg-gray-100 text-gray-700' },
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
      content: post.content,
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
          <p className="text-gray-500">{t('common.error')}</p>
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
            className="flex items-center gap-2 text-text hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Posts
          </Link>
          <Link href={`/posts/${post.id}/edit`} className="btn-primary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            {t('posts.editPost')}
          </Link>
        </div>

        <div className="card space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-text mb-4">{post.title}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                {getStatusBadge(post.status)}
                {getPriorityBadge(post.priority)}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div>
              <label className="label">{t('posts.contentLabel')}</label>
              <div className="prose max-w-none text-text whitespace-pre-wrap">
                {post.content}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('posts.authorLabel')}</label>
                <p className="text-text">{post.authorName || 'Unknown'}</p>
              </div>
              <div>
                <label className="label">{t('posts.createdAtLabel')}</label>
                <p className="text-text">
                  {format(new Date(post.createdAt), 'PPpp')}
                </p>
              </div>
              <div>
                <label className="label">{t('posts.updatedAtLabel')}</label>
                <p className="text-text">
                  {format(new Date(post.updatedAt), 'PPpp')}
                </p>
              </div>
              {post.publishedAt && (
                <div>
                  <label className="label">Published At</label>
                  <p className="text-text">
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
                      className="badge bg-gray-100 text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {post.location && (
              <div>
                <label className="label">Location</label>
                <div className="space-y-2">
                  {post.location.address && (
                    <p className="text-text flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      {post.location.address}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Coordinates:</span>
                    <span className="font-mono">
                      {post.location.latitude.toFixed(6)}, {post.location.longitude.toFixed(6)}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors border border-blue-200"
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
