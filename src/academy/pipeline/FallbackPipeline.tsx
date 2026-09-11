import { isEntityVisible, PARTICIPANT_BY_ID, PROCESS_POSITIONS } from '../experience/lendingProcess'
import { formatUsd, STORY } from '../experience/story'
import { useSimulation } from '../simulation/SimulationContext'
import type { EntityId } from '../simulation/types'

/** 2D people + vault used when WebGL is unavailable. Same business layout as the 3D world. */
export function FallbackPipeline({ lesson }: { lesson: number }) {
  const sim = useSimulation()
  const { vault } = sim.state
  const danger = sim.state.defaultedConnection || sim.state.missedPayment
  const advanced = sim.state.showAdvancedRoles || sim.state.advancedReveal > 0
  const agreementVisible = sim.state.agreementAccepted || sim.state.currentStep === 8
  void lesson

  const ids = (Object.keys(PROCESS_POSITIONS) as EntityId[]).filter((id) =>
    isEntityVisible(id, advanced, agreementVisible)
  )

  return (
    <div className="absolute inset-0 p-3 sm:p-4 overflow-hidden">
      <div className="relative mx-auto h-full max-h-[36rem] w-full max-w-3xl">
        {ids.map((id) => {
          const [x, , z] = PROCESS_POSITIONS[id]
          const left = 50 + (x / 10.4) * 42
          const top = 48 + (z / 10.4) * 38
          const meta = PARTICIPANT_BY_ID[id]
          const isVault = id === 'vault'
          return (
            <button
              key={id}
              type="button"
              onClick={() => sim.selectEntity(id)}
              className={
                'absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-2 py-1.5 text-center shadow-lg ' +
                (isVault
                  ? 'border-sky-500/50 bg-slate-950/95 z-10 min-w-[9.5rem]'
                  : 'border-slate-700 bg-slate-950/80 min-w-[5.5rem]')
              }
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {isVault ? <VaultIcon /> : <PersonIcon className="mx-auto" tint={meta?.tint} />}
              <div className="text-[10px] font-semibold text-slate-100 leading-tight">
                {id === 'vault' ? 'Lending Vault' : meta?.label}
              </div>
              {isVault && (
                <div className="mt-1 grid grid-cols-2 gap-x-2 text-[9px] font-mono text-slate-300">
                  <span>Cap</span>
                  <span className="text-right">{formatUsd(vault.totalCapital)}</span>
                  <span>Avail</span>
                  <span className="text-right text-emerald-300">{formatUsd(vault.availableLiquidity)}</span>
                </div>
              )}
              {id === 'borrower' && (
                <div className={`text-[9px] font-mono mt-0.5 ${danger ? 'text-rose-300' : 'text-amber-200/80'}`}>
                  {formatUsd(sim.primaryBorrower.outstandingPrincipal || sim.primaryBorrower.remainingBalance)}
                </div>
              )}
            </button>
          )
        })}
      </div>
      {(sim.state.agreementAccepted || sim.state.currentStep === 8) && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1 text-[10px] font-mono text-slate-300">
          Agreement · {formatUsd(STORY.loan)} · 10% APR
        </div>
      )}
    </div>
  )
}

function PersonIcon({ className, tint }: { className?: string; tint?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`h-5 w-5 ${className ?? ''}`} aria-hidden style={{ color: tint }}>
      <circle cx="16" cy="8" r="5" fill="currentColor" />
      <path d="M8 28c0-6 3.6-10 8-10s8 4 8 10" fill="currentColor" />
    </svg>
  )
}

function VaultIcon() {
  return (
    <svg viewBox="0 0 48 36" className="h-7 w-10 mx-auto text-sky-300" aria-hidden>
      <rect x="4" y="6" width="40" height="26" rx="3" fill="#1e293b" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="19" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="19" r="2" fill="currentColor" />
    </svg>
  )
}
