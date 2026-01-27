'use client'

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import Layout from '@/components/Layout'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

const postSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  authorName: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  tags: z.string().optional(),
})

type PostForm = z.infer<typeof postSchema>

export default function NewPostPage() {
  const t = useTranslations()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      priority: 'medium',
    },
  })

  const onSubmit = async (data: PostForm) => {
    setLoading(true)
    try {
      const postData = {
        title: data.title,
        content: data.content,
        authorName: data.authorName,
        priority: data.priority,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      }
      const response = await api.post('/posts', postData)
      router.push(`/posts/${response.data.result.id}`)
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Link
          href="/posts"
          className="flex items-center gap-2 text-text hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Posts
        </Link>

        <div className="card">
          <h1 className="text-3xl font-bold text-text mb-6">{t('posts.createPost')}</h1>

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
                <label className="label">{t('posts.authorLabel')}</label>
                <input
                  type="text"
                  {...register('authorName')}
                  className="input"
                  placeholder="Optional"
                />
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
              <label className="label">Tags (comma-separated)</label>
              <input
                type="text"
                {...register('tags')}
                className="input"
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <div className="flex items-center gap-4">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {loading ? t('common.loading') : t('common.create')}
              </button>
              <Link href="/posts" className="btn-secondary">
                {t('common.cancel')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
