import type { WorkoutLog } from '../../models/log'
import type { WorkoutType } from '../../models/training'

const TYPE_LABEL: Record<WorkoutType, string> = {
  vo2:       'VO₂',
  threshold: 'THR',
  sweetspot: 'SS',
  strength:  'STR',
  endurance: 'END',
  rest:      'REST',
  race:      'RACE',
}

const TYPE_BADGE: Record<WorkoutType, string> = {
  vo2:       'bg-red-900/60 text-red-300',
  threshold: 'bg-orange-900/60 text-orange-300',
  sweetspot: 'bg-amber-900/60 text-amber-300',
  strength:  'bg-purple-900/60 text-purple-300',
  endurance: 'bg-blue-900/60 text-blue-300',
  rest:      'bg-zinc-800 text-zinc-400',
  race:      'bg-yellow-900/60 text-yellow-300',
}

interface Props {
  log: WorkoutLog
  onOpen: (logId: string) => void
}

export function SecondaryLogCard({ log, onOpen }: Props) {
  return (
    <div
      onClick={() => onOpen(log.id)}
      className="ml-6 bg-zinc-900/40 border border-zinc-800/60 rounded-md px-3 py-2 cursor-pointer hover:bg-zinc-900/70 hover:border-zinc-700 transition-colors flex items-center gap-2"
    >
      <span className={`${TYPE_BADGE[log.type]} text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider`}>
        {TYPE_LABEL[log.type]}
      </span>
      <span className="text-zinc-300 text-xs truncate flex-1">
        {log.notes || 'Extra workout'}
      </span>
      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 shrink-0">
        {log.durationMinutes != null && <span>{log.durationMinutes}min</span>}
        {log.actualTSS != null && <span>{log.actualTSS} TSS</span>}
      </div>
      <span className="text-zinc-600 text-[10px]">↗</span>
    </div>
  )
}
