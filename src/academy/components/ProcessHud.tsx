import {
  LENDING_STAGE_LABELS,
  LENDING_STAGES,
  stageProgress
} from '../experience/lendingProcess'
import { formatUsd } from '../experience/story'
import { useSimulation } from '../simulation/SimulationContext'

export function ProcessHud() {
  const sim = useSimulation()
  const { vault } = sim.state
  const progress = stageProgress(sim.state.currentStep)
  const advanced = sim.state.showAdvancedRoles
  const loanLive = sim.state.currentStep >= 5

  return (
    <div
      data-viz-hud
      className="absolute inset-x-0 top-0 z-[var(--z-banner)] pointer-events-none p-2 sm:p-3"
    >
      <div className="mx-auto max-w-4xl rounded-xl border border-sky-500/35 bg-slate-950/90 px-3 py-2 shadow-lg backdrop-blur-sm pointer-events-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            {sim.state.statusBanner ? (
              <div className="text-[10px] font-semibold tracking-wide text-indigo-200 truncate">
                {sim.state.statusBanner}
              </div>
            ) : (
              <div className="text-[10px] font-semibold tracking-wide text-sky-200 truncate">
                Watch a loan move through the financial system
              </div>
            )}
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

        <div className="mt-1.5 grid grid-cols-3 gap-x-3 text-[10px] font-mono text-slate-300">
          <div>
            <div className="text-slate-500">Capital</div>
            <div className="text-slate-100">{formatUsd(vault.totalCapital)}</div>
          </div>
          <div>
            <div className="text-slate-500">Available</div>
            <div className="text-emerald-300">{formatUsd(vault.availableLiquidity)}</div>
          </div>
          <div>
            <div className="text-slate-500">Lent</div>
            <div className="text-amber-300">{formatUsd(vault.outstandingLoans)}</div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-0.5 min-w-0" aria-label="Loan lifecycle">
          {LENDING_STAGES.map((id, i) => {
            const status = progress[id]
            return (
              <div key={id} className="flex items-center flex-1 min-w-0 last:flex-none">
                <div className="flex flex-col items-center gap-0.5 min-w-0 px-0.5">
                  <div
                    className={
                      'h-2 w-2 rounded-full border shrink-0 ' +
                      (status === 'active'
                        ? 'bg-sky-400 border-sky-100 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                        : status === 'done'
                          ? 'bg-emerald-500 border-emerald-300'
                          : loanLive
                            ? 'bg-slate-800 border-slate-600'
                            : 'bg-slate-900 border-slate-700')
                    }
                  />
                  <span
                    className={
                      'hidden sm:block text-[9px] leading-tight text-center ' +
                      (status === 'active'
                        ? 'text-sky-200 font-semibold'
                        : status === 'done'
                          ? 'text-slate-300'
                          : 'text-slate-500')
                    }
                  >
                    {LENDING_STAGE_LABELS[id]}
                  </span>
                </div>
                {i < LENDING_STAGES.length - 1 && (
                  <div
                    className={
                      'h-px flex-1 min-w-[4px] mb-3 sm:mb-4 ' +
                      (status === 'done' || status === 'active' ? 'bg-sky-500/50' : 'bg-slate-800')
                    }
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
