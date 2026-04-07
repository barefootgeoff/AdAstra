import { useState, useRef, useEffect } from 'react'
import type { AthleteProfile } from '../../models/athlete'
import type { PlannedSession } from '../../models/training'
import type { WorkoutLog } from '../../models/log'
import type { TrainingLoad } from '../../models/load'
import type { Interval } from '../../models/interval'
import { useChat } from '../../store/useChat'
import { computeRideMetrics } from '../../utils/trainingMath'

const OPENERS = [
  'How did I do today?',
  'What should I focus on next?',
  'How is my fitness trending?',
]

interface Props {
  athlete: AthleteProfile
  plannedSession: PlannedSession
  log: WorkoutLog
  loadHistory: TrainingLoad[]
  intervals: Interval[]
  coachBriefing?: string
}

export function PostRideReflection({ athlete, plannedSession, log, loadHistory, intervals, coachBriefing }: Props) {
  const { messages, addMessage } = useChat(log.id)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    if (!text.trim() || loading) return
    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }
    addMessage(userMsg)
    setInput('')
    setLoading(true)

    try {
      const context = {
        athlete: {
          name: athlete.name,
          ftp: athlete.ftp,
          maxHR: athlete.maxHR,
          weight: athlete.weight,
          goals: athlete.goals,
        },
        coachBriefing,
        planned: {
          label: plannedSession.label,
          type: plannedSession.type,
          duration: plannedSession.duration,
          tss: plannedSession.tss,
          details: plannedSession.details,
          why: plannedSession.why,
        },
        actual: (() => {
          const m = computeRideMetrics(log, athlete)
          return {
            durationMinutes: log.durationMinutes,
            avgWatts: log.avgWatts,
            normalizedWatts: log.normalizedWatts,
            avgHR: log.avgHR,
            peakHR: log.peakHR,
            rpe: log.rpe,
            actualTSS: log.actualTSS,
            notes: log.notes,
            work: m.work != null ? Math.round(m.work) : undefined,
            intensityFactor: m.intensityFactor != null ? Number(m.intensityFactor.toFixed(2)) : undefined,
            variabilityIndex: m.variabilityIndex != null ? Number(m.variabilityIndex.toFixed(2)) : undefined,
            efficiencyFactor: m.efficiencyFactor != null ? Number(m.efficiencyFactor.toFixed(2)) : undefined,
            wPerKg: m.wPerKg != null ? Number(m.wPerKg.toFixed(2)) : undefined,
            totalElevationGain: m.totalElevationGain ?? undefined,
            vam: m.vam != null ? Math.round(m.vam) : undefined,
          }
        })(),
        recentLoad: loadHistory.slice(-7).map(l => ({
          date: l.date, ctl: l.ctl, atl: l.atl, tsb: l.tsb, dailyTSS: l.dailyTSS,
        })),
        intervals: intervals.map(iv => ({
          index: iv.index,
          durationSec: iv.durationSec,
          avgWatts: iv.avgWatts,
          maxWatts: iv.maxWatts,
          avgHR: iv.avgHR,
          tss: iv.tss,
        })),
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error === 'overloaded' ? 'overloaded' : 'chat_failed')
      }
      const { reply } = await res.json() as { reply: string }
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      const isOverloaded = err instanceof Error && err.message === 'overloaded'
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: isOverloaded
          ? 'The AI is overloaded right now — try again in a moment.'
          : 'Sorry, I couldn\'t connect. Try again.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl mt-4">
      <div className="px-4 pt-3 pb-2 border-b border-zinc-800">
        <div className="text-[10px] tracking-widest text-zinc-500 uppercase">Coach · Post-Ride Debrief</div>
      </div>

      {/* Messages */}
      <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-zinc-500 text-xs">Start a conversation about your ride.</p>
            <div className="flex flex-wrap gap-2">
              {OPENERS.map(opener => (
                <button
                  key={opener}
                  onClick={() => send(opener)}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full transition-colors"
                >
                  {opener}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'bg-zinc-800/80 border border-zinc-700 text-zinc-300'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2">
              <span className="text-zinc-400 text-sm tracking-widest">···</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          placeholder="Ask your coach…"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
