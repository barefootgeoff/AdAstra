import { kv } from '@vercel/kv'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_session'
import type { ChatMessage } from '../../src/models/chat'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return

  try {
    if (req.method === 'GET') {
      const logId = req.query.logId as string
      if (!logId) { res.status(400).json({ error: 'missing_logId' }); return }
      const messages = await kv.get<ChatMessage[]>(`chat:${logId}`)
      res.status(200).json({ messages: messages ?? [] })
    } else if (req.method === 'PUT') {
      const { logId, messages } = req.body as { logId: string; messages: ChatMessage[] }
      if (!logId) { res.status(400).json({ error: 'missing_logId' }); return }
      await kv.set(`chat:${logId}`, messages)
      res.status(200).json({ ok: true })
    } else {
      res.status(405).end()
    }
  } catch (err) {
    console.error('chat/messages error:', err)
    res.status(500).json({ error: 'internal_error' })
  }
}
