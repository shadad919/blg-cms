'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Lock, Mail } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const t = useTranslations()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string || 'en'
  const { setAuth, isAuthenticated } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      router.push(`/${locale}/dashboard`)
    }
  }, [isAuthenticated, router, locale])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setLoading(true)

    try {
      const response = await api.post('/admin/login', data)

      if (response.result && response.result.admin && response.result.token) {
        setAuth(response.result.admin, response.result.token)
        router.push(`/${locale}/dashboard`)
      } else {
        setError(t('auth.invalidCredentials'))
      }
    } catch (err: any) {
      setError(t('auth.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              {t('auth.loginTitle')}
            </h1>
            <p className="text-gray-600">{t('auth.loginSubtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-critical/10 border border-critical text-critical px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="label">
                <Mail className="inline w-4 h-4 mr-2" />
                {t('common.email')}
              </label>
              <input
                type="email"
                {...register('email')}
                className="input"
                placeholder="admin@example.com"
              />
              {errors.email && (
                <p className="text-critical text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                <Lock className="inline w-4 h-4 mr-2" />
                {t('common.password')}
              </label>
              <input
                type="password"
                {...register('password')}
                className="input"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-critical text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? t('common.loading') : t('common.login')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
