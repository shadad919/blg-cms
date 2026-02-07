/**
 * WhatsApp – DISABLED (commented out).
 * Re-enable by uncommenting the block below and restoring imports in posts.ts and settings.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

export interface SendWhatsAppMessageOptions {
  to: string
  text: string
}

export interface SendWhatsAppTemplateOptions {
  to: string
  name: string
  params?: string[]
  languageCode?: string
}

export interface SendWhatsAppMessageResult {
  messaging_product: string
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

export async function sendWhatsAppMessage(
  _options: SendWhatsAppMessageOptions
): Promise<SendWhatsAppMessageResult> {
  throw new Error('WhatsApp is disabled')
}

export async function sendWhatsAppTemplate(
  _options: SendWhatsAppTemplateOptions
): Promise<SendWhatsAppMessageResult> {
  throw new Error('WhatsApp is disabled')
}

/*
// ========== Original WhatsApp implementation (disabled) ==========
const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'

export async function sendWhatsAppMessage(options: SendWhatsAppMessageOptions): Promise<SendWhatsAppMessageResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '914748435065807'
  if (!token) throw new Error('WhatsApp API is not configured: WHATSAPP_ACCESS_TOKEN is missing')
  const { to, text } = options
  const toNormalized = to.replace(/\D/g, '')
  if (!toNormalized) throw new Error('WhatsApp: recipient phone number is missing or invalid (no digits)')
  if (!text?.trim()) throw new Error('WhatsApp: message text is required')
  const body = { messaging_product: 'whatsapp', to: toNormalized, text: { body: text.trim() } }
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`WhatsApp API error: ${data.error?.message ?? response.statusText}`)
  return data as SendWhatsAppMessageResult
}

export async function sendWhatsAppTemplate(options: SendWhatsAppTemplateOptions): Promise<SendWhatsAppMessageResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '914748435065807'
  if (!token) throw new Error('WhatsApp API is not configured: WHATSAPP_ACCESS_TOKEN is missing')
  const { to, name, params = [], languageCode = 'en_US' } = options
  const toNormalized = to.replace(/\D/g, '')
  if (!toNormalized) throw new Error('WhatsApp: recipient phone number is missing or invalid (no digits)')
  const template: { name: string; language: { code: string }; components?: Array<{ type: 'body'; parameters: Array<{ type: 'text'; text: string }> }> } = {
    name,
    language: { code: languageCode },
  }
  if (params.length > 0) {
    template.components = [{ type: 'body', parameters: params.map((p) => ({ type: 'text' as const, text: p })) }]
  }
  const body = { messaging_product: 'whatsapp', to: toNormalized, type: 'template', template }
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`WhatsApp API error: ${data.error?.message ?? response.statusText}`)
  return data as SendWhatsAppMessageResult
}
*/
