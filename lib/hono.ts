import { hc } from 'hono/client'
import type { AppType } from '@/app/api/[[...route]]/route'

export const apiClient = hc<AppType>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
