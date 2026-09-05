import { formatUsd, STORY } from '../experience/story'
import { useSimulation } from '../simulation/SimulationContext'

/** 2D people + vault used when WebGL is unavailable. Same business layout as the 3D world. */
export function FallbackPipeline({ lesson }: { lesson: number }) {
  const sim = useSimulation()
  const { vault } = sim.state
  const danger = sim.state.defaultedConnection || sim.state.missedPayment
  void lesson

  return (
    <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-center gap-3 overflow-y-auto">
      <button
        type="button"
        onClick={() => sim.selectEntity('administrator')}
        className="mx-auto rounded-xl border border-indigo-500/50 bg-indigo-950/40 px-4 py-2 text-center"
      >
        <PersonIcon className="text-indigo-200 mx-auto" />
        <div className="text-xs font-semibold text-indigo-100">Administrator</div>
        <div className="text-[10px] text-indigo-300/80">Protocol office · sets the rules</div>
      </button>

      <div className="flex items-stretch justify-center gap-2 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={() => sim.selectEntity('depositor')}
          className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-3 text-center min-w-0 flex-1 max-w-[12rem]"
        >
          <PersonIcon className="text-emerald-200 mx-auto" />
          <div className="text-xs font-semibold text-emerald-100">Depositor / Lender</div>
          <div className="text-[10px] font-mono text-emerald-200/80 mt-1">
            {formatUsd(sim.primaryDepositor.deposited)} deposited
          </div>
        </button>

        <button
          type="button"
          onClick={() => sim.selectEntity('vault')}
          className="rounded-xl border border-sky-500/40 bg-slate-950/90 px-4 py-3 w-full max-w-xs"
        >
          <VaultIcon />
          <div className="text-xs font-semibold text-sky-200 text-center mt-1">Lending Vault</div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono text-slate-300">
            <span>Capital</span>
            <span className="text-right">{formatUsd(vault.totalCapital)}</span>
            <span>Available</span>
            <span className="text-right text-emerald-300">{formatUsd(vault.availableLiquidity)}</span>
            <span>Lent</span>
            <span className="text-right text-amber-300">{formatUsd(vault.outstandingLoans)}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => sim.selectEntity('borrower')}
          className={
            'rounded-xl border px-3 py-3 text-center min-w-0 flex-1 max-w-[12rem] ' +
            (danger ? 'border-rose-500/50 bg-rose-950/30' : 'border-amber-500/40 bg-amber-950/30')
          }
        >
          <PersonIcon className={danger ? 'text-rose-200 mx-auto' : 'text-amber-200 mx-auto'} />
          <div className={`text-xs font-semibold ${danger ? 'text-rose-100' : 'text-amber-100'}`}>
            Borrower
          </div>
          <div className="text-[10px] font-mono text-amber-200/80 mt-1">
            {formatUsd(sim.primaryBorrower.outstandingPrincipal || sim.primaryBorrower.remainingBalance)}{' '}
            outstanding
          </div>
        </button>
      </div>

      {(sim.state.agreementAccepted || sim.state.currentStep === 8) && (
        <div className="mx-auto rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-[11px] font-mono text-slate-300">
          Agreement · Principal {formatUsd(STORY.loan)} · 10% APR · 12 months · monthly
        </div>
      )}

      {sim.state.statusBanner && (
        <div className="text-center text-xs font-semibold text-indigo-200">{sim.state.statusBanner}</div>
      )}
    </div>
  )
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`h-8 w-8 ${className ?? ''}`} aria-hidden>
      <circle cx="16" cy="8" r="5" fill="currentColor" />
      <path d="M8 28c0-6 3.6-10 8-10s8 4 8 10" fill="currentColor" />
    </svg>
  )
}

function VaultIcon() {
  return (
    <svg viewBox="0 0 48 36" className="h-8 w-12 mx-auto text-sky-300" aria-hidden>
      <rect x="4" y="6" width="40" height="26" rx="3" fill="#1e293b" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="19" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="19" r="2" fill="currentColor" />
    </svg>
  )
}
