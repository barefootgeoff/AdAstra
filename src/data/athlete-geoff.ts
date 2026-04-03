import type { AthleteProfile } from '../models/athlete'

export const GEOFF: AthleteProfile = {
  id: 'geoff',
  name: 'Geoff',
  ftp: 290,
  maxHR: 183,
  weight: 83,
  targetWeight: 82,
  ctlBaseline: 51,
  ctlTarget: 82,
  primarySport: 'cycling',
  goals: [
    {
      name: 'Leadville 100 MTB',
      date: '2026-08-15',
      targetTime: 'sub-9hr',
      priority: 'A',
    },
  ],
  coachBriefing: "Training for Leadville 100 MTB 2026, goal sub-9 hours. This is my first 100-miler. I tend to go too hard on easy days — hold me accountable. Can only train before 6am on weekdays; weekends are flexible. Wife and 2 kids, so training has to fit around family.",
  updatedAt: '2026-03-15',
}
