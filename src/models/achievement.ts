export type AchievementType =
  | 'power_pr'
  | 'type_power_pr'
  | 'biggest_tss'
  | 'longest_ride'
  | 'rpe_warrior'
  | 'beat_plan'
  | 'streak_3'

export interface Achievement {
  id: string            // e.g. "power_pr-2026-04-03"
  type: AchievementType
  earnedDate: string    // ISO date
  logId: string         // which ride triggered it
  emoji: string
  label: string
  flavor: string        // e.g. "New best: 287W NP"
  value?: number        // numeric value for sorting/display (watts, minutes, TSS)
}
