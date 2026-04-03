import { kv } from '@vercel/kv'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from './_session.js'
import { isStravaConnected } from './_stravaToken.js'
import type { AthleteProfile } from '../src/models/athlete'
import type { WorkoutLog } from '../src/models/log'

const KEYS = {
  ATHLETE: 'athlete',
  LOGS: 'logs',
  PLAN_OVERRIDES: 'plan-overrides',
} as const

// ─── GET /api/data ─────────────────────────────────────────────────────────
// Returns { athlete, logs, planOverrides, stravaConnected }
async function handleGet(res: VercelResponse) {
  const [athlete, logs, planOverrides, stravaConnected] = await Promise.all([
    kv.get<AthleteProfile>(KEYS.ATHLETE),
    kv.get<WorkoutLog[]>(KEYS.LOGS),
    kv.get<object[]>(KEYS.PLAN_OVERRIDES),
    isStravaConnected(),
  ])
  res.status(200).json({ athlete: athlete ?? null, logs: logs ?? [], planOverrides: planOverrides ?? [], stravaConnected })
}

// ─── PUT /api/data?resource=athlete ────────────────────────────────────────
async function handlePutAthlete(req: VercelRequest, res: VercelResponse) {
  const athlete = req.body as AthleteProfile
  if (!athlete?.id) {
    res.status(400).json({ error: 'invalid_athlete' })
    return
  }
  await kv.set(KEYS.ATHLETE, athlete)
  res.status(200).json({ ok: true })
}

// ─── PUT /api/data?resource=logs ───────────────────────────────────────────
// Bulk upserts: merges incoming logs with existing by id
async function handlePutLogs(req: VercelRequest, res: VercelResponse) {
  const incoming = req.body as WorkoutLog[]
  if (!Array.isArray(incoming)) {
    res.status(400).json({ error: 'expected_array' })
    return
  }
  const existing = (await kv.get<WorkoutLog[]>(KEYS.LOGS)) ?? []
  const byId = new Map(existing.map(l => [l.id, l]))
  for (const log of incoming) byId.set(log.id, log)
  await kv.set(KEYS.LOGS, [...byId.values()])
  res.status(200).json({ ok: true })
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return

  try {
    if (req.method === 'GET') {
      await handleGet(res)
    } else if (req.method === 'PUT') {
      const resource = req.query.resource as string
      if (resource === 'athlete') await handlePutAthlete(req, res)
      else if (resource === 'logs') await handlePutLogs(req, res)
      else if (resource === 'plan-overrides') {
        const overrides = req.body
        if (!Array.isArray(overrides)) { res.status(400).json({ error: 'expected_array' }); return }
        await kv.set(KEYS.PLAN_OVERRIDES, overrides)
        res.status(200).json({ ok: true })
      }
      else res.status(400).json({ error: 'unknown_resource' })
    } else {
      res.status(405).end()
    }
  } catch (err) {
    console.error('api/data error:', err)
    res.status(500).json({ error: 'internal_error' })
  }
}
