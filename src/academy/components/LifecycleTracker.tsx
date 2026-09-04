import { LIFECYCLE_LABELS, LIFECYCLE_STAGES, type LifecycleStage } from '../simulation/types'

export function LifecycleTracker({ stage }: { stage: LifecycleStage }) {
  const idx = LIFECYCLE_STAGES.indexOf(stage)
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">Capital lifecycle</div>

      <div className="flex flex-wrap gap-1.5 sm:hidden">
        {LIFECYCLE_STAGES.map((s, i) => {
          const active = i === idx
          const done = i < idx
          return (
            <span
              key={s}
              className={
                'rounded-full px-2 py-0.5 text-[10px] leading-tight ' +
                (active
                  ? 'bg-indigo-600 text-white'
                  : done
                    ? 'bg-emerald-950 text-emerald-200 border border-emerald-700/50'
                    : 'bg-slate-900 text-slate-500 border border-slate-800')
              }
            >
              {LIFECYCLE_LABELS[s]}
            </span>
          )
        })}
      </div>

      <div className="hidden sm:flex items-start w-full min-w-0">
        {LIFECYCLE_STAGES.map((s, i) => {
          const active = i === idx
          const done = i < idx
          return (
            <div key={s} className="flex items-start flex-1 min-w-0 last:flex-none">
              <div className="flex flex-col items-center gap-1 min-w-0 px-0.5">
                <div
                  className={
                    'h-2.5 w-2.5 shrink-0 rounded-full border transition ' +
                    (active
                      ? 'bg-indigo-400 border-indigo-200 shadow-[0_0_10px_rgba(129,140,248,0.7)] scale-125'
                      : done
                        ? 'bg-emerald-500 border-emerald-300'
                        : 'bg-slate-800 border-slate-600')
                  }
                />
                <span
                  className={
                    'text-[10px] leading-tight text-center break-words ' +
                    (active ? 'text-indigo-200 font-semibold' : done ? 'text-slate-300' : 'text-slate-500')
                  }
                >
                  {LIFECYCLE_LABELS[s]}
                </span>
              </div>
              {i < LIFECYCLE_STAGES.length - 1 && (
                <div
                  className={
                    'h-px flex-1 min-w-[6px] mt-[5px] mx-0.5 ' +
                    (done || active ? 'bg-indigo-500/60' : 'bg-slate-700')
                  }
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
