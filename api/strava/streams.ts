import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_session'
import type { Interval } from '../../src/models/interval'

// ─── Strava stream types ──────────────────────────────────────────────────────

interface StreamData {
  data: (number | null)[]
  series_type: string
  resolution: string
}

interface Streams {
  watts?: StreamData
  heartrate?: StreamData
  time?: StreamData
}

// ─── Cookie helpers (duplicated from activities.ts for isolation) ─────────────

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    }),
  )
}

async function getAccessToken(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie)
  let accessToken = cookies.strava_access_token
  const refreshToken = cookies.strava_refresh_token
  const expiry = parseInt(cookies.strava_token_expiry ?? '0', 10)

  if (!refreshToken) return null

  if (!accessToken || Date.now() / 1000 > expiry - 60) {
    const refreshRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!refreshRes.ok) return null
    const data = await refreshRes.json() as { access_token: string; expires_at: number }
    accessToken = data.access_token
    const base = 'HttpOnly; Secure; SameSite=Lax; Path=/'
    res.setHeader('Set-Cookie', [
      `strava_access_token=${accessToken}; Max-Age=21600; ${base}`,
      `strava_token_expiry=${data.expires_at}; Max-Age=31536000; ${base}`,
    ])
  }

  return accessToken
}

// ─── Interval detection ───────────────────────────────────────────────────────

function rollingAvg(data: number[], windowSec: number): number[] {
  const half = Math.floor(windowSec / 2)
  return data.map((_, i) => {
    const start = Math.max(0, i - half)
    const end = Math.min(data.length, i + half + 1)
    const slice = data.slice(start, end)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

function detectIntervals(
  watts: (number | null)[],
  heartrate: (number | null)[] | undefined,
  ftp: number,
): Interval[] {
  const threshold = ftp * 0.88  // sweetspot+
  const cleanWatts = watts.map(w => w ?? 0)
  const smoothed = rollingAvg(cleanWatts, 30)

  // Find contiguous segments above threshold
  type Segment = { start: number; end: number }
  const segments: Segment[] = []
  let inSeg = false
  let segStart = 0

  for (let i = 0; i < smoothed.length; i++) {
    if (!inSeg && smoothed[i] >= threshold) {
      inSeg = true
      segStart = i
    } else if (inSeg && smoothed[i] < threshold) {
      segments.push({ start: segStart, end: i - 1 })
      inSeg = false
    }
  }
  if (inSeg) segments.push({ start: segStart, end: smoothed.length - 1 })

  // Merge segments with gaps < 30 seconds
  const merged: Segment[] = []
  for (const seg of segments) {
    if (merged.length > 0 && seg.start - merged[merged.length - 1].end < 30) {
      merged[merged.length - 1].end = seg.end
    } else {
      merged.push({ ...seg })
    }
  }

  // Filter to >= 60 seconds and compute metrics
  return merged
    .filter(s => s.end - s.start >= 60)
    .map((s, i) => {
      const slice = cleanWatts.slice(s.start, s.end + 1)
      const avgWatts = Math.round(slice.reduce((a, b) => a + b, 0) / slice.length)
      const maxWatts = Math.max(...slice)
      const durationSec = s.end - s.start + 1
      const IF = avgWatts / ftp
      const tss = Math.round((durationSec * avgWatts * IF) / (ftp * 3600) * 100)

      let avgHR: number | undefined
      if (heartrate) {
        const hrSlice = heartrate.slice(s.start, s.end + 1).filter((h): h is number => h != null)
        if (hrSlice.length > 0) {
          avgHR = Math.round(hrSlice.reduce((a, b) => a + b, 0) / hrSlice.length)
        }
      }

      return { index: i + 1, startSec: s.start, durationSec, avgWatts, maxWatts, avgHR, tss }
    })
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.status(405).end(); return }
  if (!requireAuth(req, res)) return

  const activityId = req.query.activityId as string
  const ftp = parseInt((req.query.ftp as string) ?? '290', 10)

  if (!activityId) { res.status(400).json({ error: 'missing_activityId' }); return }

  const accessToken = await getAccessToken(req, res)
  if (!accessToken) { res.status(401).json({ error: 'strava_not_connected' }); return }

  try {
    const streamsRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=watts,heartrate,time&key_by_type=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!streamsRes.ok) {
      res.status(streamsRes.status).json({ error: 'strava_streams_failed' })
      return
    }

    const streams = await streamsRes.json() as Streams
    const watts = streams.watts?.data
    const heartrate = streams.heartrate?.data

    if (!watts) {
      // No power data (HR-only activity or no power meter)
      res.status(200).json({ intervals: [] })
      return
    }

    const intervals = detectIntervals(watts, heartrate, ftp)
    res.status(200).json({ intervals })
  } catch (err) {
    console.error('strava/streams error:', err)
    res.status(500).json({ error: 'internal_error' })
  }
}
