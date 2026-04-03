import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { TrainingLoad } from '../../models/load'
import { buildTargetCTLSeries } from '../../utils/targetCTL'

interface Props {
  history: TrainingLoad[]
  seedCTL: number
  seedDate: string
  raceDate: string
  raceCTL: number
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

const today = new Date().toISOString().slice(0, 10)

export function TrainingLoadChart({ history, seedCTL, seedDate, raceDate, raceCTL }: Props) {
  // Build target series from seedDate to raceDate
  const targetSeries = buildTargetCTLSeries(seedDate, raceDate, seedCTL, raceCTL)

  // Build a lookup from date → targetCtl
  const targetMap = new Map(targetSeries.map(p => [p.date, p.targetCtl]))

  // Merge historical actual data with target CTL
  const actualPoints = history.length > 0
    ? [{ date: seedDate, ctl: seedCTL, atl: seedCTL, tsb: 0, dailyTSS: 0 }, ...history]
    : []

  // All dates that need to appear: actual dates + future target dates
  const actualDates = new Set(actualPoints.map(p => p.date))
  const futureDates = targetSeries.filter(p => p.date > today && !actualDates.has(p.date))

  // Merge: actual points get targetCtl; future points have no actual metrics
  type ChartPoint = {
    date: string
    ctl?: number
    atl?: number
    tsb?: number
    targetCtl?: number
  }

  const merged: ChartPoint[] = [
    ...actualPoints.map(p => ({
      ...p,
      targetCtl: targetMap.get(p.date),
    })),
    ...futureDates.map(p => ({
      date: p.date,
      targetCtl: p.targetCtl,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string }>
    label?: string
  }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
        <div className="text-zinc-400 mb-1">{label}</div>
        {payload.map(p => p.value != null && (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: <span className="font-mono">{p.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    )
  }

  const isEmpty = history.length === 0

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Training Load</div>
        {isEmpty && (
          <div className="text-[10px] text-zinc-600">Log workouts to see your actual curve</div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={merged} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: '#71717a', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#71717a', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
            formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>}
          />

          {/* Today */}
          <ReferenceLine x={today} stroke="#52525b" strokeDasharray="3 3" />
          {/* Race day */}
          <ReferenceLine
            x={raceDate}
            stroke="#78350f"
            strokeDasharray="4 2"
            label={{ value: 'LT100', position: 'top', fill: '#92400e', fontSize: 9 }}
          />

          {/* Target CTL — shown across entire range */}
          <Line
            type="monotone"
            dataKey="targetCtl"
            name="Target CTL"
            stroke="#f59e0b"
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            connectNulls
          />

          {/* Actual lines — only meaningful where data exists */}
          {!isEmpty && (
            <>
              <Line type="monotone" dataKey="ctl" name="CTL (fitness)" stroke="#60a5fa" dot={false} strokeWidth={2} connectNulls={false} />
              <Line type="monotone" dataKey="atl" name="ATL (fatigue)" stroke="#f87171" dot={false} strokeWidth={1.5} strokeDasharray="4 2" connectNulls={false} />
              <Line type="monotone" dataKey="tsb" name="TSB (form)" stroke="#34d399" dot={false} strokeWidth={1.5} connectNulls={false} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
