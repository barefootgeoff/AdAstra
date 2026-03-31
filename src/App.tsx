import { useState, useEffect } from 'react'
import { useAthlete } from './store/useAthlete'
import { useLogs } from './store/useLogs'
import { useStrava } from './hooks/useStrava'
import { useServerSync } from './hooks/useServerSync'
import { LEADVILLE_2026 } from './data/leadville2026'
import { AthleteDashboard } from './components/analysis/AthleteDashboard'
import { TrainingLoadChart } from './components/analysis/TrainingLoadChart'
import { WeeklyTSSSummary } from './components/analysis/WeeklyTSSSummary'
import { WeekBlock } from './components/plan/WeekBlock'
import { LoginScreen } from './components/LoginScreen'
import { TodayView } from './components/today/TodayView'
import { planDateToISO, todayISO } from './utils/dateHelpers'

// The seed date is the day before Week 11 starts — baseline state
const SEED_DATE = '2026-03-15'

type Tab = 'today' | 'plan' | 'fitness'

// Find the index of the week that contains today, for auto-open
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
  const [authed, setAuthed] = useState<boolean | null>(null) // null = checking

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
  )

  // Determine auth state from server sync result
  useEffect(() => {
    if (syncState === 'unauthenticated') setAuthed(false)
    else if (syncState === 'ready' || syncState === 'error') setAuthed(true)
    // 'loading' → keep null (show nothing / spinner)
  }, [syncState])

  // Hydrate local state from server on first load
  useEffect(() => {
    if (syncState !== 'ready' || !serverData) return
    if (serverData.athlete) hydrateAthlete(serverData.athlete)
    if (serverData.logs.length > 0) hydrateLogs(serverData.logs)
  }, [syncState]) // eslint-disable-line react-hooks/exhaustive-deps

  if (authed === null) {
    return <div className="min-h-screen bg-zinc-950" />
  }

  if (authed === false) {
    return <LoginScreen onLogin={() => setAuthed(true)} />
  }

  const activeWeek = currentWeekIndex()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Scrollable content area with bottom padding for tab bar */}
      <div className="max-w-2xl mx-auto p-4 pb-20">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'Georgia, serif' }}>
              AdAstra
            </h1>
            <p className="text-zinc-500 text-[10px] mt-0.5 tracking-widest uppercase">
              Leadville 100 · Aug 15, 2026
            </p>
          </div>

          {/* Strava sync */}
          <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
            {stravaStatus === 'not_connected' ? (
              <button
                onClick={connect}
                className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded font-medium transition-colors"
              >
                Connect Strava
              </button>
            ) : (
              <button
                onClick={sync}
                disabled={stravaStatus === 'syncing'}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 px-3 py-1.5 rounded font-medium transition-colors"
              >
                {stravaStatus === 'syncing' ? 'Syncing…' : 'Sync Strava'}
              </button>
            )}
            {lastSynced && (
              <span className="text-[10px] text-zinc-600">
                Synced {lastSynced.toLocaleTimeString()}
              </span>
            )}
            {stravaStatus === 'error' && (
              <span className="text-[10px] text-red-500">Sync failed</span>
            )}
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
            <TrainingLoadChart
              history={loadHistory}
              seedCTL={athlete.ctlBaseline}
              seedDate={SEED_DATE}
            />
            <WeeklyTSSSummary weeks={LEADVILLE_2026.weeks} logs={logs} />
          </>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex z-10">
        {(['today', 'plan', 'fitness'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs uppercase tracking-widest font-medium transition-colors
              ${tab === t
                ? 'text-white border-t-2 border-blue-500'
                : 'text-zinc-500 hover:text-zinc-300 border-t-2 border-transparent'
              }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
