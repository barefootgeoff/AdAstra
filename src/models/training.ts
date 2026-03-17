export type WorkoutType =
  | 'vo2'
  | 'threshold'
  | 'sweetspot'
  | 'strength'
  | 'endurance'
  | 'race'
  | 'rest'

export interface PlannedSession {
  day: string       // "Mon"
  date: string      // "3/16"
  type: WorkoutType
  label: string
  details: string[]
  duration?: string // "80–90 min"
  tss?: string      // "~85"
  fuel?: string
  alt?: string      // if-not-fresh variant
  why?: string      // coaching rationale
}

export interface TrainingWeek {
  week: number
  dates: string       // "Mar 16–22, 2026"
  phase: string       // "VO₂ Introduction"
  note?: string
  projectedTSS: string
  projectedCTL: string
  days: PlannedSession[]
}

export interface TrainingPlan {
  id: string
  name: string
  athleteId: string
  raceDate: string    // "2026-08-15"
  weeks: TrainingWeek[]
  createdAt: string
}
