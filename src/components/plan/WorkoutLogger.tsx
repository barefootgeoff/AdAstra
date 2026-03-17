import { useState, useEffect } from 'react'
import type { PlannedSession } from '../../models/training'
import type { WorkoutLog } from '../../models/log'
import { calculateTSS } from '../../utils/trainingMath'

interface Props {
  session: PlannedSession
  planId: string
  existingLog: WorkoutLog | null
  athleteFTP: number
  // Convert plan date "3/16" to ISO "2026-03-16" for storage
  isoDate: string
  onSave: (log: WorkoutLog) => void
  onClose: () => void
}

function genId() {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function WorkoutLogger({ session, planId, existingLog, athleteFTP, isoDate, onSave, onClose }: Props) {
  const [completed, setCompleted] = useState(existingLog?.completed ?? true)
  const [skipped, setSkipped] = useState(existingLog?.skipped ?? false)
  const [durationMin, setDurationMin] = useState(existingLog?.durationMinutes?.toString() ?? '')
  const [avgWatts, setAvgWatts] = useState(existingLog?.avgWatts?.toString() ?? '')
  const [np, setNp] = useState(existingLog?.normalizedWatts?.toString() ?? '')
  const [avgHR, setAvgHR] = useState(existingLog?.avgHR?.toString() ?? '')
  const [rpe, setRpe] = useState(existingLog?.rpe ?? 0)
  const [notes, setNotes] = useState(existingLog?.notes ?? '')

  // Auto-calculate TSS from NP + duration
  const calcTSS = (() => {
    const npNum = parseFloat(np) || parseFloat(avgWatts) || 0
    const durSecs = (parseFloat(durationMin) || 0) * 60
    if (npNum > 0 && durSecs > 0) return Math.round(calculateTSS(durSecs, npNum, athleteFTP))
    return null
  })()

  // When skipped is toggled on, clear completed
  useEffect(() => { if (skipped) setCompleted(false) }, [skipped])
  useEffect(() => { if (completed) setSkipped(false) }, [completed])

  function handleSave() {
    const log: WorkoutLog = {
      id: existingLog?.id ?? genId(),
      date: isoDate,
      plannedRef: { planId, week: 0, day: session.day },
      type: session.type,
      completed,
      skipped,
      durationMinutes: parseFloat(durationMin) || undefined,
      avgWatts: parseFloat(avgWatts) || undefined,
      normalizedWatts: parseFloat(np) || undefined,
      avgHR: parseFloat(avgHR) || undefined,
      rpe: rpe || undefined,
      actualTSS: calcTSS ?? undefined,
      notes: notes.trim() || undefined,
      loggedAt: new Date().toISOString(),
    }
    onSave(log)
    onClose()
  }

  const plannedTSS = session.tss && session.tss !== '—' ? session.tss : null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-t-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Log Workout</div>
            <div className="text-white font-semibold">{session.label}</div>
            <div className="text-zinc-400 text-xs mt-0.5">{session.day} · {isoDate}</div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">✕</button>
        </div>

        {/* Completed / Skipped toggle */}
        <div className="flex gap-3">
          <button
            onClick={() => { setCompleted(true); setSkipped(false) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              completed ? 'bg-green-700 text-green-100' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            ✓ Completed
          </button>
          <button
            onClick={() => { setSkipped(true); setCompleted(false) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              skipped ? 'bg-red-900 text-red-300' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            ✕ Skipped
          </button>
        </div>

        {!skipped && (
          <>
            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Duration (min)</span>
                <input
                  type="number"
                  value={durationMin}
                  onChange={e => setDurationMin(e.target.value)}
                  placeholder="e.g. 90"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Avg Power (W)</span>
                <input
                  type="number"
                  value={avgWatts}
                  onChange={e => setAvgWatts(e.target.value)}
                  placeholder="e.g. 240"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">NP — Norm. Power (W)</span>
                <input
                  type="number"
                  value={np}
                  onChange={e => setNp(e.target.value)}
                  placeholder="e.g. 258"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Avg HR (bpm)</span>
                <input
                  type="number"
                  value={avgHR}
                  onChange={e => setAvgHR(e.target.value)}
                  placeholder="e.g. 155"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                />
              </label>
            </div>

            {/* RPE slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">RPE</span>
                <span className="text-zinc-300 text-sm font-mono">{rpe > 0 ? rpe : '—'} / 10</span>
              </div>
              <div className="flex gap-1.5">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button
                    key={n}
                    onClick={() => setRpe(n)}
                    className={`flex-1 py-1.5 rounded text-xs font-mono transition-colors ${
                      rpe === n
                        ? n <= 4 ? 'bg-green-700 text-green-100'
                          : n <= 7 ? 'bg-yellow-700 text-yellow-100'
                          : 'bg-red-700 text-red-100'
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <label className="block">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Notes</span>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="How did it feel? Any issues?"
                rows={2}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 resize-none"
              />
            </label>

            {/* TSS comparison */}
            <div className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-4 py-3">
              <div className="text-xs text-zinc-400">
                Planned TSS: <span className="text-zinc-300 font-mono">{plannedTSS ?? '—'}</span>
              </div>
              <div className="text-xs text-zinc-400">
                Calculated TSS:{' '}
                <span className={`font-mono font-bold ${calcTSS ? 'text-blue-400' : 'text-zinc-500'}`}>
                  {calcTSS ?? '—'}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full py-3 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
        >
          Save Workout
        </button>
      </div>
    </div>
  )
}
