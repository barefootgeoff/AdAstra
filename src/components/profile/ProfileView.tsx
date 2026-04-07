import { useState, useEffect } from 'react'
import type { AthleteProfile, AthleteMemory, AthleteMemoryKey } from '../../models/athlete'

const MEMORY_LABELS: Record<AthleteMemoryKey, string> = {
  experience:      'Cycling Background',
  raceHistory:     'Race History',
  strengths:       'Strengths',
  weaknesses:      'Limiters',
  injuryHistory:   'Injury History',
  schedule:        'Training Schedule',
  lifeContext:     'Life Context',
  equipment:       'Equipment',
  nutritionNotes:  'Nutrition Notes',
  accountability:  'Accountability Notes',
}

const MEMORY_KEYS = Object.keys(MEMORY_LABELS) as AthleteMemoryKey[]

interface Props {
  athlete: AthleteProfile
  updateAthlete: (updates: Partial<AthleteProfile>) => void
  memory: AthleteMemory
  clearMemoryKey: (key: AthleteMemoryKey) => void
}

export function ProfileView({ athlete, updateAthlete, memory, clearMemoryKey }: Props) {
  const [briefing, setBriefing] = useState(athlete.coachBriefing ?? '')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setBriefing(athlete.coachBriefing ?? '')
  }, [athlete.coachBriefing])

  function handleSave() {
    updateAthlete({ coachBriefing: briefing })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const isDirty = briefing !== (athlete.coachBriefing ?? '')

  const hasAnyMemory = MEMORY_KEYS.some(k => memory[k])

  return (
    <div className="space-y-8 pb-10">

      {/* Coach Briefing */}
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-zinc-200 tracking-wide">Coach Briefing</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Sent to the AI at the start of every conversation as your coaching context.
          </p>
        </div>
        <textarea
          value={briefing}
          onChange={e => setBriefing(e.target.value)}
          rows={14}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 leading-relaxed resize-none"
          placeholder="Describe your goals, background, preferences, and anything your coach should always know..."
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSave}
            disabled={!isDirty && !saved}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? 'bg-green-800/60 text-green-300 border border-green-700'
                : isDirty
                ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border border-zinc-600'
                : 'bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed'
            }`}
          >
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-zinc-800" />

      {/* Athlete Memory */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-200 tracking-wide">Athlete Memory</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Facts your coach has learned from conversations and stored automatically.
            {!hasAnyMemory && ' Nothing recorded yet — start chatting with your coach.'}
          </p>
        </div>

        <div className="space-y-2">
          {MEMORY_KEYS.map(key => {
            const value = memory[key]
            return (
              <div
                key={key}
                className={`rounded-xl border px-4 py-3 ${
                  value
                    ? 'bg-zinc-900 border-zinc-700'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] tracking-widest uppercase text-zinc-500 mb-1">
                      {MEMORY_LABELS[key]}
                    </div>
                    {value ? (
                      <p className="text-sm text-zinc-300 leading-relaxed">{value}</p>
                    ) : (
                      <p className="text-sm text-zinc-600 italic">Not recorded yet</p>
                    )}
                  </div>
                  {value && (
                    <button
                      onClick={() => clearMemoryKey(key)}
                      className="shrink-0 mt-0.5 text-zinc-600 hover:text-red-400 transition-colors text-xs px-1 py-0.5 rounded"
                      aria-label={`Clear ${MEMORY_LABELS[key]}`}
                      title="Clear this memory"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
