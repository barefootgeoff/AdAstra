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

// ─── Ride-level metric helpers ───────────────────────────────────────────────
// Each returns null when inputs are missing or invalid.

export function calculateWork(avgWatts?: number, durationSec?: number): number | null {
  if (!avgWatts || !durationSec || avgWatts <= 0 || durationSec <= 0) return null
  return (avgWatts * durationSec) / 1000
}

export function calculateIF(np?: number, ftp?: number): number | null {
  if (!np || !ftp || np <= 0 || ftp <= 0) return null
  return np / ftp
}

export function calculateVI(np?: number, avgWatts?: number): number | null {
  if (!np || !avgWatts || np <= 0 || avgWatts <= 0) return null
  return np / avgWatts
}

export function calculateEF(np?: number, avgHR?: number): number | null {
  if (!np || !avgHR || np <= 0 || avgHR <= 0) return null
  return np / avgHR
}

export function calculateWPerKg(avgWatts?: number, weightKg?: number): number | null {
  if (!avgWatts || !weightKg || avgWatts <= 0 || weightKg <= 0) return null
  return avgWatts / weightKg
}

export function calculateVAM(elevationM?: number, durationSec?: number): number | null {
  if (!elevationM || !durationSec || elevationM <= 0 || durationSec <= 0) return null
  return (elevationM / durationSec) * 3600
}

export interface RideMetrics {
  work: number | null           // kJ
  intensityFactor: number | null
  variabilityIndex: number | null
  efficiencyFactor: number | null
  wPerKg: number | null
  totalElevationGain: number | null  // m (passthrough)
  vam: number | null            // m/h
}

export function computeRideMetrics(
  log: WorkoutLog,
  athlete: { ftp: number; weight: number },
): RideMetrics {
  const durationSec = log.durationMinutes ? log.durationMinutes * 60 : undefined
  return {
    work: calculateWork(log.avgWatts, durationSec),
    intensityFactor: calculateIF(log.normalizedWatts, athlete.ftp),
    variabilityIndex: calculateVI(log.normalizedWatts, log.avgWatts),
    efficiencyFactor: calculateEF(log.normalizedWatts, log.avgHR),
    wPerKg: calculateWPerKg(log.avgWatts, athlete.weight),
    totalElevationGain: log.totalElevationGain ?? null,
    vam: calculateVAM(log.totalElevationGain, durationSec),
  }
}

// ─── Days until a target date ─────────────────────────────────────────────────
export function daysUntil(targetISODate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetISODate + 'T00:00:00')
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}
