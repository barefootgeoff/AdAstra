import type { WorkoutLog } from '../models/log'
import type { Achievement, AchievementType } from '../models/achievement'

function make(
  type: AchievementType,
  log: WorkoutLog,
  emoji: string,
  label: string,
  flavor: string,
  value?: number,
): Achievement {
  return {
    id: `${type}-${log.date}`,
    type,
    earnedDate: log.date,
    logId: log.id,
    emoji,
    label,
    flavor,
    value,
  }
}

export function computeAwards(
  current: WorkoutLog,
  allLogs: WorkoutLog[],
  plannedTSS?: number,
): Achievement[] {
  if (!current.completed) return []

  const prior = allLogs.filter(l => l.completed && l.date < current.date)
  const awards: Achievement[] = []

  // ── Power PR (NP across all rides) ──────────────────────────────────────────
  if (current.normalizedWatts != null) {
    const priorMax = prior.reduce((m, l) => Math.max(m, l.normalizedWatts ?? 0), 0)
    if (current.normalizedWatts > priorMax) {
      awards.push(make('power_pr', current, '⚡', 'Power PR',
        `New best: ${current.normalizedWatts}W NP`, current.normalizedWatts))
    }
  }

  // ── Type power PR ────────────────────────────────────────────────────────────
  if (current.normalizedWatts != null) {
    const priorType = prior.filter(l => l.type === current.type)
    if (priorType.length > 0) {
      const priorTypeMax = priorType.reduce((m, l) => Math.max(m, l.normalizedWatts ?? 0), 0)
      if (current.normalizedWatts > priorTypeMax) {
        const typeName = current.type.charAt(0).toUpperCase() + current.type.slice(1)
        awards.push(make('type_power_pr', current, '🎯', `${typeName} Power PR`,
          `Best NP for ${current.type} sessions`, current.normalizedWatts))
      }
    }
  }

  // ── Biggest TSS day ──────────────────────────────────────────────────────────
  if (current.actualTSS != null) {
    const priorMax = prior.reduce((m, l) => Math.max(m, l.actualTSS ?? 0), 0)
    if (current.actualTSS > priorMax) {
      awards.push(make('biggest_tss', current, '🏋️', 'Biggest Day',
        `${current.actualTSS} TSS — new record`, current.actualTSS))
    }
  }

  // ── Longest ride ─────────────────────────────────────────────────────────────
  if (current.durationMinutes != null) {
    const priorMax = prior.reduce((m, l) => Math.max(m, l.durationMinutes ?? 0), 0)
    if (current.durationMinutes > priorMax) {
      const h = Math.floor(current.durationMinutes / 60)
      const m = current.durationMinutes % 60
      const timeStr = h > 0 ? `${h}h ${m}min` : `${m}min`
      awards.push(make('longest_ride', current, '🕐', 'Longest Ride',
        `${timeStr} — new record`, current.durationMinutes))
    }
  }

  // ── RPE Warrior ──────────────────────────────────────────────────────────────
  if (current.rpe != null && current.rpe >= 9) {
    awards.push(make('rpe_warrior', current, '🔥', 'RPE Warrior',
      `RPE ${current.rpe}/10 — went to the limit`, current.rpe))
  }

  // ── Beat the plan ────────────────────────────────────────────────────────────
  if (current.actualTSS != null && plannedTSS != null && plannedTSS > 0 &&
      current.actualTSS >= plannedTSS * 1.05) {
    awards.push(make('beat_plan', current, '📈', 'Exceeded Target',
      `${current.actualTSS} TSS vs ${plannedTSS} planned`, current.actualTSS))
  }

  // ── 3-day streak ─────────────────────────────────────────────────────────────
  const sortedAll = [...allLogs].sort((a, b) => a.date.localeCompare(b.date))
  const idx = sortedAll.findIndex(l => l.date === current.date)
  if (idx >= 2) {
    const last3 = sortedAll.slice(idx - 2, idx + 1)
    if (last3.length === 3 && last3.every(l => l.completed)) {
      awards.push(make('streak_3', current, '🔗', '3-Day Streak',
        'Three days in a row — consistency wins'))
    }
  }

  return awards
}
