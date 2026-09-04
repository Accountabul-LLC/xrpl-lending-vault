import { useState } from 'react'
import { Btn, Card, Stat } from '../../ui'
import {
  INST_GLOSSARY,
  SAMPLE,
  UNDERWRITE_RESULT,
  usd,
  type Labeling,
  type RoleId,
  type StructureView
} from './glossary'
import { Arrow, Callout, FlowFrame, GTerm, LayerBadge } from './shared'
import { RoleMap } from './RoleMap'

export function XrplObjects() {
  const [sel, setSel] = useState<'vault' | 'broker' | 'loan'>('vault')
  const items = {
    vault: {
      title: 'Vault',
      purpose: 'Pools depositor liquidity for one asset.',
      fields: [
        'Vault asset (XRP, trust-line token, or MPT)',
        'Available assets',
        'Total value',
        'Vault shares',
        'Maximum assets',
        'Withdrawal rules',
        'Public / private status'
      ]
    },
    broker: {
      title: 'LoanBroker',
      purpose: 'Connects the vault to lending activity. Intermediary between Vault and each Loan.',
      fields: [
        'Associated vault',
        'Outstanding debt',
        'Management fee',
        'First-loss / cover balance',
        'Debt maximum',
        'Lending configuration'
      ]
    },
    loan: {
      title: 'Loan',
      purpose: 'On-chain agreement between Loan Broker ↔ Borrower.',
      fields: [
        'Borrower',
        'Outstanding principal',
        'Payment schedule',
        'Interest',
        'Origination / service / late / early-payment fees',
        'Payment status'
      ]
    }
  } as const
  const cur = items[sel]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <button type="button" onClick={() => setSel('vault')} className={chip(sel === 'vault')}>
          Vault
        </button>
        <span>→</span>
        <button type="button" onClick={() => setSel('broker')} className={chip(sel === 'broker')}>
          LoanBroker
        </button>
        <span>→</span>
        <button type="button" onClick={() => setSel('loan')} className={chip(sel === 'loan')}>
          Loan
        </button>
      </div>
      <Card title={cur.title}>
        <p className="text-sm text-slate-300">{cur.purpose}</p>
        <ul className="text-sm text-slate-400 space-y-1 mt-2">
          {cur.fields.map((f) => (
            <li key={f}>· {f}</li>
          ))}
        </ul>
        {sel === 'loan' && (
          <p className="text-xs text-indigo-300 mt-3">
            Both the Loan Broker and the Borrower sign the <GTerm name="LoanSet" /> transaction.
          </p>
        )}
        {sel === 'broker' && (
          <p className="text-xs text-slate-400 mt-3">
            Do not picture the broker sweeping depositor funds into a personal wallet. It is protocol
            infrastructure sitting between the vault and each loan.
          </p>
        )}
      </Card>
    </div>
  )
}

function chip(on: boolean) {
  return (
    'rounded-full px-3 py-1 font-semibold border ' +
    (on ? 'border-indigo-400 bg-indigo-950 text-indigo-100' : 'border-slate-700 text-slate-400')
  )
}

export function LoanTermsPanel() {
  const terms: { name: keyof typeof INST_GLOSSARY; value: string }[] = [
    { name: 'Principal', value: usd(SAMPLE.loan.principal) },
    { name: 'Interest Rate', value: `${SAMPLE.loan.apr}%` },
    { name: 'Late Fee', value: `${SAMPLE.loan.lateApr}% late interest` },
    { name: 'Origination Fee', value: `${SAMPLE.loan.originationFeePct}%` },
    { name: 'Service Fee', value: `${usd(SAMPLE.loan.serviceFee)} / payment` },
    { name: 'Early Payment Fee', value: 'If configured on the Loan' }
  ]
  const extras = [
    { label: 'Term', value: `${SAMPLE.loan.termMonths} months` },
    { label: 'Payment Interval', value: SAMPLE.loan.interval },
    { label: 'Grace Period', value: `${SAMPLE.loan.graceDays} days` }
  ]
  const [sel, setSel] = useState<string>(terms[0].name)
  const explanation = sel in INST_GLOSSARY ? INST_GLOSSARY[sel as keyof typeof INST_GLOSSARY] : extras.find((e) => e.label === sel) ? extraExplain(sel) : ''

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        {terms.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => setSel(t.name)}
            className={
              'rounded-lg border p-3 text-left ' +
              (sel === t.name ? 'border-indigo-400 bg-indigo-950/40' : 'border-slate-800 hover:border-slate-600')
            }
          >
            <div className="text-xs text-slate-500">{t.name}</div>
            <div className="font-mono text-sm">{t.value}</div>
          </button>
        ))}
        {extras.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setSel(t.label)}
            className={
              'rounded-lg border p-3 text-left ' +
              (sel === t.label ? 'border-indigo-400 bg-indigo-950/40' : 'border-slate-800 hover:border-slate-600')
            }
          >
            <div className="text-xs text-slate-500">{t.label}</div>
            <div className="font-mono text-sm">{t.value}</div>
          </button>
        ))}
      </div>
      <Callout title={sel}>{explanation}</Callout>
    </div>
  )
}

function extraExplain(label: string) {
  if (label === 'Term') return 'Scheduled life of the loan from first draw to final contractual payment.'
  if (label === 'Payment Interval') return 'How often an installment is due. Monthly in this teaching example — not a protocol-wide constant.'
  return 'Days after a due date before the loan can be treated as late / eligible for impairment under the configured rules.'
}

const FUNDING_STEPS = [
  { from: 'Depositors', to: 'Single Asset Vault', amount: 'Pooled RLUSD', label: 'Deposit' },
  { from: 'Vault', to: 'LoanBroker', amount: 'Capacity, not a personal wallet', label: 'Broker attached' },
  { from: 'LoanBroker', to: 'Loan', amount: 'On-chain loan object', label: 'LoanSet' },
  { from: 'Loan', to: 'Borrower', amount: usd(SAMPLE.loan.principal), label: 'Proceeds' }
]

export function FundingFlow() {
  const [step, setStep] = useState(0)
  const cur = FUNDING_STEPS[step]
  return (
    <div className="space-y-3">
      <FlowFrame label={cur.label} from={cur.from} to={cur.to} amount={cur.amount} />
      <div className="flex gap-2">
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Previous
        </Btn>
        <Btn onClick={() => setStep((s) => (s + 1) % FUNDING_STEPS.length)}>
          {step === FUNDING_STEPS.length - 1 ? 'Replay' : 'Next movement'}
        </Btn>
      </div>
    </div>
  )
}

const REPAY_STEPS = [
  { from: 'Borrower', to: 'Loan', amount: 'LoanPay', label: 'Installment' },
  { from: 'Loan', to: 'Vault', amount: 'Principal + interest credited to vault value', label: 'Settlement' },
  {
    from: 'Vault value',
    to: 'Share exchange rate',
    amount: 'Same shares, more asset per share if interest increased value',
    label: 'Economics'
  },
  {
    from: 'Depositor position',
    to: 'More valuable (not a daily paycheck)',
    amount: 'Redemption / distribution is a separate policy',
    label: 'Depositor'
  }
]

export function RepaymentFlow() {
  const [step, setStep] = useState(0)
  const cur = REPAY_STEPS[step]
  return (
    <div className="space-y-3">
      <FlowFrame label={cur.label} from={cur.from} to={cur.to} amount={cur.amount} />
      <div className="flex gap-2">
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Previous
        </Btn>
        <Btn onClick={() => setStep((s) => (s + 1) % REPAY_STEPS.length)}>
          {step === REPAY_STEPS.length - 1 ? 'Replay' : 'Next movement'}
        </Btn>
      </div>
    </div>
  )
}

export function PayoutFrequencyCallout() {
  return (
    <Callout tone="warn" title="Yield generation vs distribution">
      <p>
        <GTerm name="APY" /> is an annualized measure. The vault can become more valuable as interest
        arrives without every depositor receiving a cash payout every day.
      </p>
      <p className="mt-2">
        If JRPU later pays daily, weekly, or monthly, that is a{' '}
        <strong className="text-slate-100">JRPU application-layer distribution policy</strong> — separate
        from the native vault primitive.
      </p>
    </Callout>
  )
}

export function FirstLossCard() {
  const [scene, setScene] = useState<'cover' | 'small' | 'large'>('cover')
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Vault deposits" value={usd(SAMPLE.vaultTotal)} />
        <Stat label="Outstanding debt (example)" value={usd(SAMPLE.outstandingDebtExample)} />
        <Stat label="Loan Broker first-loss" value={usd(SAMPLE.firstLoss)} />
      </div>
      <p className="text-sm text-slate-300">
        The Loan Broker can contribute its own capital as a risk buffer.{' '}
        <GTerm name="First-loss capital" /> is optional. If borrowers default, this cover may absorb
        part of the loss before remaining loss shows up in depositor economics.
      </p>
      <div className="flex flex-wrap gap-2">
        <Btn className={scene === 'cover' ? '' : 'bg-slate-700 hover:bg-slate-600'} onClick={() => setScene('cover')}>
          Starting cover
        </Btn>
        <Btn className={scene === 'small' ? '' : 'bg-slate-700 hover:bg-slate-600'} onClick={() => setScene('small')}>
          $20,000 loss
        </Btn>
        <Btn
          className={scene === 'large' ? 'bg-rose-700 hover:bg-rose-600' : 'bg-slate-700 hover:bg-slate-600'}
          onClick={() => setScene('large')}
        >
          $75,000 loss
        </Btn>
      </div>
      {scene === 'cover' && (
        <Callout tone="chain">
          Cover is posted. Depositors have not yet taken a loss. Outstanding loans can still fail.
        </Callout>
      )}
      {scene === 'small' && (
        <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-4 text-center space-y-2 inst-in">
          <div className="text-xs uppercase text-slate-500">Default loss</div>
          <div className="text-2xl font-mono">{usd(20000)}</div>
          <div className="text-slate-500">↓</div>
          <div className="text-xs uppercase text-emerald-300">First-loss capital</div>
          <div className="text-xl font-mono text-emerald-200">−{usd(20000)}</div>
          <div className="text-slate-500">↓</div>
          <div className="text-xs uppercase text-slate-400">Vault loss after cover</div>
          <div className="text-2xl font-mono text-emerald-100">{usd(0)}</div>
        </div>
      )}
      {scene === 'large' && (
        <div className="rounded-xl border border-rose-700/40 bg-rose-950/20 p-4 text-center space-y-2 inst-in">
          <div className="text-xs uppercase text-slate-500">Default loss</div>
          <div className="text-2xl font-mono">{usd(75000)}</div>
          <div className="text-slate-500">↓</div>
          <div className="text-xs uppercase text-amber-300">First-loss cover</div>
          <div className="text-xl font-mono">{usd(50000)}</div>
          <div className="text-slate-500">↓</div>
          <div className="text-xs uppercase text-rose-300">Remaining vault loss</div>
          <div className="text-2xl font-mono text-rose-100">{usd(25000)}</div>
          <p className="text-xs text-slate-400 pt-2">
            That remainder can reduce vault value and therefore depositor share economics.
          </p>
        </div>
      )}
    </div>
  )
}

const DEFAULT_STEPS = ['PAYMENT DUE', 'MISSED', 'GRACE PERIOD', 'IMPAIRMENT', 'DEFAULT'] as const

export function DefaultPipeline() {
  const [i, setI] = useState(0)
  const notes = [
    'An installment is due on the Loan object.',
    'Nothing arrives. The protocol does not invent a payment.',
    `${SAMPLE.loan.graceDays}-day grace in this example. Too-soon default attempts fail until grace elapses.`,
    'XRPL can mark the loan impaired — a troubled state before a full write-down.',
    'Default. Loss hits first-loss capital, then remaining vault / depositor economics.'
  ]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        {DEFAULT_STEPS.map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={
                'rounded px-2 py-1 border ' +
                (idx <= i
                  ? 'border-rose-400/50 bg-rose-950/40 text-rose-100'
                  : 'border-slate-700 text-slate-500')
              }
            >
              {s}
            </span>
            {idx < DEFAULT_STEPS.length - 1 && <span className="text-slate-600">↓</span>}
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-300">{notes[i]}</p>
      <div className="flex gap-2">
        <Btn className="bg-slate-700 hover:bg-slate-600" disabled={i === 0} onClick={() => setI((n) => n - 1)}>
          Back
        </Btn>
        <Btn className="bg-rose-700 hover:bg-rose-600" disabled={i === DEFAULT_STEPS.length - 1} onClick={() => setI((n) => n + 1)}>
          Advance
        </Btn>
      </div>
    </div>
  )
}

const LIFE = [
  { title: 'Borrower application', body: 'Borrower → Loan Originator. Finding and packaging is off-chain.' },
  { title: 'Compliance', body: 'Borrower → identity / business verification → approved credential (especially for private vaults).' },
  { title: 'Underwriting', body: 'Application → Underwriter → risk analysis → recommended terms. Still off-chain.' },
  { title: 'Guarantor (if required)', body: 'Borrower + Guarantor → guarantee agreement. Not a LoanSet signature.' },
  { title: 'Collateral (if required)', body: 'Borrower pledges assets to a custodian. External / additional collateral layer.' },
  { title: 'Depositor funding', body: 'Many depositors → Single Asset Vault → vault shares. They do not each hold a bilateral loan.' },
  { title: 'Loan Broker setup', body: 'Vault → LoanBroker: management fee, debt maximum, first-loss requirement, cover balance.' },
  { title: 'Loan agreement', body: 'Loan Broker + Borrower mutually sign LoanSet → XRPL Loan object created.' }
]

export function LifecycleGuide() {
  const [i, setI] = useState(0)
  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {LIFE.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setI(idx)}
            className={
              'h-1.5 flex-1 min-w-[2rem] rounded-full ' + (idx <= i ? 'bg-indigo-400' : 'bg-slate-700')
            }
          />
        ))}
      </div>
      <Card title={`Step ${i + 1} — ${LIFE[i].title}`}>
        <p className="text-sm text-slate-300">{LIFE[i].body}</p>
      </Card>
      <div className="flex gap-2">
        <Btn className="bg-slate-700 hover:bg-slate-600" disabled={i === 0} onClick={() => setI((n) => n - 1)}>
          Previous
        </Btn>
        <Btn disabled={i === LIFE.length - 1} onClick={() => setI((n) => n + 1)}>
          Next step
        </Btn>
      </div>
    </div>
  )
}

export function ShareVsBilateral() {
  return (
    <div className="grid md:grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl border border-slate-800 p-4 opacity-70">
        <div className="text-xs uppercase text-slate-500 mb-2">Not this design</div>
        <p className="text-slate-400 mb-2">Separate bilateral loans</p>
        <div className="font-mono text-xs space-y-1">
          <div>Depositor A ←→ Borrower</div>
          <div>Depositor B ←→ Borrower</div>
          <div>Depositor C ←→ Borrower</div>
        </div>
      </div>
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/10 p-4">
        <div className="text-xs uppercase text-emerald-400 mb-2">XRPL vault design</div>
        <p className="text-slate-300 mb-2">Proportional shares in one pool</p>
        <div className="font-mono text-xs space-y-1 text-slate-300">
          <div>Depositors → shares → Vault → LoanBroker → Loan → Borrower</div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          A depositor is a <GTerm name="Lender" /> economically and a <GTerm name="Creditor" /> via
          the vault, without each person holding a direct loan against ABC Development.
        </p>
      </div>
    </div>
  )
}

export function CredentialFlow() {
  const steps = ['Depositor', 'KYC / KYB', 'Credential Issuer', 'Credential', 'Permissioned Domain', 'Private Vault Access']
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={s} className="text-center">
          <div className="inline-block rounded-lg border border-teal-500/30 bg-teal-950/20 px-3 py-1.5 text-sm">{s}</div>
          {i < steps.length - 1 && <Arrow />}
        </div>
      ))}
      <p className="text-xs text-slate-400 text-center">
        Public vaults may accept anyone meeting basic conditions. Private vaults can require credentials.
      </p>
    </div>
  )
}

export function SignatureSplit() {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Card title="XRPL Loan agreement">
        <div className="text-sm font-mono space-y-1">
          <div>Loan Broker</div>
          <div className="text-slate-500">+</div>
          <div>Borrower</div>
          <div className="text-indigo-300 pt-2">both sign LoanSet</div>
        </div>
      </Card>
      <Card title="Additional legal agreement">
        <div className="text-sm space-y-1">
          <div>Guarantor</div>
          <div className="text-slate-500">↓</div>
          <div>Guarantees specified borrower obligations</div>
        </div>
        <p className="text-xs text-amber-200/80 mt-3">
          Signing a guarantee does not make the guarantor a native LoanSet counterparty.
        </p>
      </Card>
    </div>
  )
}

export function CollateralLayer() {
  return (
    <div className="space-y-3">
      <Callout tone="extra" title="Additional architecture above the native Lending Protocol">
        The current native protocol focuses on uncollateralized lending. It does not automatically
        liquidate collateral on-chain. Custody can be layered on top.
      </Callout>
      <div className="grid md:grid-cols-2 gap-3 text-sm font-mono">
        <div className="rounded-xl border border-dashed border-rose-500/40 p-4 space-y-1 text-center">
          <div>Borrower</div>
          <div className="text-slate-500">↓ pledges</div>
          <div>Collateral</div>
          <div className="text-slate-500">↓ holds / controls</div>
          <div>Collateral Custodian</div>
        </div>
        <div className="rounded-xl border border-dashed border-rose-500/40 p-4 space-y-1 text-center">
          <div>Loan Broker</div>
          <div className="text-slate-500">↔</div>
          <div>Collateral agreement</div>
          <div className="text-slate-500">↔</div>
          <div>Custodian</div>
        </div>
      </div>
    </div>
  )
}

export function UnderwriteCard() {
  const checks = [
    'Borrower identity',
    'Income / revenue',
    'Existing debt',
    'Cash flow',
    'Repayment ability',
    'Industry risk',
    'Credit history',
    'Requested amount & term',
    'Guarantor strength',
    'Collateral if used'
  ]
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        {checks.map((c) => (
          <div key={c} className="rounded-lg border border-slate-800 px-3 py-2 text-slate-300">
            {c}
          </div>
        ))}
      </div>
      <Card title="Recommendation (educational)">
        <div className="grid sm:grid-cols-2 gap-2 text-sm font-mono">
          <div>Risk grade: {UNDERWRITE_RESULT.grade}</div>
          <div>Requested: {usd(UNDERWRITE_RESULT.requested)}</div>
          <div>Approved: {usd(UNDERWRITE_RESULT.approved)}</div>
          <div>Recommended APR: {UNDERWRITE_RESULT.apr}%</div>
          <div>Term: {UNDERWRITE_RESULT.termMonths} months</div>
          <div>Guarantor: {UNDERWRITE_RESULT.guarantor}</div>
          <div>Collateral: {UNDERWRITE_RESULT.collateral}</div>
          <div>Max exposure: {usd(UNDERWRITE_RESULT.maxExposure)}</div>
        </div>
        <p className="text-xs text-slate-400 mt-3">The underwriter does not necessarily control the vault.</p>
      </Card>
    </div>
  )
}

const WHO: { q: string; a: string; highlight: RoleId[] }[] = [
  { q: 'Who finds the borrower?', a: 'Loan Originator', highlight: ['originator'] },
  { q: 'Who approves the borrower?', a: 'Underwriter', highlight: ['underwriter'] },
  { q: 'Who creates the XRPL loan?', a: 'Loan Broker + Borrower (both sign LoanSet)', highlight: ['broker', 'borrower'] },
  { q: 'Who supplies the capital?', a: 'Depositors', highlight: ['depositor'] },
  { q: 'Who manages the vault?', a: 'Vault Owner / Administrator', highlight: ['vault', 'admin'] },
  { q: 'Who guarantees repayment?', a: 'Optional Guarantor — off-chain', highlight: ['guarantor'] },
  { q: 'Who holds collateral?', a: 'Optional Collateral Custodian — additional layer', highlight: ['custodian'] },
  { q: 'Who collects ongoing payments?', a: 'Loan Servicer around the protocol payment workflow', highlight: ['servicer', 'broker'] },
  { q: 'Who issues vault-access credentials?', a: 'Credential / Compliance Provider', highlight: ['compliance'] },
  { q: 'Who posts first-loss capital?', a: 'Loan Broker (owner account, in the current protocol)', highlight: ['broker'] }
]

export function WhoDoesWhat({
  structure,
  labeling
}: {
  structure: StructureView
  labeling: Labeling
}) {
  const [i, setI] = useState(0)
  const cur = WHO[i]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {WHO.map((w, idx) => (
          <button
            key={w.q}
            type="button"
            onClick={() => setI(idx)}
            className={
              'text-[11px] rounded-full border px-2 py-1 ' +
              (idx === i ? 'border-indigo-400 bg-indigo-950 text-indigo-100' : 'border-slate-700 text-slate-400')
            }
          >
            {idx + 1}
          </button>
        ))}
      </div>
      <Card title={cur.q}>
        <p className="text-lg font-semibold text-indigo-100">{cur.a}</p>
      </Card>
      <RoleMap
        revealLevel={4}
        structure={structure}
        labeling={labeling}
        highlight={cur.highlight}
        selected={cur.highlight[0]}
      />
    </div>
  )
}

export function EntityViews({
  labeling,
  onLabeling
}: {
  labeling: Labeling
  onLabeling: (v: Labeling) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Btn className={labeling === 'roles' ? '' : 'bg-slate-700 hover:bg-slate-600'} onClick={() => onLabeling('roles')}>
          View as roles
        </Btn>
        <Btn
          className={labeling === 'businesses' ? '' : 'bg-slate-700 hover:bg-slate-600'}
          onClick={() => onLabeling('businesses')}
        >
          View as businesses
        </Btn>
      </div>
      {labeling === 'roles' ? (
        <ul className="text-sm grid sm:grid-cols-2 gap-2">
          {[
            'Originator',
            'Underwriter',
            'Borrower',
            'Guarantor',
            'Loan Broker',
            'Vault Operator',
            'Depositor',
            'Custodian',
            'Servicer'
          ].map((r) => (
            <li key={r} className="rounded-lg border border-slate-800 px-3 py-2">
              {r}
            </li>
          ))}
        </ul>
      ) : (
        <div className="font-mono text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-slate-300">
          <Tree name="JRPU Lending LLC" items={['Loan Broker', 'Vault Owner', 'Vault Administrator']} />
          <Tree name="Origin Capital LLC" items={['Loan Originator']} />
          <Tree name="Credit Analytics LLC" items={['Underwriter']} />
          <Tree name="Custody Services LLC" items={['Collateral Custodian']} />
          <Tree name="Loan Servicing LLC" items={['Servicer']} />
          <Tree name="ABC Development LLC" items={['Borrower']} />
          <Tree name="John Doe" items={['Guarantor']} />
          <Tree name="20 Depositors" items={['Capital providers']} />
        </div>
      )}
    </div>
  )
}

function Tree({ name, items }: { name: string; items: string[] }) {
  return (
    <div>
      <div className="text-indigo-200">{name}</div>
      {items.map((it) => (
        <div key={it} className="pl-4 text-slate-400">
          ├ {it}
        </div>
      ))}
    </div>
  )
}

export function DepartmentView() {
  const depts = [
    'Origination Department',
    'Credit Department',
    'Compliance Department',
    'Treasury / Vault Department',
    'Loan Operations',
    'Servicing',
    'Risk',
    'Accounting'
  ]
  return (
    <div className="space-y-3">
      <Card title="JRPU FINANCIAL">
        <div className="space-y-1">
          {depts.map((d, i) => (
            <div key={d} className="text-center">
              <div className="inline-block rounded-lg border border-indigo-500/30 bg-indigo-950/20 px-3 py-1 text-sm">
                {d}
              </div>
              {i < depts.length - 1 && <div className="text-slate-600 text-xs">↓</div>}
            </div>
          ))}
        </div>
      </Card>
      <Callout tone="warn">
        A single organization might perform multiple roles, depending on licensing, legal,
        regulatory, segregation-of-duties, and custody requirements. Combining roles is not
        automatically legally permissible.
      </Callout>
    </div>
  )
}

export function OwnerVsAdmin() {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Card title="XRPL role — Vault Owner account">
        <p className="text-sm text-slate-300">
          Creates and manages the vault object: asset, maximum assets, public/private access,
          transferable shares, withdrawal policy.
        </p>
        <p className="text-xs text-indigo-300 mt-2">
          Current lending architecture: Vault Owner and Loan Broker use the same account.
        </p>
      </Card>
      <Card title="Business role — Vault Administrator">
        <p className="text-sm text-slate-300">
          Monitors liquidity, deposits, withdrawals, utilization, configuration, and lending
          capacity. The operator does not personally own depositor funds.
        </p>
      </Card>
      <div className="md:col-span-2">
        <Callout tone="chain">
          “Vault Owner” describes control over the vault object. It does not mean the operator
          personally owns every depositor’s economic interest.
        </Callout>
      </div>
    </div>
  )
}

export function EconomicDeal() {
  const [tab, setTab] = useState<'vault' | 'loan'>('vault')
  const shares = SAMPLE.depositors.reduce((s, d) => s + d.amount, 0)
  const rate = SAMPLE.vaultTotal / 1_000_000
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Btn className={tab === 'vault' ? '' : 'bg-slate-700 hover:bg-slate-600'} onClick={() => setTab('vault')}>
          Vault
        </Btn>
        <Btn className={tab === 'loan' ? '' : 'bg-slate-700 hover:bg-slate-600'} onClick={() => setTab('loan')}>
          Sample loan
        </Btn>
      </div>
      {tab === 'vault' ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Asset" value={SAMPLE.asset} />
          <Stat label="Total vault" value={usd(SAMPLE.vaultTotal)} />
          <Stat label="Depositors" value={`${SAMPLE.depositorCount}`} />
          <Stat label="Outstanding loans" value={usd(SAMPLE.outstandingLoans)} />
          <Stat label="Available liquidity" value={usd(SAMPLE.available)} />
          <Stat label="First-loss cover" value={usd(SAMPLE.firstLoss)} />
        </div>
      ) : (
        <div className="text-sm font-mono space-y-1 bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div>Borrower: {SAMPLE.loan.borrower}</div>
          <div>Principal: {usd(SAMPLE.loan.principal)}</div>
          <div>APR: {SAMPLE.loan.apr}%</div>
          <div>Term: {SAMPLE.loan.termMonths} months</div>
          <div>Guarantor: {SAMPLE.loan.guarantor}</div>
          <div>Collateral: {SAMPLE.loan.collateral}</div>
          <div>Underwriter: {SAMPLE.parties.underwriter}</div>
          <div>Originator: {SAMPLE.parties.originator}</div>
          <div>Loan Broker: {SAMPLE.parties.broker}</div>
          <div>Vault operator: {SAMPLE.parties.vaultOperator}</div>
          <div>Collateral custodian: {SAMPLE.parties.custodian}</div>
          <div>Servicer: {SAMPLE.parties.servicer}</div>
        </div>
      )}
      <Callout>
        Teaching numbers only. Share exchange rate in this snapshot is {rate.toFixed(2)} relative to
        a {usd(shares)} illustrative share base at origination of a $1,000,000 vault — not a live
        quote.
      </Callout>
    </div>
  )
}

export function DepositorFundingAnim() {
  const [on, setOn] = useState(false)
  const total = SAMPLE.depositors.reduce((s, d) => s + d.amount, 0)
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-2">
        {SAMPLE.depositors.map((d) => (
          <div key={d.name} className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-center">
            <div className="text-xs text-slate-400">{d.name}</div>
            <div className="font-mono">{usd(d.amount)}</div>
            {on && <div className="text-[10px] text-emerald-300 mt-1">shares issued</div>}
          </div>
        ))}
      </div>
      <Arrow label="into one asset pool" />
      <div className="rounded-xl border border-sky-500/40 bg-sky-950/20 p-4 text-center">
        <div className="text-xs uppercase text-sky-300">Single Asset Vault · {SAMPLE.asset}</div>
        <div className="text-2xl font-mono mt-1">{usd(on ? total : 0)}</div>
        <div className="text-xs text-slate-400 mt-1">{on ? `${total.toLocaleString()} shares @ 1.00` : 'waiting for deposits'}</div>
      </div>
      <Btn onClick={() => setOn(true)}>Pool the deposits</Btn>
    </div>
  )
}

export function OutcomeChecklist() {
  const items = [
    'Who finds the borrower.',
    'Who analyzes the borrower.',
    'Who supplies the money.',
    'Who controls the Vault.',
    'What the Loan Broker does.',
    'What is stored on XRPL.',
    'What remains off-chain.',
    'Who signs the loan.',
    'What a guarantor does.',
    'Where collateral fits.',
    'Who services payments.',
    'How interest affects the Vault.',
    'How depositors participate economically.',
    'What first-loss capital does.',
    'What happens on default.',
    'How one business could contain multiple departments.',
    'How independent entities could divide the work.',
    'Which functions are native XRPL vs JRPU/business-layer.'
  ]
  return (
    <ol className="text-sm text-slate-300 space-y-1 list-decimal pl-5">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ol>
  )
}

export function BrokerConfig() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Stat label="Management fee" value={SAMPLE.managementFee} />
      <Stat label="Debt maximum" value={usd(SAMPLE.debtMaximum)} />
      <Stat label="Minimum first-loss" value={usd(SAMPLE.minFirstLoss)} />
      <Stat label="Cover balance" value={usd(SAMPLE.firstLoss)} />
    </div>
  )
}

export function SameAccountCallout() {
  return (
    <Callout tone="chain" title="Same XRPL account, two hats">
      XYZ Credit Company · Treasury / Structured Finance · XRPL account: Vault Owner / Loan Broker.
      The protocol currently requires the vault owner and loan broker to be the same account.
    </Callout>
  )
}
