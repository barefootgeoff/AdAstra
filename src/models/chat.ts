import type { PlannedSession } from './training'

export type CoachTab = 'today' | 'plan' | 'fitness'

export interface TodayContext {
  session: {
    label: string
    type: string
    details: string[]
    tss?: string
    duration?: string
  } | null
  log: {
    actualTSS?: number
    normalizedWatts?: number
    avgHR?: number
    rpe?: number
    notes?: string
  } | null
  sessionDone: boolean
}

export interface PlanEditProposal {
  weekNum: number
  dayDate: string       // e.g. "4/3"
  description: string   // one-line human summary shown in approval UI
  changes: Partial<PlannedSession>
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string      // ISO datetime
  planEdits?: PlanEditProposal[]
  editsApplied?: boolean
}

export interface ChatThread {
  id: string            // e.g. "thread-1712345678901"
  label: string         // "Apr 6 · General" or "Apr 3 · Post-Ride: Easy Endurance"
  type: 'general' | 'ride'
  logId?: string        // set for ride-originated threads
  createdAt: string     // ISO datetime
  lastMessageAt: string // ISO datetime — for sorting
}
