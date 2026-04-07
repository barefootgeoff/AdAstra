import { calculatePowerZones, calculateHRZones } from '../../utils/zones'

interface Props {
  kind: 'power' | 'hr'
  value: number
  ftp?: number
  maxHR?: number
  onClose: () => void
}

interface ZoneRow {
  number: number
  name: string
  min: number
  max: number  // may be Infinity
  minPct: number
  maxPct: number
  color: string
}

const POWER_COLORS: Record<number, string> = {
  1: 'bg-zinc-500',
  2: 'bg-blue-500',
  3: 'bg-green-500',
  4: 'bg-yellow-500',
  5: 'bg-orange-500',
  6: 'bg-red-500',
  7: 'bg-fuchsia-500',
}

const HR_COLORS: Record<number, string> = {
  1: 'bg-zinc-500',
  2: 'bg-blue-500',
  3: 'bg-green-500',
  4: 'bg-orange-500',
  5: 'bg-red-500',
}

export function ZoneModal({ kind, value, ftp, maxHR, onClose }: Props) {
  const isPower = kind === 'power'
  const anchor = isPower ? ftp : maxHR
  if (!anchor) return null

  const zones: ZoneRow[] = isPower
    ? calculatePowerZones(anchor).map(z => ({
        number: z.number, name: z.name,
        min: z.minWatts, max: z.maxWatts,
        minPct: z.minPct, maxPct: z.maxPct,
        color: POWER_COLORS[z.number],
      }))
    : calculateHRZones(anchor).map(z => ({
        number: z.number, name: z.name,
        min: z.minBPM, max: z.maxBPM,
        minPct: z.minPct, maxPct: z.maxPct,
        color: HR_COLORS[z.number],
      }))

  // Find which zone contains the value
  const activeZone = zones.find(z => value >= z.min && value <= z.max) ?? zones[zones.length - 1]
  const unit = isPower ? 'W' : 'bpm'
  const title = isPower ? 'Power Zones' : 'HR Zones'
  const anchorLabel = isPower ? `FTP ${anchor}W` : `Max HR ${anchor}bpm`

  // Render highest zone first
  const ordered = [...zones].reverse()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-[10px] tracking-widest text-zinc-500 uppercase">{title}</div>
            <div className="text-zinc-200 text-lg font-mono mt-0.5">{value}{unit}</div>
            <div className="text-zinc-600 text-[10px] mt-0.5">{anchorLabel} · {activeZone.name} (Z{activeZone.number})</div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 text-xl leading-none -mt-1"
            aria-label="Close"
          >×</button>
        </div>

        <div className="space-y-1.5 mt-4">
          {ordered.map(z => {
            const isActive = z.number === activeZone.number
            const rangeLabel = z.max === Infinity
              ? `${z.min}+${unit}`
              : `${z.min}–${z.max}${unit}`
            // Fill: where the value sits within this zone (clamped 0–100)
            let fillPct = 0
            if (value >= z.min) {
              if (z.max === Infinity || value >= z.max) fillPct = 100
              else fillPct = Math.round(((value - z.min) / (z.max - z.min)) * 100)
            }
            return (
              <div
                key={z.number}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                  isActive
                    ? 'border-zinc-600 bg-zinc-800/80'
                    : 'border-transparent bg-zinc-800/30'
                }`}
              >
                <span className="text-zinc-500 text-[10px] font-mono w-5">Z{z.number}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className={isActive ? 'text-zinc-200' : 'text-zinc-400'}>{z.name}</span>
                    <span className="text-zinc-500 font-mono">{rangeLabel}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${z.color} ${isActive ? 'opacity-100' : 'opacity-30'}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-[10px] text-zinc-600 mt-4 text-center">
          {isPower ? 'Coggan 7-zone power model' : '5-zone HR model (% of max)'}
        </div>
      </div>
    </div>
  )
}
