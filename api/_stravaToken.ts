// Shared Strava token helper
// Cookie-first for speed; falls back to KV-stored refresh token so any
// authenticated device can call Strava without re-doing OAuth.

import { kv } from '@vercel/kv'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const KV_KEY = 'strava_tokens'

interface KVTokens {
  refreshToken: string
  accessToken: string
  expiresAt: number
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    }),
  )
}

function setCookies(res: VercelResponse, accessToken: string, expiresAt: number): void {
  const base = 'HttpOnly; Secure; SameSite=Lax; Path=/'
  res.setHeader('Set-Cookie', [
    `strava_access_token=${accessToken}; Max-Age=21600; ${base}`,
    `strava_token_expiry=${expiresAt}; Max-Age=31536000; ${base}`,
  ])
}

async function refreshToken(refreshTok: string): Promise<{ access_token: string; expires_at: number } | null> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshTok,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  return res.json() as Promise<{ access_token: string; expires_at: number }>
}

// Returns a valid Strava access token or null.
// Priority: cookie access token → refresh from cookie refresh token → refresh from KV token
export async function getStravaAccessToken(
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie)
  const now = Date.now() / 1000

  // ── Fast path: valid access token in cookie ───────────────────────────────
  if (cookies.strava_access_token && now < parseInt(cookies.strava_token_expiry ?? '0') - 60) {
    return cookies.strava_access_token
  }

  // ── Try refresh from cookie refresh token ────────────────────────────────
  const cookieRefresh = cookies.strava_refresh_token
  if (cookieRefresh) {
    const refreshed = await refreshToken(cookieRefresh)
    if (refreshed) {
      setCookies(res, refreshed.access_token, refreshed.expires_at)
      // Update KV so other devices get the new token too
      const existing = await kv.get<KVTokens>(KV_KEY)
      if (existing) {
        await kv.set(KV_KEY, {
          ...existing,
          accessToken: refreshed.access_token,
          expiresAt: refreshed.expires_at,
        })
      }
      return refreshed.access_token
    }
  }

  // ── Fall back to KV-stored refresh token (other device connected Strava) ──
  const stored = await kv.get<KVTokens>(KV_KEY)
  if (!stored?.refreshToken) return null

  // If stored access token is still valid, use it
  if (stored.accessToken && now < stored.expiresAt - 60) {
    setCookies(res, stored.accessToken, stored.expiresAt)
    return stored.accessToken
  }

  // Refresh using KV token
  const refreshed = await refreshToken(stored.refreshToken)
  if (!refreshed) return null

  // Persist updated tokens to KV and set cookies
  await kv.set(KV_KEY, {
    refreshToken: stored.refreshToken,
    accessToken: refreshed.access_token,
    expiresAt: refreshed.expires_at,
  })
  setCookies(res, refreshed.access_token, refreshed.expires_at)
  return refreshed.access_token
}

// Save tokens to KV after a fresh OAuth (call from auth/callback)
export async function saveStravaTokensToKV(
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
): Promise<void> {
  await kv.set(KV_KEY, { accessToken, refreshToken, expiresAt } satisfies KVTokens)
}

// Returns true if Strava has ever been connected (KV has tokens)
export async function isStravaConnected(): Promise<boolean> {
  const stored = await kv.get<KVTokens>(KV_KEY)
  return !!stored?.refreshToken
}
