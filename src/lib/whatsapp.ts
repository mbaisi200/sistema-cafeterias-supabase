const META_API_BASE = 'https://graph.facebook.com/v22.0';

interface WhatsAppConfig {
  phone_number_id: string;
  access_token: string;
}

interface SendMessageResponse {
  messaging_product: 'whatsapp';
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  to: string,
  text: string,
): Promise<{ waMessageId: string } | null> {
  try {
    const res = await fetch(
      `${META_API_BASE}/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/\D/g, ''),
          type: 'text',
          text: { preview_url: false, body: text },
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[WhatsApp] Send error:', res.status, errBody);
      return null;
    }

    const data: SendMessageResponse = await res.json();
    return { waMessageId: data.messages?.[0]?.id || '' };
  } catch (error) {
    console.error('[WhatsApp] Send exception:', error);
    return null;
  }
}

export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  expectedToken: string,
): string | null {
  if (mode === 'subscribe' && token === expectedToken && challenge) {
    return challenge;
  }
  return null;
}

export function parseWebhookPayload(body: any): {
  empresa_id?: string;
  from: string;
  fromName?: string;
  messageBody: string;
  waMessageId: string;
  timestamp: string;
} | null {
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const messages = value?.messages;
  const metadata = value?.metadata;

  if (!messages?.[0] || !metadata?.phone_number_id) return null;

  const msg = messages[0];
  const msgType = msg.type;

  if (msgType !== 'text' && msgType !== 'interactive') return null;

  const from = msg.from;
  const waMessageId = msg.id;
  const timestamp = msg.timestamp;

  let messageBody = '';
  if (msgType === 'text') {
    messageBody = msg.text?.body || '';
  } else if (msgType === 'interactive') {
    messageBody = msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title || '';
  }

  const profileName = value?.contacts?.[0]?.profile?.name || from;

  return {
    from,
    fromName: profileName,
    messageBody,
    waMessageId,
    timestamp,
  };
}
