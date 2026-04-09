import type { WorkoutLog } from '../models/log'
import type { WorkoutType } from '../models/training'

const RIDE_TYPES: WorkoutType[] = ['vo2', 'threshold', 'sweetspot', 'endurance', 'race']

// Pick the log on `isoDate` that best matches the planned session type.
// For days with one or zero logs, returns the obvious answer. For multi-log
// days (e.g., yoga + bike ride), prefers exact type match, then family match
// (ride slot → any ride log; strength slot → any strength log), falling back
// to the first log on that date.
export function findLogForSession(
  logs: WorkoutLog[],
  isoDate: string,
  plannedType?: WorkoutType,
): WorkoutLog | null {
  const sameDay = logs.filter(l => l.date === isoDate)
  if (sameDay.length === 0) return null
  if (sameDay.length === 1 || !plannedType) return sameDay[0]

  const exact = sameDay.find(l => l.type === plannedType)
  if (exact) return exact

  if (RIDE_TYPES.includes(plannedType)) {
    const ride = sameDay.find(l => RIDE_TYPES.includes(l.type))
    if (ride) return ride
  }
  if (plannedType === 'strength') {
    const strength = sameDay.find(l => l.type === 'strength')
    if (strength) return strength
  }

  return sameDay[0]
}

// Return all logs on `isoDate` *other than* the primary one chosen by
// findLogForSession. Preserves original order.
export function findExtraLogs(
  logs: WorkoutLog[],
  isoDate: string,
  primaryId: string | undefined,
): WorkoutLog[] {
  return logs.filter(l => l.date === isoDate && l.id !== primaryId)
}
