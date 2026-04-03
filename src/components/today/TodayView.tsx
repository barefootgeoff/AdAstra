import { useState, useEffect } from 'react'
import type { AthleteProfile } from '../../models/athlete'
import type { TrainingLoad } from '../../models/load'
import type { WorkoutLog } from '../../models/log'
import type { PlannedSession, WorkoutType } from '../../models/training'
import type { Interval } from '../../models/interval'
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
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
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
  const [intervals, setIntervals] = useState<Interval[] | null>(null)
  const [intervalsLoading, setIntervalsLoading] = useState(false)

  const today = todayISO()
  const found = findTodaySession()
  const todayLog = logs.find(l => l.date === today) ?? null
  const primaryGoal = athlete.goals[0]
  const daysToRace = primaryGoal ? daysUntil(primaryGoal.date) : null

  // Fetch power stream intervals for completed Strava activities
  useEffect(() => {
    if (!todayLog?.completed || !todayLog.id.startsWith('strava-')) return
    const activityId = todayLog.id.replace('strava-', '')
    setIntervalsLoading(true)
    fetch(`/api/strava/streams?activityId=${activityId}&ftp=${athleteFTP}`)
      .then(r => r.ok ? r.json() : { intervals: [] })
      .then((data: { intervals: Interval[] }) => setIntervals(data.intervals))
      .catch(() => setIntervals([]))
      .finally(() => setIntervalsLoading(false))
  }, [todayLog?.id, todayLog?.completed, athleteFTP])

  // ── No session in plan for today ─────────────────────────────────────────────
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

  // ── POST-COMPLETION ──────────────────────────────────────────────────────────
  if (todayLog?.completed) {
    return (
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-green-900/60 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">✓ DONE</span>
              <span className={`${badge.badge} text-[10px] font-bold px-2 py-0.5 rounded tracking-wider`}>{badge.label}</span>
            </div>
            <div className="text-zinc-400 text-xs">{formatDate(today)}</div>
          </div>
          {daysToRace !== null && (
            <div className="text-right">
              <div className="text-zinc-600 text-[10px] uppercase tracking-wider">{primaryGoal?.name}</div>
              <div className="text-zinc-400 font-mono text-sm">{daysToRace}d</div>
            </div>
          )}
        </div>

        <div className="text-white text-lg font-medium mb-3">{session.label}</div>

        {/* Key metrics row */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {todayLog.actualTSS != null && (
            <MetricPill label="TSS" value={String(todayLog.actualTSS)} />
          )}
          {todayLog.normalizedWatts != null && (
            <MetricPill label="NP" value={`${todayLog.normalizedWatts}W`} />
          )}
          {todayLog.durationMinutes != null && (
            <MetricPill label="Time" value={`${todayLog.durationMinutes}min`} />
          )}
          {todayLog.avgHR != null && (
            <MetricPill label="HR" value={`${todayLog.avgHR}bpm`} />
          )}
          {todayLog.rpe != null && (
            <MetricPill label="RPE" value={`${todayLog.rpe}/10`} />
          )}
          <button
            onClick={() => setLogging(true)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 ml-auto underline"
          >
            Edit
          </button>
        </div>

        {/* Interval analysis */}
        {(intervalsLoading || (intervals && intervals.length > 0)) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
            <div className="text-[10px] tracking-widest text-zinc-500 uppercase mb-3">Intervals</div>
            {intervalsLoading ? (
              <div className="text-zinc-600 text-xs">Analyzing power data…</div>
            ) : (
              <div className="space-y-2">
                {intervals!.map(iv => (
                  <div key={iv.index} className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-zinc-600 w-5">#{iv.index}</span>
                    <span className="text-zinc-400 w-10">{formatDuration(iv.durationSec)}</span>
                    <span className="text-zinc-200">{iv.avgWatts}W</span>
                    {iv.avgHR && <span className="text-zinc-500">{iv.avgHR}bpm</span>}
                    <span className="text-zinc-700 ml-auto">{iv.tss} TSS</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI coach chat */}
        <PostRideReflection
          athlete={athlete}
          plannedSession={session}
          log={todayLog}
          loadHistory={loadHistory}
          intervals={intervals ?? []}
          coachBriefing={athlete.coachBriefing}
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

  // ── PRE-COMPLETION ───────────────────────────────────────────────────────────
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

      {todayLog?.skipped && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2 mb-4 text-zinc-500 text-sm">
          Marked as skipped.
        </div>
      )}

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

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800 rounded-lg px-3 py-1.5 flex flex-col items-center min-w-[52px]">
      <span className="text-[9px] text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className="text-zinc-200 font-mono text-sm font-medium">{value}</span>
    </div>
  )
}
