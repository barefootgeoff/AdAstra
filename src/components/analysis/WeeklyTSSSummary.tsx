import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { TrainingWeek } from '../../models/training'
import type { WorkoutLog } from '../../models/log'

interface WeekSummary {
  label: string
  planned: number
  actual: number
  pct: number   // completion %
}

function parseTSS(s?: string): number {
  if (!s || s === '—') return 0
  return parseInt(s.replace(/[^0-9]/g, ''), 10) || 0
}

function isoDateForDay(day: { date: string }, weekDates: string): string {
  const yearMatch = weekDates.match(/\d{4}/)
  const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString()
  const parts = day.date.split('/')
  if (parts.length !== 2) return ''
  return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
}

interface Props {
  weeks: TrainingWeek[]
  logs: WorkoutLog[]
}

export function WeeklyTSSSummary({ weeks, logs }: Props) {
  const data: WeekSummary[] = weeks.map(w => {
    const planned = parseTSS(w.projectedTSS)
    let actual = 0
    for (const day of w.days) {
      const iso = isoDateForDay(day, w.dates)
      const log = logs.find(l => l.date === iso && l.completed)
      if (log?.actualTSS) actual += log.actualTSS
    }
    const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0
    return { label: `W${w.week}`, planned, actual, pct }
  })

  const hasActual = data.some(d => d.actual > 0)

  if (!hasActual) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Weekly TSS — Planned vs Actual</div>
        <div className="flex items-center justify-center h-20 text-zinc-600 text-xs">
          Log workouts to see actual vs planned TSS.
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null
    const planned = payload.find(p => p.name === 'planned')?.value ?? 0
    const actual = payload.find(p => p.name === 'actual')?.value ?? 0
    const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs space-y-1">
        <div className="text-zinc-400">{label}</div>
        <div className="text-zinc-400">Planned: <span className="font-mono text-zinc-300">{planned}</span></div>
        <div className="text-blue-400">Actual: <span className="font-mono">{actual}</span></div>
        <div className="text-zinc-500">{pct}% complete</div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Weekly TSS — Planned vs Actual</div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barGap={2} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="planned" name="planned" fill="#3f3f46" radius={[2, 2, 0, 0]} />
          <Bar dataKey="actual" name="actual" radius={[2, 2, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.pct >= 90 ? '#22c55e' : entry.pct >= 70 ? '#3b82f6' : '#f59e0b'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-zinc-600 inline-block" /> Planned</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-600 inline-block" /> ≥90%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-600 inline-block" /> ≥70%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> &lt;70%</span>
      </div>
    </div>
  )
}
