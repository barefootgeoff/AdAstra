import { useState, useRef, useEffect, useCallback } from 'react'
import type { AthleteProfile } from '../../models/athlete'
import type { TrainingLoad } from '../../models/load'
import type { WorkoutLog } from '../../models/log'
import type { TrainingPlan } from '../../models/training'
import type { PlanEditProposal } from '../../models/chat'
import { useChat } from '../../store/useChat'
import { planDateToISO, todayISO } from '../../utils/dateHelpers'
import { Markdown } from '../../utils/markdown'
import { PlanEditApproval } from './PlanEditApproval'

const STARTERS = [
  "How's my training going?",
  'Should I adjust this week?',
  'Help me plan race day nutrition',
  'Am I on track for Leadville?',
]

interface Props {
  athlete: AthleteProfile
  latestLoad: TrainingLoad | null
  loadHistory: TrainingLoad[]
  logs: WorkoutLog[]
  plan: TrainingPlan
  onClose: () => void
  onUpdateBriefing: (text: string) => void
  onApplyPlanEdits: (edits: PlanEditProposal[]) => void
}

export function CoachChat({
  athlete, latestLoad, loadHistory, logs, plan,
  onClose, onUpdateBriefing, onApplyPlanEdits,
}: Props) {
  const { messages, addMessage, updateMessage, clearMessages } = useChat('general')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingBriefing, setEditingBriefing] = useState(false)
  const [briefingDraft, setBriefingDraft] = useState(athlete.coachBriefing ?? '')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function saveBriefing() {
    onUpdateBriefing(briefingDraft)
    setEditingBriefing(false)
  }

  function buildContext() {
    const today = todayISO()
    let weekIdx = 0
    outer: for (let i = 0; i < plan.weeks.length; i++) {
      for (const day of plan.weeks[i].days) {
        if (planDateToISO(day.date, plan.weeks[i].dates) === today) {
          weekIdx = i; break outer
        }
      }
    }

    const currentWeekData = plan.weeks[weekIdx] ?? null
    const nextWeekData = plan.weeks[weekIdx + 1] ?? null

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 14)
    const cutoffISO = cutoff.toISOString().slice(0, 10)
    const recentLogs = logs.filter(l => l.date >= cutoffISO)
    const compliance = {
      planned: recentLogs.length,
      completed: recentLogs.filter(l => l.completed).length,
      skipped: recentLogs.filter(l => l.skipped).length,
    }

    let currentWeek = null
    if (currentWeekData) {
      const weekDays = currentWeekData.days.map(d => {
        const iso = planDateToISO(d.date, currentWeekData.dates)
        const log = logs.find(l => l.date === iso)
        return { label: d.label, type: d.type, completed: log?.completed ?? false, skipped: log?.skipped ?? false }
      })
      currentWeek = {
        weekNum: currentWeekData.week, phase: currentWeekData.phase,
        projectedTSS: currentWeekData.projectedTSS, days: weekDays,
      }
    }

    const nextWeek = nextWeekData
      ? { weekNum: nextWeekData.week, phase: nextWeekData.phase, projectedTSS: nextWeekData.projectedTSS }
      : null

    return {
      athlete: { name: athlete.name, ftp: athlete.ftp, maxHR: athlete.maxHR, weight: athlete.weight, goals: athlete.goals },
      coachBriefing: athlete.coachBriefing,
      fitness: latestLoad ? { ctl: latestLoad.ctl, atl: latestLoad.atl, tsb: latestLoad.tsb } : null,
      currentWeek, nextWeek,
      recentLoad: loadHistory.slice(-14).map(l => ({ date: l.date, ctl: l.ctl, atl: l.atl, tsb: l.tsb, dailyTSS: l.dailyTSS })),
      compliance,
    }
  }

  const handleApplyEdits = useCallback((msgId: string, edits: PlanEditProposal[]) => {
    onApplyPlanEdits(edits)
    updateMessage(msgId, { editsApplied: true })
  }, [onApplyPlanEdits, updateMessage])

  const handleDismissEdits = useCallback((msgId: string) => {
    updateMessage(msgId, { editsApplied: true })
  }, [updateMessage])

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
      const res = await fetch('/api/chat/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].slice(-20),
          context: buildContext(),
        }),
      })

      if (!res.ok) throw new Error('chat_failed')
      const data = await res.json() as { reply: string; planEdits?: PlanEditProposal[] }
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        planEdits: data.planEdits?.length ? data.planEdits : undefined,
        editsApplied: false,
      })
    } catch {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't connect. Try again.",
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-zinc-100 tracking-wide">Coach</span>
          <button
            onClick={() => { setEditingBriefing(!editingBriefing); setBriefingDraft(athlete.coachBriefing ?? '') }}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {editingBriefing ? 'Cancel' : 'Edit briefing'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button onClick={clearMessages} className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors">
              Clear
            </button>
          )}
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none px-1" aria-label="Close">
            ×
          </button>
        </div>
      </div>

      {/* Briefing editor */}
      {editingBriefing && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Coach Briefing</p>
          <textarea
            value={briefingDraft}
            onChange={e => setBriefingDraft(e.target.value)}
            rows={4}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
            placeholder="Tell your coach about your goals, constraints, and what to hold you accountable for…"
          />
          <button onClick={saveBriefing} className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">
            Save
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-3 pt-4">
            <p className="text-zinc-500 text-sm text-center">Ask your coach anything about your training.</p>
            <div className="flex flex-col gap-2">
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 px-4 py-3 rounded-xl text-left transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'bg-zinc-800/80 border border-zinc-700 text-zinc-300'
                }`}
              >
                {msg.role === 'assistant'
                  ? <Markdown content={msg.content} />
                  : <p className="text-sm leading-relaxed">{msg.content}</p>
                }
              </div>
              {/* Plan edit approval card */}
              {msg.role === 'assistant' && msg.planEdits && msg.planEdits.length > 0 && (
                <div className="w-full max-w-[85%]">
                  <PlanEditApproval
                    edits={msg.planEdits}
                    plan={plan}
                    applied={msg.editsApplied ?? false}
                    onApply={() => handleApplyEdits(msg.id, msg.planEdits!)}
                    onDismiss={() => handleDismissEdits(msg.id)}
                  />
                </div>
              )}
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
      <div className="px-3 pb-6 pt-2 flex gap-2 border-t border-zinc-800 shrink-0">
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
