import { Btn } from '../../ui'
import { PARTICIPANT_BY_ID, participantStatus } from '../experience/lendingProcess'
import { formatUsd } from '../experience/story'
import { useSimulation } from '../simulation/SimulationContext'

export function EntityPanel() {
  const sim = useSimulation()
  const id = sim.state.selectedEntity
  if (!id) return null

  const meta = PARTICIPANT_BY_ID[id]
  const advanced = sim.state.showAdvancedRoles || sim.state.advancedReveal > 0
  const status = participantStatus(id, sim.state.currentStep, advanced)

  return (
    <div className="rounded-xl border border-slate-600 bg-slate-950/95 p-3 space-y-2 min-w-0 shadow-xl backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Role</div>
          <h3 className="text-sm font-semibold text-slate-100 truncate">{meta?.label ?? id}</h3>
          {id === 'custodian' && (
            <div className="text-[10px] text-slate-400 mt-0.5">Institutional custody layer</div>
          )}
        </div>
        <Btn className="bg-slate-800 hover:bg-slate-700 !px-2 !py-1 text-xs shrink-0" onClick={() => sim.selectEntity(null)}>
          Close
        </Btn>
      </div>
      {meta && (
        <div className="text-xs text-slate-300 space-y-1.5 min-w-0">
          <p className="leading-snug">{meta.role}</p>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Status</div>
            <div className="text-sky-200">{status}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Inputs</div>
            <div className="break-words">{meta.inputs.join(', ')}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Output</div>
            <div className="break-words">{meta.output}</div>
          </div>
        </div>
      )}
      {id === 'depositor' && <DepositorDetails />}
      {id === 'borrower' && <BorrowerDetails />}
      {id === 'vault' && <VaultDetails />}
      {id === 'agreement' && <AgreementDetails />}
    </div>
  )
}

function DepositorDetails() {
  const { primaryDepositor: d } = useSimulation()
  return (
    <div className="text-xs space-y-1 text-slate-300 border-t border-slate-800 pt-2">
      <Row label="Cash on hand" value={formatUsd(d.balance)} />
      <Row label="Deposited" value={formatUsd(d.deposited)} />
      <Row label="Vault position" value={formatUsd(d.vaultPosition)} />
      <Row label="Earned yield" value={formatUsd(d.earnedYield)} />
    </div>
  )
}

function BorrowerDetails() {
  const { primaryBorrower: b } = useSimulation()
  return (
    <div className="text-xs space-y-1 text-slate-300 border-t border-slate-800 pt-2">
      <Row label="Requested" value={formatUsd(b.requestedAmount)} />
      <Row label="Outstanding" value={formatUsd(b.outstandingPrincipal || b.remainingBalance)} />
      <Row label="APR" value={`${(b.interestRate * 100).toFixed(0)}%`} />
      <Row label="Next payment" value={`$${b.paymentAmount.toFixed(2)}`} />
    </div>
  )
}

function VaultDetails() {
  const { state } = useSimulation()
  const v = state.vault
  return (
    <div className="text-xs space-y-1 text-slate-300 border-t border-slate-800 pt-2">
      <Row label="Configured" value={v.configured ? 'Yes' : 'Not yet'} />
      <Row label="Asset" value={v.asset} />
      <Row label="Capital" value={formatUsd(v.totalCapital)} />
      <Row label="Available" value={formatUsd(v.availableLiquidity)} />
      <Row label="Outstanding loans" value={formatUsd(v.outstandingLoans)} />
    </div>
  )
}

function AgreementDetails() {
  const { primaryBorrower: b, primaryLoan } = useSimulation()
  return (
    <div className="text-xs space-y-1 text-slate-300 border-t border-slate-800 pt-2">
      <Row label="Principal" value={formatUsd(primaryLoan?.principal ?? b.loanPrincipal)} />
      <Row label="APR" value="10%" />
      <Row label="Term" value="12 months" />
      <Row label="Payments" value="Monthly" />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 min-w-0">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="font-mono text-slate-200 text-right min-w-0 break-all">{value}</span>
    </div>
  )
}
