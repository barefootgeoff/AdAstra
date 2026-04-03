import type { AthleteProfile } from '../../models/athlete'
import type { TrainingLoad } from '../../models/load'
import { targetCTLForDate } from '../../utils/targetCTL'
import { todayISO } from '../../utils/dateHelpers'

const SEED_DATE = '2026-03-15'

interface Props {
  athlete: AthleteProfile
  latestLoad: TrainingLoad | null
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) /
    86_400_000,
  )
}

export function FitnessTargetCard({ athlete, latestLoad }: Props) {
  const primaryGoal = athlete.goals[0]
  if (!primaryGoal) return null

  const raceDate = primaryGoal.date
  const raceCTL = athlete.ctlTarget
  const today = todayISO()

  const currentCTL = latestLoad ? latestLoad.ctl : athlete.ctlBaseline
  const todayTarget = targetCTLForDate(today, SEED_DATE, raceDate, athlete.ctlBaseline, raceCTL)
  const peakCTL = Math.round(raceCTL * 1.13)

  const delta = currentCTL - todayTarget
  const absDelta = Math.abs(delta)
  const isAhead = delta >= 0
  const isOnTrack = absDelta < 2.5

  const totalDays = daysBetween(SEED_DATE, raceDate)
  const daysElapsed = Math.max(0, daysBetween(SEED_DATE, today))
  const daysRemaining = Math.max(0, daysBetween(today, raceDate))
  const progressPct = Math.min(100, Math.round((daysElapsed / totalDays) * 100))

  // Target position on the bar as percentage
  const targetPct = progressPct

  const statusColor = isOnTrack
    ? 'text-green-400'
    : isAhead
    ? 'text-blue-400'
    : 'text-amber-400'

  const statusBg = isOnTrack
    ? 'bg-green-900/40 border-green-800/50'
    : isAhead
    ? 'bg-blue-900/40 border-blue-800/50'
    : 'bg-amber-900/30 border-amber-800/40'

  const statusLabel = isOnTrack ? 'ON TRACK' : isAhead ? 'AHEAD' : 'BEHIND'
  const statusIcon = isOnTrack ? '✓' : isAhead ? '↑' : '↓'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Race Fitness Target</div>
        <div className="text-[10px] text-zinc-500 font-mono">{primaryGoal.name} · {daysRemaining}d out</div>
      </div>

      {/* Main metrics row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Current CTL */}
        <div className="bg-zinc-800/60 rounded-lg px-3 py-2.5">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">CTL Now</div>
          <div className="text-blue-400 font-mono font-bold text-lg leading-none">{currentCTL.toFixed(1)}</div>
        </div>

        {/* Target today */}
        <div className="bg-zinc-800/60 rounded-lg px-3 py-2.5">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Target Today</div>
          <div className="text-zinc-300 font-mono font-bold text-lg leading-none">{todayTarget.toFixed(1)}</div>
        </div>

        {/* Status */}
        <div className={`rounded-lg px-3 py-2.5 border ${statusBg}`}>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Status</div>
          <div className={`font-mono font-bold text-sm leading-none ${statusColor}`}>
            {statusIcon} {isOnTrack ? '±' : isAhead ? '+' : '−'}{absDelta.toFixed(1)}
          </div>
          <div className={`text-[9px] uppercase tracking-wider mt-0.5 ${statusColor}`}>{statusLabel}</div>
        </div>
      </div>

      {/* Timeline progress bar */}
      <div className="mb-3">
        <div className="relative h-2 bg-zinc-800 rounded-full overflow-visible mb-1.5">
          {/* Filled progress */}
          <div
            className="absolute left-0 top-0 h-full bg-blue-600/60 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
          {/* Target position tick */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-amber-400/60"
            style={{ left: `${targetPct}%` }}
          />
          {/* Current CTL dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-zinc-900 shadow"
            style={{ left: `${progressPct}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
          <span>Mar 15 · {athlete.ctlBaseline}</span>
          <span className="text-amber-500/70">peak ~{peakCTL}</span>
          <span>Aug 15 · {raceCTL}</span>
        </div>
      </div>

      {/* Bottom stats row */}
      <div className="flex gap-4 text-[10px] text-zinc-500 border-t border-zinc-800 pt-2.5">
        <div>
          <span className="text-zinc-600">Plan started</span>
          <span className="text-zinc-400 font-mono ml-1.5">{daysElapsed}d ago</span>
        </div>
        <div>
          <span className="text-zinc-600">Progress</span>
          <span className="text-zinc-400 font-mono ml-1.5">{progressPct}%</span>
        </div>
        <div>
          <span className="text-zinc-600">Peak target</span>
          <span className="text-zinc-400 font-mono ml-1.5">~{peakCTL} CTL</span>
        </div>
        <div className="ml-auto">
          <span className="text-zinc-600">Race CTL</span>
          <span className="text-zinc-400 font-mono ml-1.5">{raceCTL}</span>
        </div>
      </div>
    </div>
  )
}
