import type { WorkoutLog } from '../../models/log'
import type { Achievement } from '../../models/achievement'
import { getQuote } from '../../utils/workoutQuotes'
import type { WorkoutType } from '../../models/training'

interface Props {
  log: WorkoutLog
  achievements: Achievement[]
  sessionType?: WorkoutType   // planned session type; overrides auto-classified log type for quote
}

export function WorkoutAwards({ log, achievements, sessionType }: Props) {
  const quote = getQuote(sessionType ?? (log.type as WorkoutType), log.date)
  const earned = achievements.filter(a => a.logId === log.id)

  return (
    <div className="mb-4 space-y-2">
      {/* Motivational quote */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
        <p className="text-zinc-400 text-sm italic leading-relaxed">"{quote}"</p>
      </div>

      {/* Awards — only rendered when earned */}
      {earned.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <div className="text-[10px] tracking-widest text-zinc-500 uppercase mb-2">Unlocked</div>
          <div className="space-y-1.5">
            {earned.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <span className="text-base leading-none">{a.emoji}</span>
                <div>
                  <span className="text-zinc-200 text-xs font-medium">{a.label}</span>
                  <span className="text-zinc-500 text-xs"> — {a.flavor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
