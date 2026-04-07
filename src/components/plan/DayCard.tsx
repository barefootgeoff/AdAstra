import { useState } from 'react'
import type { PlannedSession, PlanInterval, WorkoutType } from '../../models/training'
import type { WorkoutLog } from '../../models/log'
import { WorkoutLogger } from './WorkoutLogger'

const TYPE_CONFIG: Record<WorkoutType, { bg: string; border: string; badge: string; label: string }> = {
  vo2:       { bg: 'bg-red-900/30',    border: 'border-red-700',    badge: 'bg-red-700 text-red-100',       label: 'VO₂'       },
  threshold: { bg: 'bg-orange-900/30', border: 'border-orange-600', badge: 'bg-orange-700 text-orange-100', label: 'THRESHOLD' },
  sweetspot: { bg: 'bg-amber-900/30',  border: 'border-amber-600',  badge: 'bg-amber-700 text-amber-100',   label: 'SWEETSPOT' },
  strength:  { bg: 'bg-purple-900/30', border: 'border-purple-600', badge: 'bg-purple-700 text-purple-100', label: 'STRENGTH'  },
  endurance: { bg: 'bg-blue-900/30',   border: 'border-blue-700',   badge: 'bg-blue-700 text-blue-100',     label: 'ENDURANCE' },
  rest:      { bg: 'bg-zinc-800/50',   border: 'border-zinc-600',   badge: 'bg-zinc-600 text-zinc-200',     label: 'REST'      },
  race:      { bg: 'bg-yellow-900/30', border: 'border-yellow-600', badge: 'bg-yellow-600 text-yellow-100', label: 'RACE'      },
}

function IntervalChart({ intervals }: { intervals: PlanInterval[] }) {
  const maxP = Math.max(...intervals.map(x => x.power))
  const minP = Math.min(...intervals.map(x => x.power)) - 30
  const target = intervals[0].target
  const notes = intervals.filter(iv => iv.note)

  return (
    <div>
      <div className="text-[10px] tracking-widest text-red-400 uppercase mb-2">Interval Performance</div>
      <div className="flex items-end gap-1.5 mb-2" style={{ height: 80 }}>
        {intervals.map((iv, i) => {
          const pct = ((iv.power - minP) / (maxP - minP)) * 100
          const aboveTarget = iv.power >= iv.target
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className={`text-[10px] font-mono font-bold ${aboveTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
                {iv.power}
              </span>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${Math.max(pct, 15)}%`,
                  background: aboveTarget
                    ? 'linear-gradient(to top, rgb(5,150,105), rgb(16,185,129))'
                    : 'linear-gradient(to top, rgb(180,130,20), rgb(217,170,50))',
                }}
              />
              <span className="text-[9px] text-zinc-500 font-mono">R{iv.rep}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 text-[9px] text-zinc-600">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-emerald-500" /> Above target
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-amber-500" /> Below target
        </div>
        <span className="ml-auto font-mono">Target: {target}W</span>
      </div>
      {notes.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {notes.map((iv, i) => (
            <div key={i} className="text-[9px] text-zinc-500 italic">R{iv.rep}: {iv.note}</div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  session: PlannedSession
  planId: string
  isoDate: string
  existingLog: WorkoutLog | null
  athleteFTP: number
  weekCompleted?: boolean
  onSaveLog: (log: WorkoutLog) => void
  onOpenDetail?: (isoDate: string) => void
}

export function DayCard({ session, planId, isoDate, existingLog, athleteFTP, weekCompleted = false, onSaveLog, onOpenDetail }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [logging, setLogging] = useState(false)
  const config = TYPE_CONFIG[session.type]
  const isRest = session.type === 'rest'

  return (
    <>
      <div className={`${config.bg} border ${config.border} rounded-lg transition-all duration-200 hover:brightness-110`}>
        <div className="p-3" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-xs font-mono w-8">{session.day}</span>
              <span className={`${config.badge} text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider`}>
                {config.label}
              </span>
              {existingLog?.completed && (
                <span className="bg-green-900/60 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider">
                  ✓ {existingLog.actualTSS ? `${existingLog.actualTSS} TSS` : 'DONE'}
                </span>
              )}
              {existingLog?.skipped && (
                <span className="bg-zinc-800 text-zinc-500 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider">
                  ✕ SKIPPED
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                {session.duration && session.duration !== '—' && <span>{session.duration}</span>}
                {session.tss && session.tss !== '—' && <span className="font-mono">{session.tss} TSS</span>}
              </div>
              {!isRest && !weekCompleted && (
                <button
                  onClick={e => { e.stopPropagation(); setLogging(true) }}
                  className="text-zinc-500 hover:text-zinc-200 text-sm px-1.5 py-0.5 rounded hover:bg-zinc-700/50 transition-colors"
                  title="Log workout"
                >
                  ✎
                </button>
              )}
              {onOpenDetail && (
                <button
                  onClick={e => { e.stopPropagation(); onOpenDetail(isoDate) }}
                  className="text-zinc-500 hover:text-zinc-200 text-xs px-1.5 py-0.5 rounded hover:bg-zinc-700/50 transition-colors"
                  title="Open workout detail"
                >
                  ↗
                </button>
              )}
              <span className="text-zinc-500 text-[10px]">{expanded ? '▲' : '▼'}</span>
            </div>
          </div>
          <div className="text-zinc-200 text-sm font-medium pl-10">{session.label}</div>
        </div>

        {expanded && (
          <div className="px-3 pb-3 pl-10 space-y-3 border-t border-zinc-700/50 pt-3">
            {/* Actual result — completed weeks */}
            {session.actual && (
              <div>
                <div className="text-[10px] tracking-widest text-emerald-500 uppercase mb-1">Actual Result</div>
                <div className="text-xs text-emerald-400/80 leading-relaxed font-mono">{session.actual}</div>
              </div>
            )}

            {/* Interval bar chart */}
            {session.intervals && session.intervals.length > 0 && (
              <IntervalChart intervals={session.intervals} />
            )}

            {/* Session details */}
            <div>
              <div className="text-[10px] tracking-widest text-zinc-500 uppercase mb-1">
                {weekCompleted ? 'Notes' : 'Session Details'}
              </div>
              {session.details.map((d, i) => (
                <div
                  key={i}
                  className={`text-xs leading-relaxed ${
                    d.startsWith('──') ? 'text-zinc-400 font-bold mt-2 mb-1' : 'text-zinc-300'
                  }`}
                >
                  {d.startsWith('──') ? d : `• ${d}`}
                </div>
              ))}
            </div>

            {/* Fuel / Alt / Why — only for upcoming sessions */}
            {!weekCompleted && session.fuel && (
              <div>
                <div className="text-[10px] tracking-widest text-zinc-500 uppercase mb-1">Fuel</div>
                <div className="text-xs text-zinc-400 leading-relaxed">{session.fuel}</div>
              </div>
            )}
            {!weekCompleted && session.alt && (
              <div>
                <div className="text-[10px] tracking-widest text-amber-600 uppercase mb-1">If Not Fresh</div>
                <div className="text-xs text-amber-500/80 leading-relaxed">{session.alt}</div>
              </div>
            )}
            {!weekCompleted && session.why && (
              <div>
                <div className="text-[10px] tracking-widest text-zinc-500 uppercase mb-1">Why It Works</div>
                <div className="text-xs text-zinc-400 italic leading-relaxed">{session.why}</div>
              </div>
            )}

            {/* Logged data from WorkoutLog */}
            {existingLog && !existingLog.skipped && (
              <div className="bg-green-950/40 border border-green-800/40 rounded-lg p-3">
                <div className="text-[10px] tracking-widest text-green-600 uppercase mb-2">Logged</div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                  {existingLog.durationMinutes && (
                    <div><span className="text-zinc-500">Duration</span>{' '}<span className="text-zinc-300 font-mono">{existingLog.durationMinutes}min</span></div>
                  )}
                  {existingLog.normalizedWatts && (
                    <div><span className="text-zinc-500">NP</span>{' '}<span className="text-zinc-300 font-mono">{existingLog.normalizedWatts}W</span></div>
                  )}
                  {existingLog.avgHR && (
                    <div><span className="text-zinc-500">HR</span>{' '}<span className="text-zinc-300 font-mono">{existingLog.avgHR}bpm</span></div>
                  )}
                  {existingLog.rpe && (
                    <div><span className="text-zinc-500">RPE</span>{' '}<span className="text-zinc-300 font-mono">{existingLog.rpe}/10</span></div>
                  )}
                  {existingLog.actualTSS && (
                    <div><span className="text-zinc-500">TSS</span>{' '}<span className="text-zinc-300 font-mono">{existingLog.actualTSS}</span></div>
                  )}
                </div>
                {existingLog.notes && (
                  <div className="text-xs text-zinc-400 italic mt-2">{existingLog.notes}</div>
                )}
                <button
                  onClick={() => setLogging(true)}
                  className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300 underline"
                >
                  Edit log
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {logging && (
        <WorkoutLogger
          session={session}
          planId={planId}
          existingLog={existingLog}
          athleteFTP={athleteFTP}
          isoDate={isoDate}
          onSave={onSaveLog}
          onClose={() => setLogging(false)}
        />
      )}
    </>
  )
}
