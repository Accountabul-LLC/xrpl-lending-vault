import {
  LENDING_STAGE_LABELS,
  LENDING_STAGES,
  stageProgress
} from '../experience/lendingProcess'
import { formatUsd, STORY_STEPS } from '../experience/story'
import { useSimulation } from '../simulation/SimulationContext'

export function ProcessHud() {
  const sim = useSimulation()
  const { vault } = sim.state
  const progress = stageProgress(sim.state.currentStep)
  const advanced = sim.state.showAdvancedRoles
  const loanLive = sim.state.currentStep >= 5
  const step = Math.max(1, Math.min(10, sim.state.currentStep))
  const meta = STORY_STEPS[step - 1]

  return (
    <div
      data-viz-hud
      className="absolute inset-x-0 top-0 z-[var(--z-banner)] pointer-events-none p-2 sm:p-3"
    >
      <div className="mx-auto w-full max-w-5xl rounded-xl border border-sky-500/35 bg-slate-950/92 px-3 py-2 shadow-lg backdrop-blur-sm pointer-events-auto min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
          <div className="min-w-0 w-full sm:flex-1 sm:w-auto">
            <div className="text-[10px] uppercase tracking-wide text-sky-300">Lending system</div>
            <div className="text-xs font-semibold text-slate-100 truncate">
              {sim.state.statusBanner ?? `Step ${step} · ${meta?.title ?? 'Configure'}`}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-slate-300 w-full sm:w-auto shrink-0">
            <span>
              <span className="text-slate-500">Capital </span>
              <span className="text-slate-100">{formatUsd(vault.totalCapital)}</span>
            </span>
            <span>
              <span className="text-slate-500">Available </span>
              <span className="text-emerald-300">{formatUsd(vault.availableLiquidity)}</span>
            </span>
            <span>
              <span className="text-slate-500">Lent </span>
              <span className="text-amber-300">{formatUsd(vault.outstandingLoans)}</span>
            </span>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={advanced}
              onChange={(e) => sim.toggleAdvanced(e.target.checked)}
              className="rounded border-slate-600"
            />
            Advanced process
          </label>
        </div>

        <ol className="mt-2 grid grid-cols-7 gap-1 min-w-0" aria-label="Loan status">
          {LENDING_STAGES.map((id) => {
            const status = progress[id]
            return (
              <li key={id} className="min-w-0 text-center">
                <div
                  className={
                    'mx-auto h-1.5 rounded-full ' +
                    (status === 'active'
                      ? 'bg-sky-400'
                      : status === 'done'
                        ? 'bg-emerald-500'
                        : loanLive
                          ? 'bg-slate-700'
                          : 'bg-slate-800')
                  }
                />
                <span
                  className={
                    'mt-1 block text-[9px] leading-tight truncate ' +
                    (status === 'active'
                      ? 'text-sky-200 font-semibold'
                      : status === 'done'
                        ? 'text-slate-300'
                        : 'text-slate-500')
                  }
                >
                  {LENDING_STAGE_LABELS[id]}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
