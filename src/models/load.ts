export interface TrainingLoad {
  date: string      // "2026-03-16" ISO date
  dailyTSS: number
  ctl: number       // chronic training load (fitness) — 42-day EWA
  atl: number       // acute training load (fatigue) — 7-day EWA
  tsb: number       // training stress balance (form) = CTL - ATL
}
