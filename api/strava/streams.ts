import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_session.js'
import type { Interval } from '../../src/models/interval'

// ─── Strava types ─────────────────────────────────────────────────────────────

interface StravaLap {
  lap_index: number
  moving_time: number
  elapsed_time: number
  average_watts?: number
  average_heartrate?: number
  max_heartrate?: number
  start_index: number   // index into activity stream
}

interface StreamData {
  data: (number | null)[]
}

interface Streams {
  watts?: StreamData
  heartrate?: StreamData
}

// ─── Token helper ─────────────────────────────────────────────────────────────

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

// ─── TSS calculation ──────────────────────────────────────────────────────────

function calcTSS(durationSec: number, avgWatts: number, ftp: number): number {
  if (ftp <= 0 || avgWatts <= 0 || durationSec <= 0) return 0
  const IF = avgWatts / ftp
  return Math.round((durationSec * avgWatts * IF) / (ftp * 3600) * 100)
}

// ─── Laps → Intervals ─────────────────────────────────────────────────────────

function lapsToIntervals(laps: StravaLap[], ftp: number): Interval[] {
  let cumulativeSec = 0
  return laps.map((lap, i) => {
    const avgWatts = lap.average_watts ? Math.round(lap.average_watts) : 0
    const startSec = cumulativeSec
    cumulativeSec += lap.moving_time
    return {
      index: i + 1,
      startSec,
      durationSec: lap.moving_time,
      avgWatts,
      avgHR: lap.average_heartrate ? Math.round(lap.average_heartrate) : undefined,
      tss: calcTSS(lap.moving_time, avgWatts, ftp),
    }
  })
}

// ─── Power stream fallback ────────────────────────────────────────────────────

function rollingAvg(data: number[], windowSec: number): number[] {
  const half = Math.floor(windowSec / 2)
  return data.map((_, i) => {
    const start = Math.max(0, i - half)
    const end = Math.min(data.length, i + half + 1)
    const slice = data.slice(start, end)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

function detectIntervalsFromStream(
  watts: (number | null)[],
  heartrate: (number | null)[] | undefined,
  ftp: number,
): Interval[] {
  const threshold = ftp * 0.88  // sweetspot+
  const cleanWatts = watts.map(w => w ?? 0)
  const smoothed = rollingAvg(cleanWatts, 30)

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

  // Merge gaps < 30s
  const merged: Segment[] = []
  for (const seg of segments) {
    if (merged.length > 0 && seg.start - merged[merged.length - 1].end < 30) {
      merged[merged.length - 1].end = seg.end
    } else {
      merged.push({ ...seg })
    }
  }

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
    // ── 1. Try Strava laps first ───────────────────────────────────────────────
    const lapsRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/laps`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (lapsRes.ok) {
      const laps = await lapsRes.json() as StravaLap[]
      // Use laps if: more than 1 lap AND at least one lap has power data
      const hasPower = laps.some(l => (l.average_watts ?? 0) > 0)
      if (laps.length > 1 && hasPower) {
        return res.status(200).json({ intervals: lapsToIntervals(laps, ftp), source: 'laps' })
      }
    }

    // ── 2. Fall back to power stream detection ────────────────────────────────
    const streamsRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=watts,heartrate&key_by_type=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!streamsRes.ok) {
      res.status(streamsRes.status).json({ error: 'strava_streams_failed' })
      return
    }

    const streams = await streamsRes.json() as Streams
    if (!streams.watts) {
      return res.status(200).json({ intervals: [], source: 'none' })
    }

    const intervals = detectIntervalsFromStream(streams.watts.data, streams.heartrate?.data, ftp)
    res.status(200).json({ intervals, source: 'stream' })

  } catch (err) {
    console.error('strava/streams error:', err)
    res.status(500).json({ error: 'internal_error' })
  }
}
