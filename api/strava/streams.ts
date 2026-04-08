import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_session.js'
import { getStravaAccessToken } from '../_stravaToken.js'
import type { Interval } from '../../src/models/interval'

// ─── Strava types ─────────────────────────────────────────────────────────────

interface StravaLap {
  lap_index: number
  moving_time: number
  elapsed_time: number
  average_watts?: number
  average_heartrate?: number
  max_heartrate?: number
  average_cadence?: number
  start_index: number   // index into activity stream
}

interface StreamData {
  data: (number | null)[]
}

interface Streams {
  watts?: StreamData
  heartrate?: StreamData
  cadence?: StreamData
}

// ─── TSS calculation ──────────────────────────────────────────────────────────

function calcTSS(durationSec: number, avgWatts: number, ftp: number): number {
  if (ftp <= 0 || avgWatts <= 0 || durationSec <= 0) return 0
  const IF = avgWatts / ftp
  return Math.round((durationSec * avgWatts * IF) / (ftp * 3600) * 100)
}

// ─── Zone / pacing / NP helpers ───────────────────────────────────────────────

function classifyZone(avgWatts: number, ftp: number): Interval['zone'] {
  const pct = avgWatts / ftp
  if (pct >= 1.05) return 'vo2'
  if (pct >= 0.96) return 'threshold'
  return 'sweetspot'
}

function computePacingRatio(slice: number[]): number | undefined {
  if (slice.length < 10) return undefined
  const mid = Math.floor(slice.length / 2)
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const first = avg(slice.slice(0, mid))
  const second = avg(slice.slice(mid))
  return first > 0 ? Math.round((second / first) * 100) / 100 : undefined
}

// Normalized Power for a segment: 30s rolling avg → ^4 → mean → ^0.25
function computeNP(slice: number[]): number {
  if (slice.length === 0) return 0
  const smoothed = rollingAvg(slice, 30)
  const mean4th = smoothed.reduce((sum, w) => sum + Math.pow(w, 4), 0) / smoothed.length
  return Math.round(Math.pow(mean4th, 0.25))
}

function segmentCadence(
  cadence: (number | null)[] | undefined,
  start: number,
  end: number,
): number | undefined {
  if (!cadence) return undefined
  const slice = cadence.slice(start, end + 1).filter((c): c is number => c != null)
  return slice.length > 0 ? Math.round(slice.reduce((a, b) => a + b, 0) / slice.length) : undefined
}

// ─── Laps → Intervals ─────────────────────────────────────────────────────────

function lapsToIntervals(laps: StravaLap[], ftp: number): Interval[] {
  let cumulativeSec = 0
  return laps.map((lap, i) => {
    const avgWatts = lap.average_watts ? Math.round(lap.average_watts) : 0
    const startSec = cumulativeSec
    cumulativeSec += lap.moving_time
    const intensityFactor = avgWatts > 0 && ftp > 0
      ? Math.round((avgWatts / ftp) * 100) / 100
      : undefined
    return {
      index: i + 1,
      startSec,
      durationSec: lap.moving_time,
      avgWatts,
      avgHR: lap.average_heartrate ? Math.round(lap.average_heartrate) : undefined,
      tss: calcTSS(lap.moving_time, avgWatts, ftp),
      zone: avgWatts > 0 ? classifyZone(avgWatts, ftp) : undefined,
      avgCadence: lap.average_cadence ? Math.round(lap.average_cadence) : undefined,
      intensityFactor,
      // pacingRatio and vi not computable from lap summaries alone
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
  cadence: (number | null)[] | undefined,
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

      const np = computeNP(slice)
      const vi = avgWatts > 0 ? Math.round((np / avgWatts) * 100) / 100 : undefined
      const intensityFactor = ftp > 0 ? Math.round((np / ftp) * 100) / 100 : undefined

      return {
        index: i + 1,
        startSec: s.start,
        durationSec,
        avgWatts,
        maxWatts,
        avgHR,
        tss,
        zone: classifyZone(avgWatts, ftp),
        pacingRatio: computePacingRatio(slice),
        avgCadence: segmentCadence(cadence, s.start, s.end),
        vi,
        intensityFactor,
      }
    })
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.status(405).end(); return }
  if (!requireAuth(req, res)) return

  const activityId = req.query.activityId as string
  const ftp = parseInt((req.query.ftp as string) ?? '290', 10)

  if (!activityId) { res.status(400).json({ error: 'missing_activityId' }); return }

  const accessToken = await getStravaAccessToken(req, res)
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
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=watts,heartrate,cadence&key_by_type=true`,
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

    const intervals = detectIntervalsFromStream(streams.watts.data, streams.heartrate?.data, streams.cadence?.data, ftp)
    res.status(200).json({ intervals, source: 'stream' })

  } catch (err) {
    console.error('strava/streams error:', err)
    res.status(500).json({ error: 'internal_error' })
  }
}
