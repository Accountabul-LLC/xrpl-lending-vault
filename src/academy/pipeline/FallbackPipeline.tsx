import { useSimulation } from '../simulation/SimulationContext'

/** Static/CSS pipeline used when WebGL is unavailable or reduced-motion prefers simplicity. */
export function FallbackPipeline({ lesson }: { lesson: number }) {
  const sim = useSimulation()
  const { vault } = sim.state
  const danger = sim.state.defaultedConnection

  return (
    <div className="absolute inset-0 p-4 md:p-6 flex flex-col justify-center gap-3">
      <div className="text-center">
        <div
          className="inline-block rounded-xl border border-indigo-500/50 bg-indigo-950/40 px-4 py-2 cursor-pointer"
          onClick={() => sim.selectEntity('protocol')}
          onKeyDown={() => {}}
          role="button"
          tabIndex={0}
        >
          <div className="text-xs font-semibold text-indigo-100">Protocol / Facilitator</div>
          <div className="text-[10px] text-indigo-300/80">administers ↓</div>
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className="rounded-xl border border-sky-500/40 bg-slate-950/90 px-4 py-3 w-full max-w-sm cursor-pointer"
          onClick={() => sim.selectEntity('vault')}
          role="button"
          tabIndex={0}
        >
          <div className="text-xs font-semibold text-sky-200 text-center">JRPU Lending Vault</div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono text-slate-300">
            <span>Total</span>
            <span className="text-right">${Math.round(vault.totalCapital).toLocaleString()}</span>
            <span>Available</span>
            <span className="text-right text-emerald-300">
              ${Math.round(vault.availableLiquidity).toLocaleString()}
            </span>
            <span>Lent</span>
            <span className="text-right text-amber-300">
              ${Math.round(vault.outstandingLoans).toLocaleString()}
            </span>
            <span>Interest</span>
            <span className="text-right text-indigo-300">
              ${Math.round(vault.interestEarned).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto w-full">
        <button
          type="button"
          onClick={() => sim.selectEntity('depositor')}
          className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-3 text-left"
        >
          <div className="text-xs font-semibold text-emerald-100">Depositor</div>
          <div className="text-[10px] font-mono text-emerald-200/80 mt-1">
            ${sim.primaryDepositor.deposited.toLocaleString()} deposited
          </div>
          <div className="text-[10px] text-slate-500 mt-2">capital → vault</div>
        </button>
        <button
          type="button"
          onClick={() => sim.selectEntity('borrower')}
          className={
            'rounded-xl border px-3 py-3 text-left ' +
            (danger
              ? 'border-rose-500/50 bg-rose-950/30'
              : 'border-amber-500/40 bg-amber-950/30')
          }
        >
          <div className={`text-xs font-semibold ${danger ? 'text-rose-100' : 'text-amber-100'}`}>
            Borrower
          </div>
          <div className="text-[10px] font-mono text-amber-200/80 mt-1">
            ${sim.primaryBorrower.remainingBalance.toLocaleString()} outstanding
          </div>
          <div className="text-[10px] text-slate-500 mt-2">
            {danger ? 'payment pipeline blocked' : 'loan ← vault'}
          </div>
        </button>
      </div>

      {sim.state.statusBanner && (
        <div className="text-center text-xs font-semibold text-indigo-200">{sim.state.statusBanner}</div>
      )}
      <p className="text-center text-[10px] text-slate-500">
        {lesson >= 0
          ? '2D pipeline view (WebGL unavailable or reduced). Controls below still update this state.'
          : null}
      </p>
    </div>
  )
}
