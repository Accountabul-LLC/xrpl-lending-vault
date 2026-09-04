import { useState } from 'react'
import { Card } from '../../ui'
import {
  SAMPLE,
  usd,
  type Complexity,
  type Labeling,
  type RoleId,
  type StructureView
} from './glossary'
import {
  BrokerConfig,
  CollateralLayer,
  CredentialFlow,
  DefaultPipeline,
  DepartmentView,
  DepositorFundingAnim,
  EconomicDeal,
  EntityViews,
  FirstLossCard,
  FundingFlow,
  LifecycleGuide,
  LoanTermsPanel,
  OutcomeChecklist,
  OwnerVsAdmin,
  PayoutFrequencyCallout,
  RepaymentFlow,
  SameAccountCallout,
  ShareVsBilateral,
  SignatureSplit,
  UnderwriteCard,
  WhoDoesWhat,
  XrplObjects
} from './interactives'
import { ComplexityBar, RoleMap } from './RoleMap'
import { Callout, GTerm, GlossaryPanel, Segmented } from './shared'

export type InstControls = {
  complexity: Complexity
  revealLevel: number
  structure: StructureView
  labeling: Labeling
  setComplexity: (c: Complexity) => void
  setReveal: (n: number) => void
  setStructure: (s: StructureView) => void
  setLabeling: (l: Labeling) => void
}

export function InstLessonBody({ n, controls }: { n: number; controls: InstControls }) {
  switch (n) {
    case 0:
      return <LessonParties controls={controls} />
    case 1:
      return <LessonOriginate />
    case 2:
      return <LessonUnderwrite />
    case 3:
      return <LessonFund />
    case 4:
      return <LessonCreate />
    case 5:
      return <LessonService />
    case 6:
      return <LessonDefault />
    default:
      return <LessonCapstone controls={controls} />
  }
}

function LessonParties({ controls }: { controls: InstControls }) {
  const [selected, setSelected] = useState<RoleId | null>(null)
  return (
    <div className="space-y-5 text-slate-300">
      <p>
        The beginner track is still true: someone supplies capital, someone borrows it, a vault sits
        in the middle. An institutional desk adds people around that core — sometimes as departments
        inside one firm, sometimes as separate businesses. A role is not automatically a company.
      </p>
      <ComplexityBar
        complexity={controls.complexity}
        revealLevel={controls.revealLevel}
        onComplexity={controls.setComplexity}
        onReveal={controls.setReveal}
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-xs text-slate-500">Structure</div>
        <Segmented
          value={controls.structure}
          onChange={controls.setStructure}
          options={[
            { id: 'one', label: 'One company' },
            { id: 'many', label: 'Multiple entities' }
          ]}
        />
        <Segmented
          value={controls.labeling}
          onChange={controls.setLabeling}
          options={[
            { id: 'roles', label: 'Label as roles' },
            { id: 'businesses', label: 'Label as businesses' }
          ]}
        />
      </div>
      <RoleMap
        revealLevel={controls.revealLevel}
        structure={controls.structure}
        labeling={controls.labeling}
        selected={selected}
        onSelect={setSelected}
      />
      <div className="grid md:grid-cols-2 gap-3">
        <Callout title="Borrower and debtor">
          Usually the same party. {SAMPLE.loan.borrower} receives the money and owes the money.
          Wallet {SAMPLE.loan.wallet}. Do not assume two different people.
        </Callout>
        <Callout title="Depositor, lender, creditor">
          Depositors put {SAMPLE.asset} into the vault and receive <GTerm name="Vault shares" />.
          They are lenders economically. They are not each holding a separate bilateral loan against
          the borrower.
        </Callout>
      </div>
      <OwnerVsAdmin />
      <GlossaryPanel />
    </div>
  )
}

function LessonOriginate() {
  return (
    <div className="space-y-4 text-slate-300">
      <p>
        The <GTerm name="Loan Originator" /> brings the borrower into the system. They do not
        automatically lend the money, and they do not automatically own the vault.
      </p>
      <Card title="What the originator may do">
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li>Find borrowers and market loans</li>
          <li>Collect applications and documentation</li>
          <li>Gather financial information</li>
          <li>Package the request</li>
          <li>Submit it for underwriting</li>
        </ul>
      </Card>
      <Callout tone="info" title="Business-layer role">
        The XRPL protocol itself does not require a separate off-chain originator object. An
        origination fee may be earned depending on the business arrangement — not because the ledger
        invented a “originator” party.
      </Callout>
      <Card title="Same party, two words">
        <div className="font-mono text-sm space-y-1">
          <div>{SAMPLE.loan.borrower}</div>
          <div>
            Borrower: {SAMPLE.loan.borrower} — receives {usd(SAMPLE.loan.principal)} {SAMPLE.asset}
          </div>
          <div>Debtor: {SAMPLE.loan.borrower} — obligated to repay</div>
          <div>Wallet: {SAMPLE.loan.wallet}</div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          <GTerm name="Borrower" /> and <GTerm name="Debtor" /> are usually the same legal person.
        </p>
      </Card>
    </div>
  )
}

function LessonUnderwrite() {
  return (
    <div className="space-y-4 text-slate-300">
      <p>
        The current XRPL Lending Protocol does not replace credit analysis. An{' '}
        <GTerm name="Underwriter" /> still judges whether this borrower should get this loan.
      </p>
      <UnderwriteCard />
      <SignatureSplit />
      <CollateralLayer />
    </div>
  )
}

function LessonFund() {
  return (
    <div className="space-y-4 text-slate-300">
      <p>
        A <GTerm name="Single Asset Vault" /> aggregates one asset from one or more depositors.
        Depositors receive shares — a proportional interest in the pool — not a stack of individual
        loans.
      </p>
      <XrplObjects />
      <ShareVsBilateral />
      <DepositorFundingAnim />
      <OwnerVsAdmin />
      <Card title="Public vs private">
        <p className="text-sm">
          Public: anyone meeting basic conditions may deposit. Private: deposits can be restricted
          with credentials and permissioned domains.
        </p>
      </Card>
      <CredentialFlow />
      <Callout>
        If the vault holds an issued asset such as {SAMPLE.asset}, the <GTerm name="Asset Issuer" />{' '}
        is another participant. Freeze or clawback on that asset can affect lending. The issuer is
        not automatically the lender.
      </Callout>
      <PayoutFrequencyCallout />
    </div>
  )
}

function LessonCreate() {
  return (
    <div className="space-y-4 text-slate-300">
      <p>
        The <GTerm name="Loan Broker" /> is the XRPL-specific operator that turns vault capacity into
        loans. It configures economics, tracks debt, can post first-loss capital, and receives
        applicable protocol fees.
      </p>
      <SameAccountCallout />
      <BrokerConfig />
      <Card title="Loan terms — click a field">
        <LoanTermsPanel />
      </Card>
      <Card title="Funding path">
        <FundingFlow />
        <p className="text-xs text-slate-400 mt-3">
          The broker is infrastructure between vault and loan — not a requirement that funds sit in
          someone’s personal wallet.
        </p>
      </Card>
      <Callout tone="chain">
        Loan Broker + Borrower → mutually signed <GTerm name="LoanSet" /> → XRPL Loan object created.
      </Callout>
    </div>
  )
}

function LessonService() {
  return (
    <div className="space-y-4 text-slate-300">
      <p>
        The <GTerm name="Servicer" /> handles the operational life of the loan. The protocol itself
        updates on-chain payment state when a <span className="font-mono text-indigo-200">LoanPay</span>{' '}
        lands.
      </p>
      <Card title="Servicer may">
        <ul className="text-sm list-disc pl-5 space-y-1">
          <li>Send payment notices</li>
          <li>Collect and reconcile repayments</li>
          <li>Keep borrower records</li>
          <li>Watch delinquency and late-payment workflows</li>
          <li>Handle customer service, reporting, and default escalation</li>
        </ul>
      </Card>
      <RepaymentFlow />
      <Callout tone="chain" title="How interest reaches depositors">
        Interest increases vault value. Vault value relative to outstanding shares is the{' '}
        <GTerm name="Exchange rate" />. A depositor’s position can become more valuable without a
        separate interest wire after every borrower payment.
      </Callout>
      <PayoutFrequencyCallout />
    </div>
  )
}

function LessonDefault() {
  return (
    <div className="space-y-4 text-slate-300">
      <p>
        Missed payments are a path, not a single switch. XRPL supports grace,{' '}
        <GTerm name="Impairment" />, and default.
      </p>
      <DefaultPipeline />
      <FirstLossCard />
      <div className="rounded-xl border border-slate-800 p-4 text-center text-sm space-y-1 font-mono text-slate-300">
        <div>Outstanding loss</div>
        <div className="text-slate-500">↓</div>
        <div>First-loss capital</div>
        <div className="text-slate-500">↓</div>
        <div>Remaining loss</div>
        <div className="text-slate-500">↓</div>
        <div>Vault value</div>
        <div className="text-slate-500">↓</div>
        <div>Depositor economics</div>
      </div>
    </div>
  )
}

function LessonCapstone({ controls }: { controls: InstControls }) {
  const [tab, setTab] = useState<'life' | 'deal' | 'who' | 'orgs' | 'recap'>('life')
  const tabs = [
    { id: 'life', label: 'Lifecycle' },
    { id: 'deal', label: 'Sample deal' },
    { id: 'who', label: 'Who does what?' },
    { id: 'orgs', label: 'Organizations' },
    { id: 'recap', label: 'You should now know' }
  ] as const
  return (
    <div className="space-y-4 text-slate-300">
      <p>
        Walk the same {usd(SAMPLE.loan.principal)} {SAMPLE.asset} loan from application through
        default mechanics — then look at who is a role versus who is a business.
      </p>
      <div className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              'rounded-lg px-3 py-1.5 text-xs font-semibold ' +
              (tab === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'life' && <LifecycleGuide />}
      {tab === 'deal' && (
        <div className="space-y-4">
          <EconomicDeal />
          <FundingFlow />
          <RepaymentFlow />
        </div>
      )}
      {tab === 'who' && <WhoDoesWhat structure={controls.structure} labeling={controls.labeling} />}
      {tab === 'orgs' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              value={controls.structure}
              onChange={controls.setStructure}
              options={[
                { id: 'one', label: 'One company' },
                { id: 'many', label: 'Multiple entities' }
              ]}
            />
          </div>
          {controls.structure === 'one' ? <DepartmentView /> : <EntityViews labeling={controls.labeling} onLabeling={controls.setLabeling} />}
          <RoleMap
            revealLevel={4}
            structure={controls.structure}
            labeling={controls.labeling}
          />
        </div>
      )}
      {tab === 'recap' && (
        <div className="space-y-3">
          <OutcomeChecklist />
          <Callout>
            Native XRPL: Vault, LoanBroker, Loan, vault shares, credentials / permissioned domains,
            first-loss cover, impairment and default, LoanSet signatures. Everything else in this
            track is how a lending business may organize around those objects.
          </Callout>
        </div>
      )}
    </div>
  )
}
