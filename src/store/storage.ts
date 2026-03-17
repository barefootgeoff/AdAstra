import type { AthleteProfile } from '../models/athlete'
import type { WorkoutLog } from '../models/log'
import type { TrainingPlan } from '../models/training'

const KEYS = {
  ATHLETE: 'adastra:athlete',
  LOGS: 'adastra:logs',
  PLANS: 'adastra:plans',
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

export function deleteWorkoutLog(id: string): void {
  const logs = getWorkoutLogs().filter(l => l.id !== id)
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs))
}

// ─── Training plans ───────────────────────────────────────────────────────────
export function getTrainingPlans(): TrainingPlan[] {
  try {
    const raw = localStorage.getItem(KEYS.PLANS)
    return raw ? (JSON.parse(raw) as TrainingPlan[]) : []
  } catch {
    return []
  }
}

export function saveTrainingPlan(plan: TrainingPlan): void {
  const plans = getTrainingPlans()
  const idx = plans.findIndex(p => p.id === plan.id)
  if (idx >= 0) {
    plans[idx] = plan
  } else {
    plans.push(plan)
  }
  localStorage.setItem(KEYS.PLANS, JSON.stringify(plans))
}
