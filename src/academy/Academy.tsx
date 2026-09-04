import { useState } from 'react'
import { Btn, Card, Stat } from '../ui'

const LESSONS = [
  'Meet the Three Parties',
  'What Is a Vault?',
  'Depositing Money',
  'Borrowing Money',
  'Understanding Loan Terms',
  'Following the Money',
  'Risk',
  'Run the Simulation'
] as const

const GLOSSARY: Record<string, string> = {
  'Maximum Vault Size':
    'Hard ceiling on depositor principal the vault will accept. JRPU’s test target is $250,000.',
  'Minimum Deposit': 'Smallest amount a liquidity provider can add in one deposit.',
  'Maximum Deposit': 'Largest single-depositor add, used to limit concentration risk.',
  'Loan Duration': 'How long a borrower has to repay, from first draw to final payment.',
  'Maximum Loan-to-Vault Ratio':
    'Share of vault capital that may be lent at once. The rest stays liquid for withdrawals and buffers.',
  Principal: 'The amount borrowed. Interest is charged on this, not the other way around.',
  APR: 'Annual Percentage Rate — simple yearly cost of the loan, without compounding.',
  APY: 'Annual Percentage Yield — the compounding return a depositor is targeting, not a guarantee.',
  Term: 'The scheduled life of the loan (for example, 12 months).',
  'Payment frequency': 'How often the borrower must pay — monthly in the JRPU teaching example.',
  Collateral: 'An asset pledged to reduce loss if the borrower fails to repay.',
  Default: 'The borrower has not performed under the agreement after any grace period.',
  'Origination fee': 'A one-time fee taken when the loan is created, usually not depositor yield.',
  Points: 'An origination charge expressed as a percent of principal (1 point = 1%).',
  Liquidity:
    'Capital sitting in the vault and available to lend or return to depositors right now.',
  'Liquidity provider':
    'A depositor. They provide capital to the vault; they do not buy or own the vault.'
}

function Term({ name }: { name: keyof typeof GLOSSARY }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-indigo-300 underline decoration-dotted underline-offset-2 hover:text-indigo-200"
      >
        {name}
      </button>
      {open && (
        <span className="absolute z-10 left-0 top-full mt-1 w-64 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300 shadow-xl">
          {GLOSSARY[name]}
        </span>
      )}
    </span>
  )
}

function Party({
  title,
  subtitle,
  tone
}: {
  title: string
  subtitle: string
  tone: 'protocol' | 'depositor' | 'borrower'
}) {
  const ring =
    tone === 'protocol'
      ? 'border-indigo-500/60 bg-indigo-950/40'
      : tone === 'depositor'
        ? 'border-emerald-500/50 bg-emerald-950/30'
        : 'border-amber-500/50 bg-amber-950/30'
  return (
    <div className={`rounded-xl border px-4 py-3 text-center ${ring}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
    </div>
  )
}

function ThreePartyDiagram() {
  return (
    <div className="space-y-4">
      <Party title="Protocol / Facilitator" subtitle="Creates the vault, sets rules, administers" tone="protocol" />
      <div className="text-center text-slate-500 text-xs">↓ administers</div>
      <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center">
        <div className="text-sm font-semibold">Lending Vault</div>
        <div className="text-xs text-slate-400">A pool of capital governed by predefined rules</div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-center text-slate-500 text-xs">↙ capital in</div>
          <Party title="Depositor" subtitle="Puts money in · earns yield" tone="depositor" />
        </div>
        <div className="space-y-2">
          <div className="text-center text-slate-500 text-xs">↘ loan out</div>
          <Party title="Borrower" subtitle="Receives capital · repays + interest" tone="borrower" />
        </div>
      </div>
    </div>
  )
}

const FLOW_STEPS = [
  { from: 'Alice', to: 'Vault', amount: '$10,000', label: 'Deposit' },
  { from: 'Vault', to: 'Bob', amount: '$8,000', label: 'Loan' },
  { from: 'Bob', to: 'Vault', amount: 'Principal + interest', label: 'Repayment' },
  { from: 'Vault', to: 'Alice', amount: 'Yield', label: 'Distribution' }
]

function MoneyFlow() {
  const [step, setStep] = useState(0)
  const current = FLOW_STEPS[step]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <Party title="Alice" subtitle="Depositor" tone="depositor" />
        <Party title="Vault" subtitle="Protocol" tone="protocol" />
        <Party title="Bob" subtitle="Borrower" tone="borrower" />
      </div>
      <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/30 px-4 py-5 text-center">
        <div className="text-xs uppercase tracking-wide text-indigo-300">{current.label}</div>
        <div className="text-xl font-semibold mt-1">
          {current.from} → {current.to}
        </div>
        <div className="text-slate-300 mt-1">{current.amount}</div>
        <div className="flow-dot mx-auto mt-4" />
      </div>
      <div className="flex gap-2">
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Previous
        </Btn>
        <Btn onClick={() => setStep((s) => (s + 1) % FLOW_STEPS.length)}>
          {step === FLOW_STEPS.length - 1 ? 'Replay' : 'Next movement'}
        </Btn>
      </div>
    </div>
  )
}

type SimLoan = {
  id: number
  borrower: string
  principal: number
  outstanding: number
  status: 'pending' | 'active' | 'paid' | 'defaulted'
  guarantor?: string
}

function ClassroomSim() {
  const [depositors, setDepositors] = useState([
    { name: 'Alice', amount: 25000 },
    { name: 'James', amount: 15000 },
    { name: 'Company ABC', amount: 25000 },
    { name: 'Priya', amount: 20000 },
    { name: 'Northside Credit', amount: 15000 }
  ])
  const [borrowers, setBorrowers] = useState(['Bob’s Construction LLC', 'River Clinic', 'Elm Freight'])
  const [loans, setLoans] = useState<SimLoan[]>([
    { id: 1, borrower: 'Bob’s Construction LLC', principal: 8000, outstanding: 8000, status: 'active' },
    { id: 2, borrower: 'River Clinic', principal: 18000, outstanding: 18000, status: 'active' },
    { id: 3, borrower: 'Elm Freight', principal: 14000, outstanding: 14000, status: 'active' }
  ])
  const [depositAmt, setDepositAmt] = useState('5000')
  const [loanAmt, setLoanAmt] = useState('4000')
  const [newBorrower, setNewBorrower] = useState('New borrower LLC')
  const [log, setLog] = useState<string[]>(['Classroom vault opened at $100,000 with $40,000 already lent.'])

  const outstanding = loans.filter((l) => l.status === 'active').reduce((s, l) => s + l.outstanding, 0)
  const capital = depositors.reduce((s, d) => s + d.amount, 0)
  const available = Math.max(0, capital - outstanding)

  function note(msg: string) {
    setLog((l) => [msg, ...l].slice(0, 12))
  }

  function makeDeposit() {
    const amt = Number(depositAmt)
    if (!amt || amt <= 0) return
    setDepositors((d) => [...d, { name: `LP ${d.length + 1}`, amount: amt }])
    note(`Deposit of $${amt.toLocaleString()} added. You provided liquidity — you did not buy the vault.`)
  }

  function createBorrower() {
    const name = newBorrower.trim() || `Borrower ${borrowers.length + 1}`
    setBorrowers((b) => [...b, name])
    note(`${name} can now request capital.`)
  }

  function requestLoan() {
    const amt = Number(loanAmt)
    const borrower = borrowers[borrowers.length - 1]
    if (!amt || !borrower) return
    setLoans((ls) => [
      ...ls,
      { id: Date.now(), borrower, principal: amt, outstanding: amt, status: 'pending' }
    ])
    note(`${borrower} requested $${amt.toLocaleString()}. Waiting for protocol approval.`)
  }

  function approveLoan() {
    const pending = loans.find((l) => l.status === 'pending')
    if (!pending) return note('No pending request.')
    if (pending.principal > available) return note('Not enough available liquidity.')
    setLoans((ls) => ls.map((l) => (l.id === pending.id ? { ...l, status: 'active' as const } : l)))
    note(`Approved $${pending.principal.toLocaleString()} to ${pending.borrower}.`)
  }

  function makePayment() {
    const active = loans.find((l) => l.status === 'active')
    if (!active) return note('No active loan.')
    const pay = Math.min(2000, active.outstanding)
    setLoans((ls) =>
      ls.map((l) => {
        if (l.id !== active.id) return l
        const next = l.outstanding - pay
        return { ...l, outstanding: next, status: next <= 0 ? 'paid' : 'active' }
      })
    )
    note(`${active.borrower} paid $${pay.toLocaleString()} back into the vault.`)
  }

  function defaultLoan() {
    const active = loans.find((l) => l.status === 'active')
    if (!active) return note('No active loan.')
    setLoans((ls) => ls.map((l) => (l.id === active.id ? { ...l, status: 'defaulted', outstanding: 0 } : l)))
    const haircut = Math.round(active.outstanding * 0.2)
    setDepositors((ds) => {
      const total = ds.reduce((s, d) => s + d.amount, 0)
      return ds.map((d) => ({ ...d, amount: Math.round(d.amount - (d.amount / total) * haircut) }))
    })
    note(
      `${active.borrower} defaulted. First-loss / socialized shortfall of ~$${haircut.toLocaleString()} hit depositor positions.`
    )
  }

  function addGuarantor() {
    const active = loans.find((l) => l.status === 'active' && !l.guarantor)
    if (!active) return note('No unguaranteed active loan.')
    setLoans((ls) => ls.map((l) => (l.id === active.id ? { ...l, guarantor: 'Sam Guarantor' } : l)))
    note(`Sam Guarantor now stands behind ${active.borrower} if they do not perform.`)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Vault capital" value={`$${capital.toLocaleString()}`} />
        <Stat label="Depositors" value={`${depositors.length}`} />
        <Stat label="Outstanding loans" value={`$${outstanding.toLocaleString()}`} />
        <Stat label="Available liquidity" value={`$${available.toLocaleString()}`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className="w-28 bg-slate-800 rounded px-2 py-1 text-sm"
          value={depositAmt}
          onChange={(e) => setDepositAmt(e.target.value)}
        />
        <Btn onClick={makeDeposit}>Make deposit</Btn>
        <input
          className="w-40 bg-slate-800 rounded px-2 py-1 text-sm"
          value={newBorrower}
          onChange={(e) => setNewBorrower(e.target.value)}
        />
        <Btn onClick={createBorrower}>Create borrower</Btn>
        <input
          className="w-28 bg-slate-800 rounded px-2 py-1 text-sm"
          value={loanAmt}
          onChange={(e) => setLoanAmt(e.target.value)}
        />
        <Btn onClick={requestLoan}>Request loan</Btn>
        <Btn onClick={approveLoan}>Approve loan</Btn>
        <Btn onClick={makePayment}>Make payment</Btn>
        <Btn className="bg-rose-700 hover:bg-rose-600" onClick={defaultLoan}>
          Default loan
        </Btn>
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={addGuarantor}>
          Add guarantor
        </Btn>
      </div>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-slate-500 mb-2">Depositors</div>
          {depositors.map((d) => (
            <div key={d.name} className="flex justify-between text-slate-300">
              <span>{d.name}</span>
              <span className="font-mono">${d.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-2">Loans</div>
          {loans.map((l) => (
            <div key={l.id} className="text-slate-300">
              {l.borrower} · ${l.outstanding.toLocaleString()} · {l.status}
              {l.guarantor ? ` · guarantor: ${l.guarantor}` : ''}
            </div>
          ))}
        </div>
      </div>
      <div className="font-mono text-xs text-slate-400 space-y-1">
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  )
}

function LessonBody({ n }: { n: number }) {
  switch (n) {
    case 0:
      return (
        <div className="space-y-5">
          <p className="text-slate-300">
            Someone supplies the money. Someone needs the money. Something manages the agreement
            between them.
          </p>
          <ThreePartyDiagram />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2">Role</th>
                  <th>Provides</th>
                  <th>Receives</th>
                  <th>Primary responsibility</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                <tr className="border-t border-slate-800">
                  <td className="py-2">Depositor</td>
                  <td>Capital</td>
                  <td>Yield / repayment economics</td>
                  <td>Fund the vault</td>
                </tr>
                <tr className="border-t border-slate-800">
                  <td className="py-2">Borrower</td>
                  <td>Repayment obligation</td>
                  <td>Capital</td>
                  <td>Repay the loan</td>
                </tr>
                <tr className="border-t border-slate-800">
                  <td className="py-2">Protocol</td>
                  <td>Infrastructure</td>
                  <td>Fees</td>
                  <td>Facilitate and administer</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-300 rounded-lg border border-amber-700/40 bg-amber-950/20 p-3">
            You are not buying the vault. You are providing capital to the vault.
          </p>
          <details className="text-sm text-slate-400">
            <summary className="cursor-pointer text-slate-200">Advanced lending roles →</summary>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Guarantor — optional; stands behind the borrower if they do not perform</li>
              <li>Broker / loan originator — later; finds and packages borrowers, earns a point</li>
              <li>Vault creator / administrator — configures rules; does not own depositor funds</li>
              <li>Collateral custodian, underwriter, servicer — operational extras</li>
            </ul>
          </details>
        </div>
      )
    case 1:
      return (
        <div className="space-y-4 text-slate-300">
          <p>
            A vault is a pool of capital governed by predefined rules. Depositors own their{' '}
            <strong className="text-slate-100">position</strong> in that pool — not the vault
            itself.
          </p>
          <Card title="JRPU Lending Vault #001">
            <ul className="text-sm space-y-2">
              <li>
                <Term name="Maximum Vault Size" />: $250,000
              </li>
              <li>
                <Term name="Minimum Deposit" />: $100
              </li>
              <li>
                <Term name="Maximum Deposit" />: $25,000
              </li>
              <li>
                <Term name="Loan Duration" />: 3–36 months
              </li>
              <li>
                <Term name="Maximum Loan-to-Vault Ratio" />: 80%
              </li>
            </ul>
          </Card>
          <p className="text-sm text-slate-400">Click any term to see what it means.</p>
        </div>
      )
    case 2:
      return (
        <div className="space-y-4 text-slate-300">
          <p>These participants are providing liquidity. They are liquidity providers.</p>
          <div className="font-mono text-sm space-y-1 bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div>Alice deposits &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;$10,000</div>
            <div>James deposits &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;$5,000</div>
            <div>Company ABC deposits $25,000</div>
            <div className="pt-2 text-indigo-300">Total vault capital &nbsp;$40,000</div>
          </div>
          <Party title="Alice · rAlice…" subtitle="Balance $25,000 · Deposits $10,000" tone="depositor" />
          <p>
            Alice still owns her economic claim. She does not become the vault creator or
            administrator by depositing.
          </p>
        </div>
      )
    case 3:
      return (
        <div className="space-y-4 text-slate-300">
          <p>The borrower is not the broker and not the protocol.</p>
          <Card title="Loan request">
            <div className="text-sm space-y-1">
              <div>Borrower: Bob’s Construction LLC</div>
              <div>Requested: $8,000</div>
              <div>Purpose: Equipment</div>
              <div>Term: 12 months</div>
            </div>
          </Card>
          <Card title="Underwriting (educational)">
            <p className="text-xs text-slate-500 mb-2">What the protocol may consider</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span>Identity</span>
              <span>Income / revenue</span>
              <span>Existing obligations</span>
              <span>Collateral</span>
              <span>Guarantor</span>
              <span>Payment history</span>
              <span>Loan purpose</span>
              <span>Requested amount</span>
            </div>
            <div className="mt-3 text-sm border-t border-slate-800 pt-3">
              Approved $8,000 · 12 months · 10% APR · 1% origination · collateral required ·
              guarantor none
            </div>
          </Card>
        </div>
      )
    case 4:
      return (
        <div className="space-y-4 text-slate-300">
          <p>This is what everyone is actually agreeing to.</p>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {(
              [
                'Principal',
                'APR',
                'APY',
                'Term',
                'Payment frequency',
                'Collateral',
                'Default',
                'Origination fee',
                'Points'
              ] as const
            ).map((name) => (
              <div key={name} className="rounded-lg border border-slate-800 p-3">
                <Term name={name} />
              </div>
            ))}
          </div>
          <Card title="Loan agreement">
            <div className="text-sm space-y-1 font-mono">
              <div>Principal: $8,000</div>
              <div>Interest: 10% APR</div>
              <div>Duration: 12 months · monthly</div>
              <div>Prepayment: allowed</div>
              <div>Collateral: equipment</div>
            </div>
            <p className="text-sm mt-3">
              <span className="text-amber-300">Borrower signs this agreement.</span> A{' '}
              <strong className="text-slate-100">guarantor</strong> (sometimes called a co-signer)
              signs only if one is used. Depositors do not sign each loan.
            </p>
          </Card>
        </div>
      )
    case 5:
      return (
        <div className="space-y-4 text-slate-300">
          <p>Follow the same dollars through the system.</p>
          <MoneyFlow />
          <ul className="text-sm space-y-1">
            <li>Who is depositing? The lender / liquidity provider.</li>
            <li>Who is borrowing? The borrower.</li>
            <li>Who facilitates it? The protocol.</li>
          </ul>
        </div>
      )
    case 6:
      return (
        <div className="space-y-3 text-slate-300 text-sm">
          <p>Yield is not magic. Capital can be delayed or lost.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-slate-100">Borrower default</strong> — repayments stop; first-loss
              cover and then depositor principal absorb the shortfall.
            </li>
            <li>
              <strong className="text-slate-100">Liquidity risk</strong> — lent capital is not instantly
              recallable. Withdrawals may wait.
            </li>
            <li>
              <strong className="text-slate-100">Collateral risk</strong> — pledged assets may not cover
              the unpaid balance.
            </li>
            <li>
              <strong className="text-slate-100">Protocol / ledger risk</strong> — rules live in XRPL
              transactions plus an operator. This is not a fully trustless EVM vault.
            </li>
            <li>
              <strong className="text-slate-100">Concentration risk</strong> — one large borrower or
              depositor can dominate outcomes.
            </li>
          </ul>
        </div>
      )
    default:
      return (
        <div className="space-y-4">
          <p className="text-slate-300">
            Classroom money only — nothing hits Devnet until you open the live lab.
          </p>
          <ClassroomSim />
        </div>
      )
  }
}

export default function Academy({ onOpenLab }: { onOpenLab: () => void }) {
  const [lesson, setLesson] = useState(0)

  return (
    <div className="grid lg:grid-cols-[16rem_1fr] gap-6">
      <aside className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-slate-500 px-2">JRPU Lending Academy</div>
        {LESSONS.map((title, i) => (
          <button
            key={title}
            type="button"
            onClick={() => setLesson(i)}
            className={
              'w-full text-left rounded-lg px-3 py-2 text-sm transition ' +
              (i === lesson ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900')
            }
          >
            <span className="text-xs opacity-70">Lesson {i + 1}</span>
            <div>{title}</div>
          </button>
        ))}
      </aside>
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-300">How a loan works</p>
          <h1 className="text-2xl font-bold mt-1">
            Lesson {lesson + 1}: {LESSONS[lesson]}
          </h1>
        </div>
        <LessonBody n={lesson} />
        <div className="flex flex-wrap gap-2 pt-2">
          <Btn
            className="bg-slate-700 hover:bg-slate-600"
            disabled={lesson === 0}
            onClick={() => setLesson((n) => n - 1)}
          >
            Previous lesson
          </Btn>
          {lesson < LESSONS.length - 1 ? (
            <Btn onClick={() => setLesson((n) => n + 1)}>Next lesson</Btn>
          ) : (
            <Btn onClick={onOpenLab}>Open the live Devnet lab</Btn>
          )}
        </div>
      </div>
    </div>
  )
}
