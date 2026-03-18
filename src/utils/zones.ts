import type { PowerZone, HRZone } from '../models/athlete'

// ─── Coggan 7-zone power model ────────────────────────────────────────────────
const POWER_ZONE_DEFS: Array<{ number: PowerZone['number']; name: string; minPct: number; maxPct: number }> = [
  { number: 1, name: 'Active Recovery', minPct: 0,   maxPct: 55  },
  { number: 2, name: 'Endurance',       minPct: 55,  maxPct: 75  },
  { number: 3, name: 'Tempo',           minPct: 75,  maxPct: 90  },
  { number: 4, name: 'Threshold',       minPct: 90,  maxPct: 105 },
  { number: 5, name: 'VO₂max',         minPct: 105, maxPct: 120 },
  { number: 6, name: 'Anaerobic',       minPct: 120, maxPct: 150 },
  { number: 7, name: 'Neuromuscular',   minPct: 150, maxPct: 999 },
]

export function calculatePowerZones(ftp: number): PowerZone[] {
  return POWER_ZONE_DEFS.map(z => ({
    number: z.number,
    name: z.name,
    minPct: z.minPct,
    maxPct: z.maxPct,
    minWatts: Math.round(ftp * z.minPct / 100),
    maxWatts: z.maxPct === 999 ? Infinity : Math.round(ftp * z.maxPct / 100),
  }))
}

// ─── 5-zone HR model (% of max HR) ───────────────────────────────────────────
const HR_ZONE_DEFS: Array<{ number: HRZone['number']; name: string; minPct: number; maxPct: number }> = [
  { number: 1, name: 'Recovery',  minPct: 0,  maxPct: 68 },
  { number: 2, name: 'Aerobic',   minPct: 68, maxPct: 75 },
  { number: 3, name: 'Tempo',     minPct: 75, maxPct: 83 },
  { number: 4, name: 'Threshold', minPct: 83, maxPct: 91 },
  { number: 5, name: 'VO₂max',   minPct: 91, maxPct: 100 },
]

export function calculateHRZones(maxHR: number): HRZone[] {
  return HR_ZONE_DEFS.map(z => ({
    number: z.number,
    name: z.name,
    minPct: z.minPct,
    maxPct: z.maxPct,
    minBPM: Math.round(maxHR * z.minPct / 100),
    maxBPM: Math.round(maxHR * z.maxPct / 100),
  }))
}
