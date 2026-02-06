/**
 * WhatsApp Business API (Facebook Graph API) – send text messages.
 * Uses env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v22.0'

export interface SendWhatsAppMessageOptions {
  /** Recipient phone number in E.164 format (e.g. "201234567890") – no + prefix */
  to: string
  /** Message text body (max 4096 characters for Cloud API) */
  text: string
}

export interface SendWhatsAppMessageResult {
  messaging_product: string
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

/**
 * Sends a WhatsApp text message via the Facebook Graph API.
 * Callable from server-side only (e.g. when a post is set to processing, the posts API calls this with the category’s linked number).
 * Note: Only works within the 24-hour messaging window unless you use a pre-approved template to start the conversation.
 *
 * @param options - Recipient (to) and message text
 * @returns Graph API response or throws on error
 */
export async function sendWhatsAppMessage(
  options: SendWhatsAppMessageOptions
): Promise<SendWhatsAppMessageResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID ?? '914748435065807'

  if (!token) {
    throw new Error(
      'WhatsApp API is not configured: WHATSAPP_ACCESS_TOKEN is missing'
    )
  }

  const { to, text } = options
  const body = {
    messaging_product: 'whatsapp',
    to: to.replace(/\D/g, ''),
    type: 'text',
    text: { body: text },
  }

  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      data.error?.message ?? data.error?.error_user_msg ?? response.statusText
    throw new Error(`WhatsApp API error: ${message}`)
  }

  return data as SendWhatsAppMessageResult
}

/** @deprecated Use sendWhatsAppMessage. Kept for backward compatibility. */
export async function sendWhatsAppTemplate(options: {
  to: string
  templateName?: string
  languageCode?: string
  components?: unknown[]
}): Promise<SendWhatsAppMessageResult> {
  return sendWhatsAppMessage({
    to: options.to,
    text: 'You have a new report to process.',
  })
}
