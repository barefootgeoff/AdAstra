import type { AthleteProfile } from '../models/athlete'
import type { WorkoutLog } from '../models/log'
import type { Achievement } from '../models/achievement'

const KEYS = {
  ATHLETE: 'adastra:athlete',
  LOGS: 'adastra:logs',
  ACHIEVEMENTS: 'adastra:achievements',
} as const

// ─── Athlete ──────────────────────────────────────────────────────────────────
export function getAthleteProfile(): AthleteProfile | null {
  try {
    const raw = localStorage.getItem(KEYS.ATHLETE)
    return raw ? (JSON.parse(raw) as AthleteProfile) : null
  } catch {
    return null
  }
}

export function saveAthleteProfile(profile: AthleteProfile): void {
  localStorage.setItem(KEYS.ATHLETE, JSON.stringify(profile))
}

// ─── Workout logs ─────────────────────────────────────────────────────────────
export function getWorkoutLogs(): WorkoutLog[] {
  try {
    const raw = localStorage.getItem(KEYS.LOGS)
    return raw ? (JSON.parse(raw) as WorkoutLog[]) : []
  } catch {
    return []
  }
}

export function upsertWorkoutLog(log: WorkoutLog): void {
  const logs = getWorkoutLogs()
  const idx = logs.findIndex(l => l.id === log.id)
  if (idx >= 0) {
    logs[idx] = log
  } else {
    logs.push(log)
  }
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs))
}

export function bulkUpsertWorkoutLogs(incoming: WorkoutLog[]): void {
  const logs = getWorkoutLogs()
  const byId = new Map(logs.map(l => [l.id, l]))
  for (const log of incoming) byId.set(log.id, log)
  localStorage.setItem(KEYS.LOGS, JSON.stringify([...byId.values()]))
}

export function deleteWorkoutLog(id: string): void {
  const logs = getWorkoutLogs().filter(l => l.id !== id)
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs))
}

// ─── Achievements ─────────────────────────────────────────────────────────────
export function getAchievements(): Achievement[] {
  try {
    const raw = localStorage.getItem(KEYS.ACHIEVEMENTS)
    return raw ? (JSON.parse(raw) as Achievement[]) : []
  } catch {
    return []
  }
}

export function addAchievements(incoming: Achievement[]): void {
  if (!incoming.length) return
  const existing = getAchievements()
  const byId = new Map(existing.map(a => [a.id, a]))
  for (const a of incoming) {
    if (!byId.has(a.id)) byId.set(a.id, a)
  }
  localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify([...byId.values()]))
}

