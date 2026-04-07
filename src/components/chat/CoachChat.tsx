import { useState, useRef, useEffect, useCallback } from 'react'
import type { AthleteProfile } from '../../models/athlete'
import type { AthleteMemory } from '../../models/athlete'
import type { TrainingLoad } from '../../models/load'
import type { WorkoutLog } from '../../models/log'
import type { TrainingPlan } from '../../models/training'
import type { PlanEditProposal, CoachTab, TodayContext, ChatMessage, ChatThread } from '../../models/chat'
import { useChat } from '../../store/useChat'
import { useThreads } from '../../store/useThreads'
import { planDateToISO, todayISO } from '../../utils/dateHelpers'
import { findLogForSession } from '../../utils/logMatch'
import { Markdown } from '../../utils/markdown'
import { PlanEditApproval } from './PlanEditApproval'

function getStarters(tab: CoachTab, sessionDone: boolean): string[] {
  if (tab === 'today') {
    return sessionDone
      ? ["How did my ride look?", "What should I focus on tomorrow?", "How's my recovery?", "Did I hit my targets?"]
      : ["How should I approach today's session?", "Is my form right for this?", "What zones should I target?", "Should I do the alt workout?"]
  }
  if (tab === 'plan') {
    return ["Help me adjust this week", "Should I move this session?", "Am I peaking at the right time?", "Can we add a recovery day?"]
  }
  return ["Analyze my training load", "Am I building too fast?", "When will I peak?", "Is my CTL on target?"]
}

function getIntroText(tab: CoachTab, sessionDone: boolean): string {
  if (tab === 'today') return sessionDone ? "Great ride — let's debrief." : "Ready to prep for today's ride?"
  if (tab === 'plan') return "Looking at your plan — what needs adjusting?"
  return "Looking at your load trends — what do you want to know?"
}

function getPlaceholder(tab: CoachTab, sessionDone: boolean): string {
  if (tab === 'today' && !sessionDone) return "How should I approach today's session?"
  if (tab === 'today' && sessionDone) return "How did my ride look?"
  if (tab === 'plan') return "Ask about your plan…"
  return "Ask about your fitness…"
}

interface Props {
  athlete: AthleteProfile
  latestLoad: TrainingLoad | null
  loadHistory: TrainingLoad[]
  logs: WorkoutLog[]
  plan: TrainingPlan
  activeTab: CoachTab
  todayContext: TodayContext
  memory: AthleteMemory
  mergeMemory: (incoming: AthleteMemory) => void
  onClose: () => void
  onUpdateBriefing: (text: string) => void  // kept for App.tsx compat
  onApplyPlanEdits: (edits: PlanEditProposal[]) => void
  seedRide?: { sessionLabel: string; summaryText: string; logId: string } | null
}

export function CoachChat({
  athlete, latestLoad, loadHistory, logs, plan,
  activeTab, todayContext,
  memory, mergeMemory,
  onClose, onApplyPlanEdits, seedRide,
}: Props) {
  const { getRecentThreads, createThread, updateThreadTimestamp } = useThreads()

  const [activeThread, setActiveThread] = useState<ChatThread | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Use active thread id as the chat key; fall back to '__none__' when no thread selected
  const { messages, addMessage, updateMessage, clearMessages } = useChat(activeThread?.id ?? '__none__')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // On mount: if seedRide provided, create a ride thread and pre-seed it with the summary
  useEffect(() => {
    if (!seedRide) return
    const thread = createThread('ride', seedRide.sessionLabel, seedRide.logId)
    // Write seed message to localStorage before setting active thread so useChat picks it up
    const seedMsg: ChatMessage = {
      id: `seed-${Date.now()}`,
      role: 'assistant',
      content: seedRide.summaryText,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(`adastra:chat:${thread.id}`, JSON.stringify([seedMsg]))
    setActiveThread(thread)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
        const log = findLogForSession(logs, iso, d.type)
        return {
          label: d.label, type: d.type,
          day: d.day, date: d.date,
          completed: log?.completed ?? false, skipped: log?.skipped ?? false,
        }
      })
      currentWeek = {
        weekNum: currentWeekData.week, phase: currentWeekData.phase,
        projectedTSS: currentWeekData.projectedTSS, days: weekDays,
      }
    }

    const nextWeek = nextWeekData ? {
      weekNum: nextWeekData.week, phase: nextWeekData.phase,
      projectedTSS: nextWeekData.projectedTSS,
      days: nextWeekData.days.map(d => ({ label: d.label, type: d.type, day: d.day, date: d.date })),
    } : null

    return {
      athlete: { name: athlete.name, ftp: athlete.ftp, maxHR: athlete.maxHR, weight: athlete.weight, goals: athlete.goals },
      coachBriefing: athlete.coachBriefing,
      memory: Object.keys(memory).length > 0 ? memory : undefined,
      fitness: latestLoad ? { ctl: latestLoad.ctl, atl: latestLoad.atl, tsb: latestLoad.tsb } : null,
      currentWeek, nextWeek,
      recentLoad: loadHistory.slice(-14).map(l => ({ date: l.date, ctl: l.ctl, atl: l.atl, tsb: l.tsb, dailyTSS: l.dailyTSS })),
      compliance,
      activeTab,
      todayContext,
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
    if (!text.trim() || loading || !activeThread) return
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }
    addMessage(userMsg)
    setInput('')
    setLoading(true)
    updateThreadTimestamp(activeThread.id)

    try {
      const res = await fetch('/api/chat/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].slice(-20),
          context: buildContext(),
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error === 'overloaded' ? 'overloaded' : 'chat_failed')
      }
      const data = await res.json() as { reply: string; planEdits?: PlanEditProposal[]; memoryUpdate?: AthleteMemory }
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        planEdits: data.planEdits?.length ? data.planEdits : undefined,
        editsApplied: false,
      })
      if (data.memoryUpdate) {
        mergeMemory(data.memoryUpdate)
      }
    } catch (err) {
      const isOverloaded = err instanceof Error && err.message === 'overloaded'
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: isOverloaded
          ? 'The AI is overloaded right now — try again in a moment.'
          : "Sorry, I couldn't connect. Try again.",
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  // ── Thread list view ─────────────────────────────────────────────────────────
  if (!activeThread) {
    const recentThreads = getRecentThreads()
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-blue-300 text-sm leading-none">✦</span>
            <span className="text-sm font-semibold text-zinc-100 tracking-wide">Coach</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none px-1" aria-label="Close">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {recentThreads.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] tracking-widest text-zinc-600 uppercase mb-2">Recent</div>
              <div className="flex flex-col gap-1">
                {recentThreads.map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => setActiveThread(thread)}
                    className="w-full text-left px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors"
                  >
                    <div className="text-sm text-zinc-200">{thread.label}</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-wider">{thread.type === 'ride' ? 'Post-ride' : 'General'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setActiveThread(createThread('general'))}
            className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-200 text-left transition-colors flex items-center gap-2"
          >
            <span className="text-blue-300 text-base">+</span>
            New conversation
          </button>
        </div>
      </div>
    )
  }

  // ── Active thread view ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveThread(null)}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            aria-label="Back to threads"
          >
            ←
          </button>
          <span className="text-blue-300 text-sm leading-none">✦</span>
          <span className="text-sm text-zinc-300 truncate max-w-[180px]">{activeThread.label}</span>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-3 pt-2">
            <p className="text-zinc-500 text-sm text-center">
              {getIntroText(activeTab, todayContext.sessionDone)}
            </p>
            <div className="flex flex-col gap-2">
              {getStarters(activeTab, todayContext.sessionDone).map(s => (
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
          placeholder={getPlaceholder(activeTab, todayContext.sessionDone)}
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
