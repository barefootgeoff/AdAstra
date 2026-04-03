import type { PlanEditProposal } from '../../models/chat'
import type { TrainingPlan, WorkoutType } from '../../models/training'

const TYPE_LABELS: Record<WorkoutType, string> = {
  vo2: 'VO₂', threshold: 'THRESHOLD', sweetspot: 'SWEETSPOT',
  strength: 'STRENGTH', endurance: 'ENDURANCE', rest: 'REST', race: 'RACE',
}

function findSession(plan: TrainingPlan, weekNum: number, dayDate: string) {
  const week = plan.weeks.find(w => w.week === weekNum)
  return week?.days.find(d => d.date === dayDate) ?? null
}

function DiffRow({ label, before, after }: { label: string; before: unknown; after: unknown }) {
  const fmt = (v: unknown) => {
    if (Array.isArray(v)) return v.slice(0, 2).join(' / ') + (v.length > 2 ? '…' : '')
    return String(v ?? '—')
  }
  return (
    <div className="grid grid-cols-[80px_1fr_1fr] gap-x-2 text-xs py-0.5">
      <span className="text-zinc-600 uppercase tracking-wide text-[10px] self-center">{label}</span>
      <span className="text-zinc-500 line-through truncate">{fmt(before)}</span>
      <span className="text-emerald-400 truncate">{fmt(after)}</span>
    </div>
  )
}

interface Props {
  edits: PlanEditProposal[]
  plan: TrainingPlan
  applied: boolean
  onApply: () => void
  onDismiss: () => void
}

export function PlanEditApproval({ edits, plan, applied, onApply, onDismiss }: Props) {
  if (applied) {
    return (
      <div className="mt-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 flex items-center gap-2 text-xs text-zinc-500">
        <span className="text-emerald-500">✓</span> Plan updated
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-xl border border-blue-900/60 bg-zinc-900/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-950/40 border-b border-blue-900/40">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Plan Edit</span>
          <span className="text-[10px] text-zinc-500">{edits.length} session{edits.length > 1 ? 's' : ''}</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-zinc-600 hover:text-zinc-400 text-base leading-none px-1"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Edit rows */}
      <div className="divide-y divide-zinc-800/60">
        {edits.map((edit, idx) => {
          const existing = findSession(plan, edit.weekNum, edit.dayDate)
          const changedKeys = Object.keys(edit.changes) as Array<keyof typeof edit.changes>
          return (
            <div key={idx} className="px-3 py-2.5">
              <div className="text-xs font-medium text-zinc-200 mb-1.5">{edit.description}</div>
              {/* Column headers */}
              <div className="grid grid-cols-[80px_1fr_1fr] gap-x-2 text-[9px] uppercase tracking-widest text-zinc-700 mb-1">
                <span />
                <span>Before</span>
                <span>After</span>
              </div>
              {changedKeys.map(k => {
                const before = existing ? (existing as Record<string, unknown>)[k] : undefined
                const after = (edit.changes as Record<string, unknown>)[k]
                const label = k === 'type'
                  ? 'Type'
                  : k === 'label' ? 'Title'
                  : k === 'tss' ? 'TSS'
                  : k === 'duration' ? 'Duration'
                  : k === 'details' ? 'Details'
                  : k === 'fuel' ? 'Fuel'
                  : k === 'why' ? 'Why'
                  : String(k)
                // For type field, show labels not raw values
                const fmtBefore = k === 'type' && before ? TYPE_LABELS[before as WorkoutType] : before
                const fmtAfter = k === 'type' ? TYPE_LABELS[after as WorkoutType] : after
                return <DiffRow key={k} label={label} before={fmtBefore} after={fmtAfter} />
              })}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2.5 border-t border-zinc-800/60">
        <button
          onClick={onApply}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
        >
          Apply to plan
        </button>
        <button
          onClick={onDismiss}
          className="px-3 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
