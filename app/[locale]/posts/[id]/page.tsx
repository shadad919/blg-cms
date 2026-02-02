'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import api from '@/lib/api'
import Layout from '@/components/Layout'
import ImageModal from '@/components/ImageModal'
import { ArrowLeft, Edit, MapPin, Copy, Check, X, XCircle } from 'lucide-react'
import { formatLocaleDate } from '@/lib/date-locale'
import { generateArabicMessage } from '@/lib/maps'
import AddressDisplay from '@/components/AddressDisplay'

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
  rejectionReason?: string
}

export default function PostDetailPage() {
  const t = useTranslations()
  const params = useParams()
  const locale = useLocale()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [imageViewerIndex, setImageViewerIndex] = useState(0)
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null)

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
      // approved: { label: t('posts.status.approved'), className: 'badge-success' },
      rejected: { label: t('posts.status.rejected'), className: 'badge-critical' },
      // published: { label: t('posts.status.published'), className: 'badge-primary' },
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

  const closeRejectModal = () => {
    setRejectModalOpen(false)
    setRejectReason('')
    setRejectingPostId(null)
  }

  const handleConfirmReject = async () => {
    if (!postId) return
    setRejectingPostId(postId)
    try {
      await api.patch(`/posts/${postId}`, {
        status: 'rejected',
        rejectionReason: rejectReason.trim() || undefined,
      })
      await fetchPost()
      closeRejectModal()
    } catch (e) {
      console.error('Failed to reject post:', e)
    } finally {
      setRejectingPostId(null)
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
          <div className="flex items-center gap-2">
            {post.status !== 'rejected' && (
              <button
                type="button"
                onClick={() => { setRejectReason(''); setRejectModalOpen(true) }}
                className="inline-flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg font-medium transition-colors"
              >
                <XCircle className="w-4 h-4" />
                {t('posts.rejectPost')}
              </button>
            )}
            <Link href={`/posts/${post._id || post.id}/edit`} className="btn-primary flex items-center gap-2">
              <Edit className="w-4 h-4" />
              {t('posts.editPost')}
            </Link>
          </div>
        </div>

        <div className="card space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-text dark:text-gray-100 mb-4">{post.title}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                {getStatusBadge(post.status)}
                {getPriorityBadge(post.priority)}
              </div>
              {post.status === 'rejected' && post.rejectionReason && (
                <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">{t('posts.rejectionReasonLabel')}</p>
                  <p className="text-sm text-red-700 dark:text-red-200 whitespace-pre-wrap">{post.rejectionReason}</p>
                </div>
              )}
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
                  {formatLocaleDate(post.createdAt, 'PPpp', locale)}
                </p>
              </div>
              <div>
                <label className="label">{t('posts.updatedAtLabel')}</label>
                <p className="text-text dark:text-gray-100">
                  {formatLocaleDate(post.updatedAt, 'PPpp', locale)}
                </p>
              </div>
              {post.publishedAt && (
                <div>
                  <label className="label">{t('posts.publishedAtLabel')}</label>
                  <p className="text-text dark:text-gray-100">
                    {formatLocaleDate(post.publishedAt, 'PPpp', locale)}
                  </p>
                </div>
              )}
            </div>

            {post.tags && post.tags.length > 0 && (
              <div>
                <label className="label">{t('posts.tagsLabel')}</label>
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
                  <p className="text-text dark:text-gray-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                    <AddressDisplay
                      latitude={post.location.latitude}
                      longitude={post.location.longitude}
                      existingAddress={post.location.address}
                      language={locale}
                      inline
                      className="min-w-0"
                    />
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMapModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30 rounded-lg font-medium transition-colors border border-primary/30"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>{t('map.showOnMap')}</span>
                    </button>
                    <button
                      onClick={handleCopyUrl}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium transition-colors border border-blue-200 dark:border-blue-500/50"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{t('common.copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>{t('map.copyGoogleMapsUrl')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {mapModalOpen && (
                  <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="map-modal-title"
                    onClick={() => setMapModalOpen(false)}
                  >
                    <div
                      className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <h2 id="map-modal-title" className="text-lg font-semibold text-text dark:text-white">
                          {t('map.locationMapTitle')}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setMapModalOpen(false)}
                          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                          aria-label={t('common.cancel')}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex-1 min-h-[400px] relative">
                        <iframe
                          title={t('map.locationMapTitle')}
                          src={`https://www.google.com/maps?q=${Number(post.location.latitude)},${Number(post.location.longitude)}&z=15&output=embed`}
                          className="absolute inset-0 w-full h-full border-0"
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
      </div>
    </Layout>
  )
}
