import { Hono } from 'hono'
// import { zValidator } from '@hono/zod-validator'
// import { z } from 'zod'
// import { ApiResponse, WhatsappSettingsDoc, type PostCategory } from '@/lib/types'
// import { authenticateAdmin } from '@/lib/auth-middleware'
// import { getSettingsCollection } from '@/lib/mongodb'
// import { WithId } from 'mongodb'

// ========== WhatsApp disabled ==========
// const WHATSAPP_SETTINGS_NAME = 'whatsapp_settings'
// const CATEGORIES: PostCategory[] = [
//   'road', 'electricity', 'street_light', 'building', 'wall', 'water', 'mine',
// ]
// function defaultCategories(): Partial<Record<PostCategory, { phone: string; linked: boolean }>> {
//   const out: Partial<Record<PostCategory, { phone: string; linked: boolean }>> = {}
//   for (const c of CATEGORIES) { out[c] = { phone: '', linked: false }; }
//   return out
// }
// const categorySettingSchema = z.object({ phone: z.string(), linked: z.boolean() })
// const updateWhatsappSchema = z.object({ categories: z.record(z.string(), categorySettingSchema) })

const settings = new Hono()

// /** GET /api/settings/whatsapp */
// settings.get('/whatsapp', authenticateAdmin, async (c) => { ... })

// /** PATCH /api/settings/whatsapp */
// settings.patch('/whatsapp', authenticateAdmin, zValidator('json', updateWhatsappSchema), async (c) => { ... })

// settings.post('/whatsapp', async (c) => { ... })

export default settings
