interface Props {
  summary: string | null
  loading: boolean
  onDiscuss: () => void
}

export function RideSummary({ summary, loading, onDiscuss }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl mt-4 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="text-[10px] tracking-widest text-zinc-500 uppercase">Ride Summary</div>
        <span className="text-blue-300 text-sm leading-none">✦</span>
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm tracking-widest">···</span>
            <span className="text-zinc-600 text-xs">Analyzing your ride…</span>
          </div>
        ) : summary ? (
          <p className="text-zinc-300 text-sm leading-relaxed">{summary}</p>
        ) : (
          <p className="text-zinc-600 text-sm">Summary unavailable — open Coach to debrief.</p>
        )}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={onDiscuss}
          className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-blue-300">✦</span>
          Discuss with Coach
        </button>
      </div>
    </div>
  )
}
