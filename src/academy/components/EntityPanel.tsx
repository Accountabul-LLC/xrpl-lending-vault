import { Btn } from '../../ui'
import { useSimulation } from '../simulation/SimulationContext'
import type { EntityId } from '../simulation/types'

export function EntityPanel() {
  const sim = useSimulation()
  const id = sim.state.selectedEntity
  if (!id) return null

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Entity</div>
          <h3 className="text-sm font-semibold text-slate-100">{titleFor(id)}</h3>
        </div>
        <Btn className="bg-slate-800 hover:bg-slate-700 !px-2 !py-1 text-xs" onClick={() => sim.selectEntity(null)}>
          Close
        </Btn>
      </div>
      {id === 'depositor' && <DepositorDetails />}
      {id === 'borrower' && <BorrowerDetails />}
      {id === 'vault' && <VaultDetails />}
      {id === 'protocol' && <ProtocolDetails />}
      {(id === 'guarantor' || id === 'broker' || id === 'underwriter' || id === 'servicer' || id === 'custodian') && (
        <p className="text-sm text-slate-400">
          Optional advanced role. Enable via Advanced Lending Roles to see how they attach to the
          primary three-party model.
        </p>
      )}
    </div>
  )
}

function titleFor(id: EntityId) {
  switch (id) {
    case 'depositor':
      return 'Depositor'
    case 'borrower':
      return 'Borrower'
    case 'vault':
      return 'Lending Vault'
    case 'protocol':
      return 'Protocol / Facilitator'
    default:
      return id
  }
}

function DepositorDetails() {
  const { primaryDepositor: d } = useSimulation()
  return (
    <div className="text-sm space-y-2 text-slate-300">
      <Row label="Role" value="Capital Provider" />
      <Row label="Wallet" value={d.wallet} mono />
      <Row label="Deposited" value={`$${d.deposited.toLocaleString()}`} mono />
      <Row label="Current position" value={`$${(d.deposited + d.earnedYield).toLocaleString()}`} mono />
      <Row label="Earned" value={`$${d.earnedYield.toLocaleString()}`} mono />
      <div className="pt-2 border-t border-slate-800">
        <div className="text-xs text-slate-500 mb-1">Responsibilities</div>
        <ul className="list-disc pl-4 text-xs space-y-1 text-slate-400">
          <li>Provides capital</li>
          <li>Accepts vault risk</li>
          <li>Follows withdrawal rules</li>
        </ul>
      </div>
    </div>
  )
}

function BorrowerDetails() {
  const { primaryBorrower: b } = useSimulation()
  return (
    <div className="text-sm space-y-2 text-slate-300">
      <Row label="Role" value="Capital Recipient" />
      <Row label="Wallet" value={b.wallet} mono />
      <Row label="Loan" value={`$${b.loanPrincipal.toLocaleString()}`} mono />
      <Row label="Remaining" value={`$${b.remainingBalance.toLocaleString()}`} mono />
      <Row label="APR" value={`${(b.interestRate * 100).toFixed(0)}%`} mono />
      <Row label="Term" value={`${b.termMonths} months`} />
      <Row label="Next payment" value={`$${b.paymentAmount.toFixed(2)}`} mono />
      <div className="pt-2 border-t border-slate-800">
        <div className="text-xs text-slate-500 mb-1">Responsibilities</div>
        <ul className="list-disc pl-4 text-xs space-y-1 text-slate-400">
          <li>Repay loan</li>
          <li>Follow loan agreement</li>
          <li>Maintain collateral if applicable</li>
        </ul>
      </div>
    </div>
  )
}

function VaultDetails() {
  const { state } = useSimulation()
  const v = state.vault
  const util = v.totalCapital > 0 ? Math.round((v.outstandingLoans / v.totalCapital) * 100) : 0
  return (
    <div className="text-sm space-y-2 text-slate-300">
      <Row label="Capital" value={`$${Math.round(v.totalCapital).toLocaleString()}`} mono />
      <Row label="Liquidity" value={`$${Math.round(v.availableLiquidity).toLocaleString()}`} mono />
      <Row label="Outstanding loans" value={`$${Math.round(v.outstandingLoans).toLocaleString()}`} mono />
      <Row label="Utilization" value={`${util}%`} mono />
      <Row label="Interest earned" value={`$${Math.round(v.interestEarned).toLocaleString()}`} mono />
      <Row label="Max size" value={`$${v.maxSize.toLocaleString()}`} mono />
    </div>
  )
}

function ProtocolDetails() {
  const { state } = useSimulation()
  return (
    <div className="text-sm space-y-2 text-slate-300">
      <Row label="Role" value="Facilitator" />
      <Row label="Fees collected" value={`$${state.protocol.feesCollected.toLocaleString()}`} mono />
      <Row label="Transactions" value={`${state.protocol.transactionsProcessed}`} mono />
      <div className="pt-2 border-t border-slate-800">
        <div className="text-xs text-slate-500 mb-1">Responsibilities</div>
        <ul className="list-disc pl-4 text-xs space-y-1 text-slate-400">
          <li>Create infrastructure</li>
          <li>Administer vault</li>
          <li>Process transactions</li>
          <li>Maintain records</li>
          <li>Apply protocol rules</li>
        </ul>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={mono ? 'font-mono text-xs text-slate-200' : 'text-xs text-slate-200'}>{value}</span>
    </div>
  )
}
