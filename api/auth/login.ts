import type { VercelRequest, VercelResponse } from '@vercel/node'
import { setSessionCookie } from '../_session.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { password } = req.body as { password?: string }
  const expected = process.env.APP_PASSWORD

  if (!expected || password !== expected) {
    res.status(401).json({ error: 'invalid_password' })
    return
  }

  setSessionCookie(res)
  res.status(200).json({ ok: true })
}
