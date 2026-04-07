import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStravaAccessToken } from './_stravaToken.js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  start_date: string          // ISO 8601 (UTC)
  start_date_local?: string   // ISO 8601 in athlete's local timezone
  moving_time: number         // seconds
  elapsed_time: number        // seconds
  weighted_average_watts?: number  // NP equivalent
  average_watts?: number
  average_heartrate?: number
  max_heartrate?: number
  suffer_score?: number
  total_elevation_gain?: number    // meters
}

// Matches WorkoutLog in src/models/log.ts
interface WorkoutLog {
  id: string
  date: string
  type: WorkoutType
  completed: boolean
  skipped: boolean
  durationMinutes?: number
  avgWatts?: number
  normalizedWatts?: number
  avgHR?: number
  peakHR?: number
  actualTSS?: number
  totalElevationGain?: number
  notes?: string
  loggedAt: string
}

type WorkoutType = 'vo2' | 'threshold' | 'sweetspot' | 'endurance' | 'strength' | 'race' | 'rest'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Classify workout type by Intensity Factor (NP / FTP)
function classifyType(sport: string, np: number | undefined, ftp: number): WorkoutType {
  const lowerSport = sport.toLowerCase()
  if (lowerSport.includes('weight') || lowerSport.includes('crossfit')) return 'strength'
  if (lowerSport.includes('race')) return 'race'

  if (!np || ftp <= 0) return 'endurance'
  const IF = np / ftp
  if (IF >= 1.05) return 'vo2'
  if (IF >= 0.91) return 'threshold'
  if (IF >= 0.75) return 'sweetspot'
  return 'endurance'
}

// TSS = (durationSecs × NP × IF) / (FTP × 3600) × 100
function calcTSS(durationSecs: number, np: number, ftp: number): number {
  if (ftp <= 0 || np <= 0 || durationSecs <= 0) return 0
  const IF = np / ftp
  return Math.round((durationSecs * np * IF) / (ftp * 3600) * 100)
}

function mapActivity(act: StravaActivity, ftp: number): WorkoutLog {
  const np = act.weighted_average_watts ?? act.average_watts
  // Strava's start_date is UTC; start_date_local is the athlete's local clock.
  // We match plan days by local calendar date, so prefer start_date_local.
  const date = (act.start_date_local ?? act.start_date).slice(0, 10)
  const tss = np ? calcTSS(act.moving_time, np, ftp) : undefined

  return {
    id: `strava-${act.id}`,
    date,
    type: classifyType(act.sport_type || act.type, np, ftp),
    completed: true,
    skipped: false,
    durationMinutes: Math.round(act.moving_time / 60),
    avgWatts: act.average_watts ? Math.round(act.average_watts) : undefined,
    normalizedWatts: np ? Math.round(np) : undefined,
    avgHR: act.average_heartrate ? Math.round(act.average_heartrate) : undefined,
    peakHR: act.max_heartrate ? Math.round(act.max_heartrate) : undefined,
    actualTSS: tss,
    totalElevationGain: act.total_elevation_gain != null ? Math.round(act.total_elevation_gain) : undefined,
    notes: act.name,
    loggedAt: act.start_date,
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const accessToken = await getStravaAccessToken(req, res)
  if (!accessToken) {
    res.status(401).json({ error: 'not_connected' })
    return
  }

  // Optional: ?after=unix_timestamp to limit how far back we fetch
  const after = req.query.after ? `&after=${req.query.after}` : ''
  const ftp = parseInt((req.query.ftp as string) ?? '290', 10)

  try {
    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=100${after}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!activitiesRes.ok) {
      res.status(activitiesRes.status).json({ error: 'strava_fetch_failed' })
      return
    }

    const activities = await activitiesRes.json() as StravaActivity[]
    const logs = activities.map(a => mapActivity(a, ftp))

    res.status(200).json({ logs })
  } catch {
    res.status(500).json({ error: 'internal_error' })
  }
}
