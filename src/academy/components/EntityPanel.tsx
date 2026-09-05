import { Btn } from '../../ui'
import { formatUsd } from '../experience/story'
import { useSimulation } from '../simulation/SimulationContext'
import type { EntityId } from '../simulation/types'

export function EntityPanel() {
  const sim = useSimulation()
  const id = sim.state.selectedEntity
  if (!id) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-[11px] text-slate-500">
        Click the administrator, depositor, vault, or borrower in the scene to inspect them.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Who</div>
          <h3 className="text-sm font-semibold text-slate-100">{titleFor(id)}</h3>
        </div>
        <Btn className="bg-slate-800 hover:bg-slate-700 !px-2 !py-1 text-xs" onClick={() => sim.selectEntity(null)}>
          Close
        </Btn>
      </div>
      {id === 'depositor' && <DepositorDetails />}
      {id === 'borrower' && <BorrowerDetails />}
      {id === 'vault' && <VaultDetails />}
      {(id === 'protocol' || id === 'administrator') && <ProtocolDetails />}
      {id === 'agreement' && <AgreementDetails />}
      {(id === 'guarantor' ||
        id === 'broker' ||
        id === 'underwriter' ||
        id === 'servicer' ||
        id === 'custodian' ||
        id === 'originator') && <AdvancedDetails id={id} />}
    </div>
  )
}

function titleFor(id: EntityId) {
  switch (id) {
    case 'depositor':
      return 'Depositor / Lender'
    case 'borrower':
      return 'Borrower'
    case 'vault':
      return 'Lending Vault'
    case 'protocol':
      return 'Protocol Office'
    case 'administrator':
      return 'Protocol Administrator'
    case 'agreement':
      return 'Repayment Agreement'
    case 'originator':
      return 'Loan Originator'
    case 'underwriter':
      return 'Underwriter'
    case 'broker':
      return 'Loan Broker'
    case 'guarantor':
      return 'Guarantor'
    case 'custodian':
      return 'Collateral Custodian'
    case 'servicer':
      return 'Loan Servicer'
  }
}

function DepositorDetails() {
  const { primaryDepositor: d } = useSimulation()
  return (
    <div className="text-sm space-y-2 text-slate-300">
      <Row label="Role" value="Capital provider" />
      <Row label="Cash on hand" value={formatUsd(d.balance)} mono />
      <Row label="Deposited" value={formatUsd(d.deposited)} mono />
      <Row label="Vault position" value={formatUsd(d.vaultPosition)} mono />
      <Row label="Earned yield" value={formatUsd(d.earnedYield)} mono />
      <p className="text-xs text-slate-500 pt-1">
        The depositor funds the vault and benefits if loans are repaid with interest.
      </p>
    </div>
  )
}

function BorrowerDetails() {
  const { primaryBorrower: b } = useSimulation()
  return (
    <div className="text-sm space-y-2 text-slate-300">
      <Row label="Role" value="Capital recipient" />
      <Row label="Requested" value={formatUsd(b.requestedAmount)} mono />
      <Row label="Outstanding" value={formatUsd(b.outstandingPrincipal || b.remainingBalance)} mono />
      <Row label="APR" value={`${(b.interestRate * 100).toFixed(0)}%`} mono />
      <Row label="Next payment" value={`$${b.paymentAmount.toFixed(2)}`} mono />
      <p className="text-xs text-slate-500 pt-1">
        Borrowed money comes from vault liquidity that depositors already supplied.
      </p>
    </div>
  )
}

function VaultDetails() {
  const { state } = useSimulation()
  const v = state.vault
  return (
    <div className="text-sm space-y-2 text-slate-300">
      <Row label="Configured" value={v.configured ? 'Yes' : 'Not yet'} />
      <Row label="Asset" value={v.asset} />
      <Row label="Capital" value={formatUsd(v.totalCapital)} mono />
      <Row label="Available" value={formatUsd(v.availableLiquidity)} mono />
      <Row label="Outstanding loans" value={formatUsd(v.outstandingLoans)} mono />
      <Row label="Interest earned" value={formatUsd(v.interestEarned)} mono />
    </div>
  )
}

function ProtocolDetails() {
  return (
    <div className="text-sm space-y-2 text-slate-300">
      <Row label="Role" value="Sets rules and facilitates" />
      <p className="text-xs text-slate-400">
        The administrator is a person. The protocol office is the control center. Together they
        configure the vault and review loan requests. They do not supply the loan capital.
      </p>
    </div>
  )
}

function AgreementDetails() {
  const { primaryBorrower: b, primaryLoan } = useSimulation()
  return (
    <div className="text-sm space-y-2 text-slate-300">
      <Row label="Principal" value={formatUsd(primaryLoan?.principal ?? b.loanPrincipal)} mono />
      <Row label="APR" value="10%" />
      <Row label="Term" value="12 months" />
      <Row label="Payments" value="Monthly" />
      <p className="text-xs text-slate-500">The borrower signs this. Depositors do not sign each loan.</p>
    </div>
  )
}

function AdvancedDetails({ id }: { id: EntityId }) {
  const copy: Record<string, string> = {
    originator: 'Finds the borrower and packages the request before it reaches the vault.',
    underwriter: 'Evaluates credit risk. In basic mode the protocol does this in one step.',
    broker: 'The XRPL Loan Broker object that connects an approved loan to the vault.',
    guarantor: 'Optional. Stands behind the borrower if they do not perform.',
    custodian: 'Holds pledged collateral for the facility.',
    servicer: 'Collects payments over the life of the loan and reports status to the vault.'
  }
  return <p className="text-sm text-slate-400">{copy[id]}</p>
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 min-w-0">
      <span className="text-slate-500 text-xs shrink-0">{label}</span>
      <span
        className={
          (mono ? 'font-mono text-xs text-slate-200' : 'text-xs text-slate-200') +
          ' text-right min-w-0 break-all'
        }
      >
        {value}
      </span>
    </div>
  )
}
