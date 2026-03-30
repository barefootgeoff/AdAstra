import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error } = req.query

  if (error || !code) {
    res.redirect('/?strava=denied')
    return
  }

  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'Strava env vars not configured' })
    return
  }

  try {
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      res.redirect('/?strava=error')
      return
    }

    const data = await tokenRes.json() as {
      access_token: string
      refresh_token: string
      expires_at: number
    }

    // Store tokens in HTTP-only cookies (6h access token, 1yr refresh)
    const secure = 'Secure; '
    const base = `HttpOnly; ${secure}SameSite=Lax; Path=/`
    res.setHeader('Set-Cookie', [
      `strava_access_token=${data.access_token}; Max-Age=21600; ${base}`,
      `strava_refresh_token=${data.refresh_token}; Max-Age=31536000; ${base}`,
      `strava_token_expiry=${data.expires_at}; Max-Age=31536000; ${base}`,
    ])

    res.redirect('/?strava=connected')
  } catch {
    res.redirect('/?strava=error')
  }
}
