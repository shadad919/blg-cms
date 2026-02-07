'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { toast } from 'sonner'
import Layout from '@/components/Layout'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

const postSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'rejected']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  tags: z.string().optional(),
})

type PostForm = z.infer<typeof postSchema>

export default function EditPostPage() {
  const t = useTranslations()
  const locale = useLocale()
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
  })

  useEffect(() => {
    fetchPost()
  }, [params.id])

  const fetchPost = async () => {
    try {
      const response = await api.get(`/posts/${params.id}`)
      const post = response.result 
      setValue('title', post.title)
      setValue('content', post.content)
      setValue('status', post.status)
      setValue('priority', post.priority)
      setValue('tags', post.tags?.join(', ') || '')
    } catch (error) {
      console.error('Error fetching post:', error)
    } finally {
      setFetching(false)
    }
  }

  const onSubmit = async (data: PostForm) => {
    setLoading(true)
    try {
      const updateData = {
        ...data,
        description: data.content ?? "",
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      }
      await api.patch(`/posts/${params.id}`, updateData)
      toast.success(t('common.toast.updateSuccess'))
      router.push(`/${locale}/posts/${params.id}`)
    } catch (error) {
      console.error('Error updating post:', error)
      toast.error(t('common.toast.updateError'))
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <Layout>
        <div className="text-center py-12">{t('common.loading')}</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Link
          href={`/posts/${params.id}`}
          className="flex items-center gap-2 text-text dark:text-gray-100 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('posts.backToReports')}
        </Link>

        <div className="card">
          <h1 className="text-3xl font-bold text-text dark:text-gray-100 mb-6">{t('posts.editPost')}</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="label">{t('posts.titleLabel')}</label>
              <input
                type="text"
                {...register('title')}
                className="input"
              />
              {errors.title && (
                <p className="text-critical text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="label">{t('posts.contentLabel')}</label>
              <textarea
                {...register('content')}
                rows={10}
                className="input"
              />
              {errors.content && (
                <p className="text-critical text-sm mt-1">{errors.content.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('posts.statusLabel')}</label>
                <select {...register('status')} className="input">
                  <option value="pending">{t('posts.status.pending')}</option>
                  <option value="processing">{t('posts.status.processing')}</option>
                  <option value="completed">{t('posts.status.completed')}</option>
                  <option value="rejected">{t('posts.status.rejected')}</option>
                </select>
              </div>

              <div>
                <label className="label">{t('posts.priorityLabel')}</label>
                <select {...register('priority')} className="input">
                  <option value="low">{t('posts.priority.low')}</option>
                  <option value="medium">{t('posts.priority.medium')}</option>
                  <option value="high">{t('posts.priority.high')}</option>
                  <option value="critical">{t('posts.priority.critical')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">{t('posts.tagsCommaSeparated')}</label>
              <input
                type="text"
                {...register('tags')}
                className="input"
                placeholder={t('posts.tagsPlaceholder')}
              />
            </div>

            <div className="flex items-center gap-4">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {loading ? t('common.loading') : t('common.save')}
              </button>
              <Link href={`/posts/${params.id}`} className="btn-secondary">
                {t('common.cancel')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
