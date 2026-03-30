import { useAthlete } from './store/useAthlete'
import { useLogs } from './store/useLogs'
import { useStrava } from './hooks/useStrava'
import { LEADVILLE_2026 } from './data/leadville2026'
import { AthleteDashboard } from './components/analysis/AthleteDashboard'
import { TrainingLoadChart } from './components/analysis/TrainingLoadChart'
import { WeeklyTSSSummary } from './components/analysis/WeeklyTSSSummary'
import { WeekBlock } from './components/plan/WeekBlock'

// The seed date is the day before Week 11 starts — baseline state
const SEED_DATE = '2026-03-15'

export default function App() {
  const { athlete } = useAthlete()
  const { logs, saveLog, syncLogs, loadHistory, latestLoad } = useLogs(
    SEED_DATE,
    athlete.ctlBaseline,
    // ATL seed: same as CTL for stable starting point (TSB ≈ 0)
    athlete.ctlBaseline,
  )
  const { status: stravaStatus, lastSynced, connect, sync } = useStrava(athlete.ftp, syncLogs)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 pb-16">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: 'Georgia, serif' }}>
              LT100 MTB — Training Plan
            </h1>
            <p className="text-zinc-500 text-xs mt-1 tracking-wider uppercase">
              Race Across the Sky · August 15, 2026 · Sub-9 Hour Target
            </p>
          </div>

          {/* Strava sync button */}
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
                Last synced {lastSynced.toLocaleTimeString()}
              </span>
            )}
            {stravaStatus === 'error' && (
              <span className="text-[10px] text-red-500">Sync failed — try again</span>
            )}
          </div>
        </div>

        {/* Athlete dashboard — live CTL/ATL/TSB */}
        <AthleteDashboard athlete={athlete} latestLoad={latestLoad} />

        {/* Weekly structure legend */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 mb-4">
          <div className="text-[10px] tracking-widest text-zinc-500 uppercase mb-2">Weekly Structure</div>
          <div className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-red-400 font-medium">Mon</span> VO₂ →{' '}
            <span className="text-purple-400 font-medium">Tue</span> Strength →{' '}
            <span className="text-zinc-500 font-medium">Wed</span> Rest →{' '}
            <span className="text-orange-400 font-medium">Thu</span> Threshold →{' '}
            <span className="text-zinc-500 font-medium">Fri</span> Rest →{' '}
            <span className="text-blue-400 font-medium">Sat</span> Long Ride →{' '}
            <span className="text-blue-400 font-medium">Sun</span> Endurance
          </div>
        </div>

        {/* Training load chart */}
        <TrainingLoadChart
          history={loadHistory}
          seedCTL={athlete.ctlBaseline}
          seedDate={SEED_DATE}
        />

        {/* Weekly TSS summary */}
        <WeeklyTSSSummary weeks={LEADVILLE_2026.weeks} logs={logs} />

        {/* Training weeks */}
        {LEADVILLE_2026.weeks.map((week, i) => (
          <WeekBlock
            key={week.week}
            week={week}
            planId={LEADVILLE_2026.id}
            defaultOpen={i === 0}
            logs={logs}
            athleteFTP={athlete.ftp}
            onSaveLog={saveLog}
          />
        ))}

        <div className="mt-6 text-center text-zinc-600 text-[10px] tracking-wider uppercase">
          Plan is adaptive — actual execution drives weekly adjustments
        </div>
      </div>
    </div>
  )
}
