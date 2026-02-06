import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { ApiResponse, WhatsappSettingsDoc, type PostCategory } from '@/lib/types'
import { authenticateAdmin } from '@/lib/auth-middleware'
import { getSettingsCollection } from '@/lib/mongodb'
import { WithId } from 'mongodb'

const WHATSAPP_SETTINGS_NAME = 'whatsapp_settings'

const CATEGORIES: PostCategory[] = [
  'road',
  'electricity',
  'street_light',
  'building',
  'wall',
  'water',
  'mine',
]

function defaultCategories(): Partial<Record<PostCategory, { phone: string; linked: boolean }>> {
  const out: Partial<Record<PostCategory, { phone: string; linked: boolean }>> = {}
  for (const c of CATEGORIES) {
    out[c] = { phone: '', linked: false }
  }
  return out
}

const categorySettingSchema = z.object({
  phone: z.string(),
  linked: z.boolean(),
})

const updateWhatsappSchema = z.object({
  categories: z.record(z.string(), categorySettingSchema),
})

const settings = new Hono()

/** GET /api/settings/whatsapp – get whatsapp_settings doc; create with defaults if missing (admin only) */
settings.get('/whatsapp', authenticateAdmin, async (c) => {
  try {
    const collection = await getSettingsCollection()
    let doc = await collection.findOne({ name: WHATSAPP_SETTINGS_NAME })
    const now = new Date().toISOString()
    if (!doc) {
      const defaultDoc = {
        name: WHATSAPP_SETTINGS_NAME,
        categories: defaultCategories(),
        createdAt: now,
        updatedAt: now,
      }
      await collection.insertOne(defaultDoc)
      doc = defaultDoc as unknown as WithId<Document>
    }
    const result: WhatsappSettingsDoc = {
      name: doc!.name,
      categories: { ...defaultCategories(), ...doc!.categories },
      createdAt: doc!.createdAt,
      updatedAt: doc!.updatedAt,
    }
    return c.json<ApiResponse<WhatsappSettingsDoc>>(
      {
        result,
        result_message: {
          title: 'Success',
          type: 'OK',
          message: 'WhatsApp settings retrieved',
        },
      },
      200
    )
  } catch (error) {
    console.error('GET settings/whatsapp error:', error)
    return c.json<ApiResponse>(
      {
        result: null,
        result_message: {
          title: 'Error',
          type: 'ERROR',
          message: 'Failed to get WhatsApp settings',
        },
      },
      500
    )
  }
})

/** PATCH /api/settings/whatsapp – create or update whatsapp_settings (admin only) */
settings.patch(
  '/whatsapp',
  authenticateAdmin,
  zValidator('json', updateWhatsappSchema),
  async (c) => {
    try {
      const { categories } = c.req.valid('json')
      const collection = await getSettingsCollection()
      const now = new Date().toISOString()
      const doc = await collection.findOne({ name: WHATSAPP_SETTINGS_NAME })
      const mergedCategories = { ...defaultCategories(), ...categories }
      if (!doc) {
        await collection.insertOne({
          name: WHATSAPP_SETTINGS_NAME,
          categories: mergedCategories,
          createdAt: now,
          updatedAt: now,
        })
      } else {
        await collection.updateOne(
          { name: WHATSAPP_SETTINGS_NAME },
          { $set: { categories: mergedCategories, updatedAt: now } }
        )
      }
      const result: WhatsappSettingsDoc = {
        name: WHATSAPP_SETTINGS_NAME,
        categories: mergedCategories,
        createdAt: doc?.createdAt ?? now,
        updatedAt: now,
      }
      return c.json<ApiResponse<WhatsappSettingsDoc>>(
        {
          result,
          result_message: {
            title: 'Success',
            type: 'OK',
            message: 'WhatsApp settings saved',
          },
        },
        200
      )
    } catch (error) {
      console.error('PATCH settings/whatsapp error:', error)
      return c.json<ApiResponse>(
        {
          result: null,
          result_message: {
            title: 'Error',
            type: 'ERROR',
            message: 'Failed to save WhatsApp settings',
          },
        },
        500
      )
    }
  }
)

settings.post('/whatsapp', async (c) => {
  try {
    const body = c.req.json()
    console.log('body:', body)
    return c.json<ApiResponse>(
      {
        result: true,
        result_message: {
          title: 'Success',
          type: 'OK',
          message: 'WhatsApp message sent',
        },
      }, 200)
  } catch (error) {
    console.error('POST settings/whatsapp error:', error)
  }
})

export default settings
