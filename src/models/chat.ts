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
