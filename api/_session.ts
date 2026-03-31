import { createHmac } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const COOKIE_NAME = 'adastra_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function computeToken(): string {
  const secret = process.env.SESSION_SECRET ?? 'dev-secret'
  const password = process.env.APP_PASSWORD ?? 'dev-password'
  return createHmac('sha256', secret).update(password).digest('hex')
}

export function setSessionCookie(res: VercelResponse): void {
  const token = computeToken()
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax; Path=/`,
  )
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Max-Age=0; HttpOnly; Secure; SameSite=Lax; Path=/`,
  )
}

export function isAuthenticated(req: VercelRequest): boolean {
  const cookies = parseCookies(req.headers.cookie)
  return cookies[COOKIE_NAME] === computeToken()
}

export function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): boolean {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    }),
  )
}
