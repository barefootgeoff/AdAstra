import { kv } from '@vercel/kv'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_session'
import type { ChatMessage } from '../../src/models/chat'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') { res.status(405).end(); return }
  if (!requireAuth(req, res)) return

  const { logId, messages } = req.body as { logId: string; messages: ChatMessage[] }
  if (!logId) { res.status(400).json({ error: 'missing_logId' }); return }

  try {
    await kv.set(`chat:${logId}`, messages)
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('chat/messages error:', err)
    res.status(500).json({ error: 'internal_error' })
  }
}
