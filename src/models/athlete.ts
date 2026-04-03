export type Sport = 'cycling' | 'running' | 'strength' | 'swimming'

export interface RaceGoal {
  name: string        // "Leadville 100 MTB"
  date: string        // "2026-08-15"
  targetTime?: string // "sub-9hr"
  priority: 'A' | 'B' | 'C'
}

export interface AthleteProfile {
  id: string
  name: string
  ftp: number          // watts
  maxHR: number        // bpm
  weight: number       // kg
  targetWeight?: number
  ctlBaseline: number  // CTL at plan start date
  ctlTarget: number    // race-day CTL goal
  primarySport: Sport
  goals: RaceGoal[]
  coachBriefing?: string
  updatedAt: string    // ISO date string
}

export interface PowerZone {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7
  name: string
  minWatts: number
  maxWatts: number   // Infinity for Z7
  minPct: number     // % of FTP
  maxPct: number
}

export interface HRZone {
  number: 1 | 2 | 3 | 4 | 5
  name: string
  minBPM: number
  maxBPM: number
  minPct: number     // % of max HR
  maxPct: number
}

export interface TrainingZones {
  ftp: number
  maxHR: number
  power: PowerZone[]
  hr: HRZone[]
}
