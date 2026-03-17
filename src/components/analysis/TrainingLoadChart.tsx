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

interface Props {
  history: TrainingLoad[]
  seedCTL: number
  seedDate: string
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

const today = new Date().toISOString().slice(0, 10)

export function TrainingLoadChart({ history, seedCTL, seedDate }: Props) {
  if (history.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Training Load (CTL / ATL / TSB)</div>
        <div className="flex items-center justify-center h-32 text-zinc-600 text-xs">
          Log workouts to see your fitness curve.
        </div>
      </div>
    )
  }

  // Prepend seed point so chart starts from baseline
  const data = [
    { date: seedDate, ctl: seedCTL, atl: seedCTL, tsb: 0, dailyTSS: 0 },
    ...history,
  ]

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
        <div className="text-zinc-400 mb-1">{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: <span className="font-mono">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Training Load (CTL / ATL / TSB)</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
            wrapperStyle={{ fontSize: 10, color: '#71717a', paddingTop: 8 }}
            formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>}
          />
          <ReferenceLine x={today} stroke="#52525b" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="ctl" name="CTL (fitness)" stroke="#60a5fa" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="atl" name="ATL (fatigue)" stroke="#f87171" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="tsb" name="TSB (form)" stroke="#34d399" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
