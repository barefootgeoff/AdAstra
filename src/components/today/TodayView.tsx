import { useState } from 'react'
import type { AthleteProfile } from '../../models/athlete'
import type { TrainingLoad } from '../../models/load'
import type { WorkoutLog } from '../../models/log'
import type { PlannedSession, WorkoutType } from '../../models/training'
import { WorkoutLogger } from '../plan/WorkoutLogger'
import { PostRideReflection } from './PostRideReflection'
import { LEADVILLE_2026 } from '../../data/leadville2026'
import { planDateToISO, todayISO } from '../../utils/dateHelpers'
import { daysUntil } from '../../utils/trainingMath'

const TYPE_BADGE: Record<WorkoutType, { badge: string; label: string }> = {
  vo2:       { badge: 'bg-red-700 text-red-100',       label: 'VO₂'       },
  threshold: { badge: 'bg-orange-700 text-orange-100', label: 'THRESHOLD' },
  sweetspot: { badge: 'bg-amber-700 text-amber-100',   label: 'SWEETSPOT' },
  strength:  { badge: 'bg-purple-700 text-purple-100', label: 'STRENGTH'  },
  endurance: { badge: 'bg-blue-700 text-blue-100',     label: 'ENDURANCE' },
  rest:      { badge: 'bg-zinc-600 text-zinc-200',     label: 'REST'      },
  race:      { badge: 'bg-yellow-600 text-yellow-100', label: 'RACE'      },
}

function tsbColor(tsb: number) {
  if (tsb > 10) return 'text-green-400'
  if (tsb > -10) return 'text-yellow-400'
  return 'text-red-400'
}

function tsbLabel(tsb: number) {
  if (tsb > 25) return 'VERY FRESH'
  if (tsb > 10) return 'FRESH'
  if (tsb > -10) return 'NEUTRAL'
  if (tsb > -25) return 'TIRED'
  return 'VERY TIRED'
}

function findTodaySession(): { session: PlannedSession; weekNum: number } | null {
  const today = todayISO()
  for (const week of LEADVILLE_2026.weeks) {
    for (const day of week.days) {
      if (planDateToISO(day.date, week.dates) === today) {
        return { session: day, weekNum: week.week }
      }
    }
  }
  return null
}

function formatDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

interface Props {
  athlete: AthleteProfile
  latestLoad: TrainingLoad | null
  logs: WorkoutLog[]
  loadHistory: TrainingLoad[]
  athleteFTP: number
  onSaveLog: (log: WorkoutLog) => void
}

export function TodayView({ athlete, latestLoad, logs, loadHistory, athleteFTP, onSaveLog }: Props) {
  const [logging, setLogging] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const today = todayISO()
  const found = findTodaySession()
  const todayLog = logs.find(l => l.date === today) ?? null
  const primaryGoal = athlete.goals[0]
  const daysToRace = primaryGoal ? daysUntil(primaryGoal.date) : null

  // ── No session in plan for today ───────────────────────────────────────────
  if (!found) {
    return (
      <div className="text-center py-16">
        <div className="text-zinc-500 text-sm">{formatDate(today)}</div>
        <div className="text-zinc-400 mt-4 text-base">No planned session today.</div>
        {daysToRace !== null && (
          <div className="text-zinc-600 text-xs mt-2 uppercase tracking-wider">
            {daysToRace}d to {primaryGoal?.name}
          </div>
        )}
      </div>
    )
  }

  const { session, weekNum } = found
  const isRest = session.type === 'rest'
  const badge = TYPE_BADGE[session.type]
  const plannedTSS = session.tss ? parseInt(session.tss.replace(/[^0-9]/g, ''), 10) : null

  // ── POST-COMPLETION ────────────────────────────────────────────────────────
  if (todayLog?.completed) {
    const tss = todayLog.actualTSS
    const tssDiff = tss && plannedTSS ? tss - plannedTSS : null

    return (
      <div>
        {/* Date + race countdown */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-zinc-400 text-sm">{formatDate(today)}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`${badge.badge} text-[10px] font-bold px-2 py-0.5 rounded tracking-wider`}>
                {badge.label}
              </span>
              <span className="bg-green-900/60 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">
                DONE
              </span>
            </div>
          </div>
          {daysToRace !== null && (
            <div className="text-right">
              <div className="text-zinc-600 text-[10px] uppercase tracking-wider">{primaryGoal?.name}</div>
              <div className="text-zinc-400 font-mono text-sm">{daysToRace}d</div>
            </div>
          )}
        </div>

        <div className="text-white text-lg font-medium mb-4">{session.label}</div>

        {/* Actual vs planned */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-2">
          <div className="text-[10px] tracking-widest text-zinc-500 uppercase mb-3">Actual vs Planned</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {todayLog.durationMinutes != null && (
              <Metric
                label="Duration"
                actual={`${todayLog.durationMinutes}min`}
                planned={session.duration}
              />
            )}
            {todayLog.normalizedWatts != null && (
              <Metric label="NP" actual={`${todayLog.normalizedWatts}W`} />
            )}
            {tss != null && (
              <Metric
                label="TSS"
                actual={String(tss)}
                planned={plannedTSS ? `~${plannedTSS}` : undefined}
                diff={tssDiff}
              />
            )}
            {todayLog.avgHR != null && (
              <Metric label="Avg HR" actual={`${todayLog.avgHR}bpm`} />
            )}
            {todayLog.peakHR != null && (
              <Metric label="Peak HR" actual={`${todayLog.peakHR}bpm`} />
            )}
            {todayLog.rpe != null && (
              <Metric label="RPE" actual={`${todayLog.rpe}/10`} />
            )}
          </div>
          {todayLog.notes && (
            <div className="mt-3 text-xs text-zinc-400 italic">{todayLog.notes}</div>
          )}
          <button
            onClick={() => setLogging(true)}
            className="mt-3 text-[10px] text-zinc-500 hover:text-zinc-300 underline"
          >
            Edit log
          </button>
        </div>

        {/* AI coach chat */}
        <PostRideReflection
          athlete={athlete}
          plannedSession={session}
          log={todayLog}
          loadHistory={loadHistory}
        />

        {logging && (
          <WorkoutLogger
            session={session}
            planId={LEADVILLE_2026.id}
            existingLog={todayLog}
            athleteFTP={athleteFTP}
            isoDate={today}
            onSave={log => { onSaveLog(log); setLogging(false) }}
            onClose={() => setLogging(false)}
          />
        )}
      </div>
    )
  }

  // ── PRE-COMPLETION ─────────────────────────────────────────────────────────
  return (
    <div>
      {/* Date + race countdown */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-zinc-400 text-sm">{formatDate(today)}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`${badge.badge} text-[10px] font-bold px-2 py-0.5 rounded tracking-wider`}>
              {badge.label}
            </span>
            <span className="text-zinc-600 text-[10px] font-mono">W{weekNum}</span>
          </div>
        </div>
        {daysToRace !== null && (
          <div className="text-right">
            <div className="text-zinc-600 text-[10px] uppercase tracking-wider">{primaryGoal?.name}</div>
            <div className="text-zinc-400 font-mono text-sm">{daysToRace}d</div>
          </div>
        )}
      </div>

      {/* Session header */}
      <div className="text-white text-xl font-semibold mb-1" style={{ fontFamily: 'Georgia, serif' }}>
        {session.label}
      </div>
      {(session.duration || session.tss) && (
        <div className="text-zinc-500 text-sm mb-4">
          {session.duration && <span>{session.duration}</span>}
          {session.duration && session.tss && <span className="mx-2">·</span>}
          {session.tss && <span>{session.tss} TSS</span>}
        </div>
      )}

      {/* Form snapshot */}
      {latestLoad && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <div className="text-[10px] tracking-widest text-zinc-500 uppercase mb-2">Your Form Today</div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-zinc-500 text-xs">CTL </span>
              <span className="font-mono text-blue-400">{latestLoad.ctl.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-zinc-500 text-xs">ATL </span>
              <span className="font-mono text-zinc-300">{latestLoad.atl.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-zinc-500 text-xs">TSB </span>
              <span className={`font-mono font-bold ${tsbColor(latestLoad.tsb)}`}>
                {latestLoad.tsb > 0 ? '+' : ''}{latestLoad.tsb.toFixed(1)}
              </span>
              <span className={`ml-1 text-[10px] uppercase tracking-wider ${tsbColor(latestLoad.tsb)}`}>
                {tsbLabel(latestLoad.tsb)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fueling — prominent */}
      {session.fuel && (
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-4 mb-4">
          <div className="text-[10px] tracking-widest text-amber-600 uppercase mb-1">Fueling</div>
          <div className="text-amber-200/80 text-sm leading-relaxed">{session.fuel}</div>
        </div>
      )}

      {/* Session details — collapsible */}
      {!isRest && session.details.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl mb-4 overflow-hidden">
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-[10px] tracking-widest text-zinc-500 uppercase">Session Details</span>
            <span className="text-zinc-500 text-[10px]">{detailsOpen ? '▲' : '▼'}</span>
          </button>
          {detailsOpen && (
            <div className="px-4 pb-4 space-y-1 border-t border-zinc-800">
              {session.details.map((d, i) => (
                <div
                  key={i}
                  className={`text-xs leading-relaxed ${
                    d.startsWith('──') ? 'text-zinc-400 font-bold mt-2' : 'text-zinc-300'
                  }`}
                >
                  {d.startsWith('──') ? d : `• ${d}`}
                </div>
              ))}
              {session.alt && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <div className="text-[10px] tracking-widest text-amber-600 uppercase mb-1">If Not Fresh</div>
                  <div className="text-xs text-amber-500/80 leading-relaxed">{session.alt}</div>
                </div>
              )}
              {session.why && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <div className="text-[10px] tracking-widest text-zinc-500 uppercase mb-1">Why It Works</div>
                  <div className="text-xs text-zinc-400 italic leading-relaxed">{session.why}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Skipped indicator */}
      {todayLog?.skipped && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2 mb-4 text-zinc-500 text-sm">
          Marked as skipped.
        </div>
      )}

      {/* Log button */}
      {!isRest && (
        <button
          onClick={() => setLogging(true)}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3 text-sm font-medium tracking-wide transition-colors"
        >
          Log Workout
        </button>
      )}

      {logging && (
        <WorkoutLogger
          session={session}
          planId={LEADVILLE_2026.id}
          existingLog={todayLog}
          athleteFTP={athleteFTP}
          isoDate={today}
          onSave={log => { onSaveLog(log); setLogging(false) }}
          onClose={() => setLogging(false)}
        />
      )}
    </div>
  )
}

// Small helper for actual vs planned comparison rows
function Metric({
  label,
  actual,
  planned,
  diff,
}: {
  label: string
  actual: string
  planned?: string
  diff?: number | null
}) {
  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-zinc-200">{actual}</span>
        {planned && <span className="text-zinc-600 text-xs">/ {planned}</span>}
        {diff != null && (
          <span className={`text-[10px] font-mono ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
            {diff > 0 ? `+${diff}` : diff}
          </span>
        )}
      </div>
    </div>
  )
}
