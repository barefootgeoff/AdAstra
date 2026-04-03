/**
 * Target CTL curve for Leadville build.
 *
 * Shape:
 *  seedDate → (peakDate = raceDate − 28d): sigmoid ramp from startCTL to peakCTL
 *  peakDate → raceDate:                    linear taper from peakCTL to raceCTL
 *
 * peakCTL ≈ raceCTL × 1.13  (taper brings CTL down ~12% while TSB recovers)
 */

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) /
    86_400_000,
  )
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Normalised sigmoid 0→1 over [0,1] with a gentle S shape
function sigmoidNorm(t: number): number {
  const k = 8 // steepness
  const sig = (x: number) => 1 / (1 + Math.exp(-k * (x - 0.5)))
  return (sig(t) - sig(0)) / (sig(1) - sig(0))
}

export function targetCTLForDate(
  date: string,
  seedDate: string,
  raceDate: string,
  startCTL: number,
  raceCTL: number,
): number {
  const peakCTL = Math.round(raceCTL * 1.13)
  const peakDate = addDays(raceDate, -28)
  const buildDays = daysBetween(seedDate, peakDate)
  const taperDays = 28

  const dFromSeed = daysBetween(seedDate, date)

  if (dFromSeed <= 0) return startCTL
  if (date >= raceDate) return raceCTL

  if (date < peakDate) {
    const t = Math.min(dFromSeed / buildDays, 1)
    return startCTL + (peakCTL - startCTL) * sigmoidNorm(t)
  }

  // Taper
  const dFromPeak = daysBetween(peakDate, date)
  const t = dFromPeak / taperDays
  return peakCTL - (peakCTL - raceCTL) * t
}

export interface TargetPoint {
  date: string
  targetCtl: number
}

/** Generate one point per week from seedDate to raceDate (inclusive). */
export function buildTargetCTLSeries(
  seedDate: string,
  raceDate: string,
  startCTL: number,
  raceCTL: number,
): TargetPoint[] {
  const points: TargetPoint[] = []
  const totalDays = daysBetween(seedDate, raceDate)
  // Weekly resolution is enough for the chart target line
  for (let d = 0; d <= totalDays; d += 7) {
    const date = addDays(seedDate, d)
    points.push({
      date,
      targetCtl: Math.round(targetCTLForDate(date, seedDate, raceDate, startCTL, raceCTL) * 10) / 10,
    })
  }
  // Always include race day exactly
  const last = points[points.length - 1]
  if (last?.date !== raceDate) {
    points.push({
      date: raceDate,
      targetCtl: Math.round(targetCTLForDate(raceDate, seedDate, raceDate, startCTL, raceCTL) * 10) / 10,
    })
  }
  return points
}
