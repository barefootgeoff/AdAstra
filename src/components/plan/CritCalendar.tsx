import { useState } from 'react'
import { CRIT_SERIES } from '../../data/leadville2026'

export function CritCalendar() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-3 bg-yellow-950/30 border border-yellow-800/50 rounded-lg">
      <div
        className="p-3 cursor-pointer flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <div className="text-[10px] tracking-widest text-yellow-600 uppercase font-bold">
          Driveway Crit Series — Thursday Integration
        </div>
        <span className="text-yellow-700 text-[10px]">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-3 text-xs border-t border-yellow-900/40 pt-3">
          {CRIT_SERIES.map((s, i) => (
            <div key={i}>
              <div className="text-yellow-500 font-medium">
                {s.name}{' '}
                <span className="text-zinc-500 font-normal">({s.dates})</span>
              </div>
              <div className="text-zinc-400 leading-relaxed pl-2 mt-0.5">{s.schedule}</div>
            </div>
          ))}
          <div className="text-[10px] text-zinc-600 border-t border-zinc-800 pt-2">
            Rule: If Saturday long ride quality declines from Thursday crit fatigue, crits revert to threshold sessions.
          </div>
        </div>
      )}
    </div>
  )
}
