import { useState, useEffect } from 'react'
import { useAthlete } from './store/useAthlete'
import { useLogs } from './store/useLogs'
import { usePlan } from './store/usePlan'
import { useStrava } from './hooks/useStrava'
import { useServerSync } from './hooks/useServerSync'
import { AthleteDashboard } from './components/analysis/AthleteDashboard'
import { TrainingLoadChart } from './components/analysis/TrainingLoadChart'
import { WeeklyTSSSummary } from './components/analysis/WeeklyTSSSummary'
import { WeekBlock } from './components/plan/WeekBlock'
import { CritCalendar } from './components/plan/CritCalendar'
import { LoginScreen } from './components/LoginScreen'
import { TodayView } from './components/today/TodayView'
import { CoachChat } from './components/chat/CoachChat'
import type { TrainingWeek } from './models/training'
import type { TodayContext } from './models/chat'
import { planDateToISO, todayISO } from './utils/dateHelpers'

const SEED_DATE = '2026-03-15'

type Tab = 'today' | 'plan' | 'fitness'

const TAB_LABELS: Record<Tab, string> = { today: 'Today', plan: 'Plan', fitness: 'Fitness' }
const TAB_ICONS: Record<Tab, string> = { today: '◎', plan: '≡', fitness: '∿' }

function currentWeekIndex(weeks: TrainingWeek[]): number {
  const today = todayISO()
  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i]
    for (const day of week.days) {
      if (planDateToISO(day.date, week.dates) === today) return i
    }
  }
  return 0
}

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [coachChatOpen, setCoachChatOpen] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)

  const { plan, applyPlanEdits } = usePlan()
  const { syncState, serverData, pushAthlete, pushLogs } = useServerSync()

  const { athlete, updateAthlete, hydrateFromServer: hydrateAthlete } = useAthlete({
    onPushAthlete: pushAthlete,
  })
  const {
    logs, saveLog, syncLogs, hydrateFromServer: hydrateLogs,
    loadHistory, latestLoad,
  } = useLogs(SEED_DATE, athlete.ctlBaseline, athlete.ctlBaseline, {
    onPushLogs: pushLogs,
  })

  const { status: stravaStatus, lastSynced, connect, sync } = useStrava(
    athlete.ftp,
    syncLogs,
    (maxHR) => { if (maxHR > athlete.maxHR) updateAthlete({ maxHR }) },
    authed === true,
  )

  useEffect(() => {
    if (syncState === 'unauthenticated') setAuthed(false)
    else if (syncState === 'ready' || syncState === 'error') setAuthed(true)
  }, [syncState])

  useEffect(() => {
    if (syncState !== 'ready' || !serverData) return
    if (serverData.athlete) hydrateAthlete(serverData.athlete)
    if (serverData.logs.length > 0) hydrateLogs(serverData.logs)
  }, [syncState]) // eslint-disable-line react-hooks/exhaustive-deps

  if (authed === null) return <div className="min-h-screen bg-zinc-950" />
  if (authed === false) return <LoginScreen onLogin={() => setAuthed(true)} />

  const activeWeek = currentWeekIndex(plan.weeks)

  // Compute today's plan entry + log for coach context
  const todayStr = todayISO()
  const todayPlanEntry = (() => {
    for (const week of plan.weeks)
      for (const day of week.days)
        if (planDateToISO(day.date, week.dates) === todayStr) return day
    return null
  })()
  const todayLogEntry = logs.find(l => l.date === todayStr) ?? null
  const todayContext: TodayContext = {
    session: todayPlanEntry
      ? { label: todayPlanEntry.label, type: todayPlanEntry.type, details: todayPlanEntry.details, tss: todayPlanEntry.tss, duration: todayPlanEntry.duration }
      : null,
    log: todayLogEntry?.completed
      ? { actualTSS: todayLogEntry.actualTSS, normalizedWatts: todayLogEntry.normalizedWatts, avgHR: todayLogEntry.avgHR, rpe: todayLogEntry.rpe, notes: todayLogEntry.notes }
      : null,
    sessionDone: todayLogEntry?.completed ?? false,
  }

  function switchTab(t: Tab) {
    setTab(t)
    setDrawerOpen(false)
  }

  function openCoach() {
    setCoachChatOpen(true)
    setDrawerOpen(false)
  }

  return (
    <div className={`min-h-screen bg-zinc-950 text-zinc-100 transition-[filter] duration-200 ${coachChatOpen ? 'blur-sm' : ''}`}>
      <div className="max-w-2xl mx-auto p-4 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'Georgia, serif' }}>
              AdAstra
            </h1>
            <p className="text-zinc-500 text-[10px] mt-0.5 tracking-widest uppercase">
              Leadville 100 · Aug 15, 2026
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StravaIndicator
              status={stravaStatus}
              lastSynced={lastSynced}
              onConnect={connect}
              onSync={sync}
            />
            {/* Hamburger button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col justify-center items-center gap-1 w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
              aria-label="Menu"
            >
              <span className="w-4 h-px bg-zinc-400" />
              <span className="w-4 h-px bg-zinc-400" />
              <span className="w-4 h-px bg-zinc-400" />
            </button>
          </div>
        </div>

        {/* Tab content */}
        {tab === 'today' && (
          <TodayView
            athlete={athlete}
            latestLoad={latestLoad}
            logs={logs}
            loadHistory={loadHistory}
            athleteFTP={athlete.ftp}
            onSaveLog={saveLog}
          />
        )}

        {tab === 'plan' && (
          <>
            {plan.weeks.map((week, i) => (
              <WeekBlock
                key={week.week}
                week={week}
                planId={plan.id}
                defaultOpen={i === activeWeek}
                logs={logs}
                athleteFTP={athlete.ftp}
                onSaveLog={saveLog}
              />
            ))}
            <CritCalendar />
            <div className="mt-6 text-center text-zinc-600 text-[10px] tracking-wider uppercase">
              Plan is adaptive — actual execution drives weekly adjustments
            </div>
          </>
        )}

        {tab === 'fitness' && (
          <>
            <AthleteDashboard athlete={athlete} latestLoad={latestLoad} />
            <TrainingLoadChart
              history={loadHistory}
              seedCTL={athlete.ctlBaseline}
              seedDate={SEED_DATE}
            />
            <WeeklyTSSSummary weeks={plan.weeks} logs={logs} />
          </>
        )}
      </div>

      {/* Side drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Side drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-64 bg-zinc-900 border-l border-zinc-800 flex flex-col transition-transform duration-200 ease-out
          ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
          <span className="text-sm font-semibold text-zinc-200 tracking-wide">Menu</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-zinc-500 hover:text-zinc-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col py-2">
          {(['today', 'plan', 'fitness'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex items-center gap-3 px-4 py-3.5 text-sm text-left transition-colors
                ${tab === t
                  ? 'text-white bg-zinc-800 border-r-2 border-blue-500'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
            >
              <span className="text-base w-5 text-center opacity-60">{TAB_ICONS[t]}</span>
              {TAB_LABELS[t]}
            </button>
          ))}

        </nav>
      </div>

      {/* Coach FAB */}
      {!coachChatOpen && (
        <button
          onClick={openCoach}
          aria-label="Open Coach"
          className="fixed bottom-6 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 shadow-lg hover:bg-zinc-700 active:scale-95 transition-all duration-150"
        >
          <span className="text-blue-300 text-base leading-none">✦</span>
          <span className="text-sm font-medium text-zinc-200 tracking-wide">Coach</span>
        </button>
      )}

      {/* Coach Chat overlay */}
      {coachChatOpen && (
        <CoachChat
          athlete={athlete}
          latestLoad={latestLoad}
          loadHistory={loadHistory}
          logs={logs}
          plan={plan}
          activeTab={tab}
          todayContext={todayContext}
          onClose={() => setCoachChatOpen(false)}
          onUpdateBriefing={(text) => updateAthlete({ coachBriefing: text })}
          onApplyPlanEdits={applyPlanEdits}
        />
      )}
    </div>
  )
}

// ─── Compact Strava status indicator ─────────────────────────────────────────

function StravaIndicator({
  status,
  lastSynced,
  onConnect,
  onSync,
}: {
  status: string
  lastSynced: Date | null
  onConnect: () => void
  onSync: () => void
}) {
  if (status === 'not_connected') {
    return (
      <button onClick={onConnect} className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300">
        <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
        Connect Strava
      </button>
    )
  }
  if (status === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <span className="w-2 h-2 rounded-full bg-zinc-500 shrink-0 animate-pulse" />
        Syncing…
      </div>
    )
  }
  if (status === 'error') {
    return (
      <button onClick={onSync} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300">
        <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
        Sync failed — retry
      </button>
    )
  }
  if (status === 'done' && lastSynced) {
    return (
      <button onClick={onSync} className="flex items-center gap-1.5 text-xs text-green-500 hover:text-green-400">
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        Synced {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </button>
    )
  }
  return (
    <button onClick={onSync} className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400">
      <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
      Strava
    </button>
  )
}
