import { useState } from 'react'
import type { TrainingWeek } from '../../models/training'
import type { WorkoutLog } from '../../models/log'
import { DayCard } from './DayCard'
import { planDateToISO } from '../../utils/dateHelpers'

interface Props {
  week: TrainingWeek
  planId: string
  defaultOpen?: boolean
  logs: WorkoutLog[]
  athleteFTP: number
  onSaveLog: (log: WorkoutLog) => void
}

export function WeekBlock({ week, planId, defaultOpen = false, logs, athleteFTP, onSaveLog }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  // Count completed sessions this week
  const completedCount = week.days.filter(day => {
    const iso = planDateToISO(day.date, week.dates)
    return logs.some(l => l.date === iso && l.completed)
  }).length
  const totalTraining = week.days.filter(d => d.type !== 'rest').length

  return (
    <div className="mb-4">
      <div
        className="flex items-center justify-between bg-zinc-800/80 border border-zinc-700 rounded-lg p-4 cursor-pointer hover:bg-zinc-800 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-lg font-mono">W{week.week}</span>
            <span className="text-zinc-400 text-sm">{week.dates}</span>
            <span className="bg-zinc-700 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium">
              {week.phase}
            </span>
            {completedCount > 0 && (
              <span className="text-green-500 text-[10px] font-mono">
                {completedCount}/{totalTraining}
              </span>
            )}
          </div>
          {week.note && <div className="text-zinc-500 text-xs mt-1">{week.note}</div>}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <div className="text-zinc-500">TSS</div>
            <div className="text-zinc-300 font-mono">{week.projectedTSS}</div>
          </div>
          <div className="text-right">
            <div className="text-zinc-500">CTL</div>
            <div className="text-zinc-300 font-mono">{week.projectedCTL}</div>
          </div>
          <span className="text-zinc-500 ml-2">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="mt-2 space-y-2 pl-2">
          {week.days.map((day, i) => {
            const iso = planDateToISO(day.date, week.dates)
            const existingLog = logs.find(l => l.date === iso) ?? null
            return (
              <DayCard
                key={i}
                session={day}
                planId={planId}
                isoDate={iso}
                existingLog={existingLog}
                athleteFTP={athleteFTP}
                onSaveLog={onSaveLog}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
