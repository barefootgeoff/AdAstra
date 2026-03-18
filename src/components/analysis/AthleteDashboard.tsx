import type { AthleteProfile } from '../../models/athlete'
import type { TrainingLoad } from '../../models/load'
import { daysUntil } from '../../utils/trainingMath'

interface Props {
  athlete: AthleteProfile
  latestLoad: TrainingLoad | null
}

function tsbColor(tsb: number): string {
  if (tsb > 10) return 'text-green-400'
  if (tsb > -10) return 'text-yellow-400'
  return 'text-red-400'
}

function tsbLabel(tsb: number): string {
  if (tsb > 25) return 'VERY FRESH'
  if (tsb > 10) return 'FRESH'
  if (tsb > -10) return 'NEUTRAL'
  if (tsb > -25) return 'TIRED'
  return 'VERY TIRED'
}

export function AthleteDashboard({ athlete, latestLoad }: Props) {
  const primaryGoal = athlete.goals[0]
  const days = primaryGoal ? daysUntil(primaryGoal.date) : null

  const ctl = latestLoad ? latestLoad.ctl.toFixed(1) : athlete.ctlBaseline.toFixed(1)
  const atl = latestLoad ? latestLoad.atl.toFixed(1) : '—'
  const tsb = latestLoad ? latestLoad.tsb : null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-zinc-500 uppercase tracking-widest">Athlete · {athlete.name}</div>
        {primaryGoal && days !== null && (
          <div className="text-right">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{primaryGoal.name}</div>
            <div className="text-zinc-300 font-mono text-sm">{days}d out · {primaryGoal.targetTime}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Stat label="FTP" value={`${athlete.ftp}W`} />
        <Stat label="Max HR" value={`${athlete.maxHR}`} unit="bpm" />
        <Stat label="CTL" value={ctl} unit="fit" highlight />
        <Stat label="ATL" value={atl} unit="fat" />
        <Stat
          label="TSB"
          value={tsb !== null ? (tsb > 0 ? `+${tsb.toFixed(1)}` : tsb.toFixed(1)) : '—'}
          color={tsb !== null ? tsbColor(tsb) : undefined}
          sublabel={tsb !== null ? tsbLabel(tsb) : undefined}
        />
        <Stat label="Goal CTL" value={`~${athlete.ctlTarget}`} />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
  highlight,
  color,
  sublabel,
}: {
  label: string
  value: string
  unit?: string
  highlight?: boolean
  color?: string
  sublabel?: string
}) {
  return (
    <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`font-mono font-bold text-sm ${color ?? (highlight ? 'text-blue-400' : 'text-zinc-200')}`}>
        {value}
        {unit && <span className="text-zinc-500 text-[10px] ml-0.5">{unit}</span>}
      </div>
      {sublabel && <div className={`text-[9px] uppercase tracking-wider ${color ?? 'text-zinc-500'}`}>{sublabel}</div>}
    </div>
  )
}
