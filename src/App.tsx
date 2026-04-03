import { useState, useEffect } from 'react'
import { useAthlete } from './store/useAthlete'
import { useLogs } from './store/useLogs'
import { useStrava } from './hooks/useStrava'
import { useServerSync } from './hooks/useServerSync'
import { LEADVILLE_2026 } from './data/leadville2026'
import { AthleteDashboard } from './components/analysis/AthleteDashboard'
import { FitnessTargetCard } from './components/analysis/FitnessTargetCard'
import { TrainingLoadChart } from './components/analysis/TrainingLoadChart'
import { WeeklyTSSSummary } from './components/analysis/WeeklyTSSSummary'
import { WeekBlock } from './components/plan/WeekBlock'
import { LoginScreen } from './components/LoginScreen'
import { TodayView } from './components/today/TodayView'
import { CoachChat } from './components/chat/CoachChat'
import { planDateToISO, todayISO } from './utils/dateHelpers'

const SEED_DATE = '2026-03-15'

type Tab = 'today' | 'plan' | 'fitness'

const TAB_LABELS: Record<Tab, string> = { today: 'Today', plan: 'Plan', fitness: 'Fitness' }

function currentWeekIndex(): number {
  const today = todayISO()
  for (let i = 0; i < LEADVILLE_2026.weeks.length; i++) {
    const week = LEADVILLE_2026.weeks[i]
    for (const day of week.days) {
      if (planDateToISO(day.date, week.dates) === today) return i
    }
  }
  return 0
}

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [fabOpen, setFabOpen] = useState(false)
  const [coachChatOpen, setCoachChatOpen] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)

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
    authed === true, // auto-sync once authenticated
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

  const activeWeek = currentWeekIndex()

  function switchTab(t: Tab) {
    setTab(t)
    setFabOpen(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto p-4 pb-24">

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

          {/* Compact Strava status */}
          <StravaIndicator
            status={stravaStatus}
            lastSynced={lastSynced}
            onConnect={connect}
            onSync={sync}
          />
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
            {LEADVILLE_2026.weeks.map((week, i) => (
              <WeekBlock
                key={week.week}
                week={week}
                planId={LEADVILLE_2026.id}
                defaultOpen={i === activeWeek}
                logs={logs}
                athleteFTP={athlete.ftp}
                onSaveLog={saveLog}
              />
            ))}
            <div className="mt-6 text-center text-zinc-600 text-[10px] tracking-wider uppercase">
              Plan is adaptive — actual execution drives weekly adjustments
            </div>
          </>
        )}

        {tab === 'fitness' && (
          <>
            <AthleteDashboard athlete={athlete} latestLoad={latestLoad} />
            <FitnessTargetCard athlete={athlete} latestLoad={latestLoad} />
            <TrainingLoadChart
              history={loadHistory}
              seedCTL={athlete.ctlBaseline}
              seedDate={SEED_DATE}
              raceDate={athlete.goals[0]?.date ?? '2026-08-15'}
              raceCTL={athlete.ctlTarget}
            />
            <WeeklyTSSSummary weeks={LEADVILLE_2026.weeks} logs={logs} />
          </>
        )}
      </div>

      {/* FAB navigation */}
      {fabOpen && (
        // Backdrop — tap to close
        <div
          className="fixed inset-0 z-10"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* Pills — visible when open */}
      {fabOpen && (
        <div className="fixed bottom-24 right-6 z-20 flex flex-col gap-2 items-end">
          <button
            onClick={() => { setCoachChatOpen(true); setFabOpen(false) }}
            className="rounded-full px-5 py-2 text-sm font-medium shadow-lg transition-all bg-zinc-800 border-2 border-blue-500 text-blue-300 hover:bg-zinc-700"
          >
            Coach
          </button>
          {(['fitness', 'plan', 'today'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`rounded-full px-5 py-2 text-sm font-medium shadow-lg transition-all
                ${tab === t
                  ? 'bg-zinc-700 border-2 border-blue-500 text-white'
                  : 'bg-zinc-800 border border-zinc-600 text-zinc-300 hover:bg-zinc-700'
                }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {/* Coach Chat overlay */}
      {coachChatOpen && (
        <CoachChat
          athlete={athlete}
          latestLoad={latestLoad}
          loadHistory={loadHistory}
          logs={logs}
          plan={LEADVILLE_2026}
          onClose={() => setCoachChatOpen(false)}
          onUpdateBriefing={(text) => updateAthlete({ coachBriefing: text })}
        />
      )}

      {/* FAB circle */}
      <button
        onClick={() => setFabOpen(!fabOpen)}
        className={`fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200
          ${fabOpen
            ? 'bg-zinc-700 border-2 border-zinc-500 rotate-45'
            : 'bg-zinc-800 border border-zinc-600'
          }`}
        aria-label="Navigation"
      >
        {fabOpen ? (
          <span className="text-zinc-200 text-xl font-light">+</span>
        ) : (
          <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider">
            {tab[0].toUpperCase()}
          </span>
        )}
      </button>
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

  // idle — show nothing meaningful, Strava connected but not yet synced this session
  return (
    <button onClick={onSync} className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400">
      <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
      Strava
    </button>
  )
}
