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
  updatedAt: '2026-03-15',
}
