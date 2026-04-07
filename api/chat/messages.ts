import { kv } from '@vercel/kv'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_session.js'
import type { ChatMessage } from '../../src/models/chat'
import type { AthleteMemory } from '../../src/models/athlete'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return

  try {
    if (req.method === 'GET') {
      const logId = req.query.logId as string
      if (!logId) { res.status(400).json({ error: 'missing_logId' }); return }
      const messages = await kv.get<ChatMessage[]>(`chat:${logId}`)
      res.status(200).json({ messages: messages ?? [] })
    } else if (req.method === 'PUT') {
      const { logId, messages, memory } = req.body as {
        logId: string
        messages: ChatMessage[]
        memory?: AthleteMemory
      }
      if (!logId) { res.status(400).json({ error: 'missing_logId' }); return }

      const ops: Promise<unknown>[] = []

      // Persist chat messages (skip the __memory__ sentinel used by useAthleteMemory)
      if (logId !== '__memory__') {
        ops.push(kv.set(`chat:${logId}`, messages))
      }

      // Persist athlete memory if provided
      if (memory && Object.keys(memory).length > 0) {
        ops.push(kv.set('athlete:memory', memory))
      }

      await Promise.all(ops)
      res.status(200).json({ ok: true })
    } else {
      res.status(405).end()
    }
  } catch (err) {
    console.error('chat/messages error:', err)
    res.status(500).json({ error: 'internal_error' })
  }
}
