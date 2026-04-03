import type { PlannedSession } from './training'

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
