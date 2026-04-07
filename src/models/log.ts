import type { WorkoutType } from './training'

export interface PlannedRef {
  planId: string
  week: number
  day: string  // "Mon", "Tue", etc.
}

export interface WorkoutLog {
  id: string
  date: string              // "2026-03-16" ISO date
  plannedRef?: PlannedRef
  type: WorkoutType
  completed: boolean
  skipped: boolean
  durationMinutes?: number
  avgWatts?: number
  normalizedWatts?: number  // NP (normalized power)
  avgHR?: number
  peakHR?: number
  rpe?: number              // 1–10 rating of perceived exertion
  actualTSS?: number        // calculated from NP or entered manually
  totalElevationGain?: number  // meters, from Strava activity summary
  distanceMeters?: number      // meters, from Strava activity summary
  notes?: string
  loggedAt: string          // ISO datetime
}
