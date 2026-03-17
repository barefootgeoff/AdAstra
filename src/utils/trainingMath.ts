import type { WorkoutLog } from '../models/log'
import type { TrainingLoad } from '../models/load'

// ─── TSS ─────────────────────────────────────────────────────────────────────
// TSS = (durationSecs × NP × IF) / (FTP × 3600) × 100
// where IF (Intensity Factor) = NP / FTP
export function calculateTSS(
  durationSecs: number,
  normalizedWatts: number,
  ftp: number,
): number {
  if (ftp <= 0 || normalizedWatts <= 0 || durationSecs <= 0) return 0
  const IF = normalizedWatts / ftp
  return (durationSecs * normalizedWatts * IF) / (ftp * 3600) * 100
}

// ─── CTL / ATL / TSB ─────────────────────────────────────────────────────────
// Exponential weighted average with time constant τ:
//   new = prev + (1 − e^(−1/τ)) × (today − prev)
// CTL τ = 42 days (chronic / fitness)
// ATL τ = 7  days (acute / fatigue)

const CTL_LAMBDA = 1 - Math.exp(-1 / 42)
const ATL_LAMBDA = 1 - Math.exp(-1 / 7)

export function calculateCTL(prevCTL: number, todayTSS: number): number {
  return prevCTL + CTL_LAMBDA * (todayTSS - prevCTL)
}

export function calculateATL(prevATL: number, todayTSS: number): number {
  return prevATL + ATL_LAMBDA * (todayTSS - prevATL)
}

export function calculateTSB(ctl: number, atl: number): number {
  return ctl - atl
}

// ─── Load history builder ─────────────────────────────────────────────────────
// Builds a continuous daily CTL/ATL/TSB record from a set of workout logs.
// seedDate: the day BEFORE the first log (i.e., baseline state).
// Fills zero-TSS days between logged workouts so the EWA decays correctly.
export function buildLoadHistory(
  logs: WorkoutLog[],
  seedDate: string,
  seedCTL: number,
  seedATL: number,
): TrainingLoad[] {
  if (logs.length === 0) return []

  // Sort logs by date ascending
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))

  // Group by date (sum TSS if multiple logs on same day)
  const byDate = new Map<string, number>()
  for (const log of sorted) {
    const tss = log.actualTSS ?? 0
    byDate.set(log.date, (byDate.get(log.date) ?? 0) + tss)
  }

  const result: TrainingLoad[] = []
  let ctl = seedCTL
  let atl = seedATL
  let cursor = nextDay(seedDate)
  const lastDate = sorted[sorted.length - 1].date

  while (cursor <= lastDate) {
    const dailyTSS = byDate.get(cursor) ?? 0
    ctl = calculateCTL(ctl, dailyTSS)
    atl = calculateATL(atl, dailyTSS)
    result.push({
      date: cursor,
      dailyTSS,
      ctl: round2(ctl),
      atl: round2(atl),
      tsb: round2(ctl - atl),
    })
    cursor = nextDay(cursor)
  }

  return result
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nextDay(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─── Days until a target date ─────────────────────────────────────────────────
export function daysUntil(targetISODate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetISODate + 'T00:00:00')
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}
