import { useEffect, useState } from 'react'
import { Btn, Card, Stat } from '../ui'
import { EntityPanel } from './components/EntityPanel'
import { LifecyclePlayer } from './components/LifecyclePlayer'
import { LifecycleTracker } from './components/LifecycleTracker'
import { LendingPipelineCanvas } from './pipeline/LendingPipelineCanvas'
import { SimulationProvider, useSimulation } from './simulation/SimulationContext'

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
    'A depositor. They provide capital to the vault; they do not buy or own the vault.',
  Interest: 'The cost of borrowing — the portion of repayment that becomes depositor yield.'
}

function Term({
  name,
  onSelect
}: {
  name: keyof typeof GLOSSARY
  onSelect?: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          onSelect?.(name)
        }}
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

function LessonCopy({ lesson, reduceMotion }: { lesson: number; reduceMotion: boolean }) {
  const sim = useSimulation()

  switch (lesson) {
    case 0:
      return (
        <div className="space-y-3 text-slate-300">
          <div className="grid sm:grid-cols-3 gap-3">
            {(
              [
                {
                  title: 'Depositor',
                  tone: 'border-emerald-500/40 bg-emerald-950/20',
                  provides: 'Capital',
                  receives: 'Yield / repayment economics',
                  duty: 'Fund the vault',
                  entity: 'depositor' as const
                },
                {
                  title: 'Borrower',
                  tone: 'border-amber-500/40 bg-amber-950/20',
                  provides: 'Repayment obligation',
                  receives: 'Capital',
                  duty: 'Repay the loan',
                  entity: 'borrower' as const
                },
                {
                  title: 'Protocol',
                  tone: 'border-indigo-500/40 bg-indigo-950/20',
                  provides: 'Infrastructure',
                  receives: 'Fees',
                  duty: 'Facilitate and administer',
                  entity: 'protocol' as const
                }
              ] as const
            ).map((role) => (
              <button
                key={role.title}
                type="button"
                onClick={() => sim.selectEntity(role.entity)}
                className={`rounded-xl border p-3 text-left transition hover:brightness-110 ${role.tone}`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-100">
                  {role.title}
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Provides:</span> {role.provides}
                  </div>
                  <div>
                    <span className="text-slate-500">Receives:</span> {role.receives}
                  </div>
                  <div>
                    <span className="text-slate-500">Duty:</span> {role.duty}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <p className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-xs">
            You are not buying the vault. You are providing capital to the vault.
          </p>
        </div>
      )
    case 1:
      return (
        <div className="space-y-4 text-slate-300">
          <p>
            A vault is a pool of capital governed by predefined rules. Depositors own their{' '}
            <strong className="text-slate-100">position</strong> in that pool — not the vault
            itself. Watch the chamber fill as capital concentrates in the center.
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
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => sim.deposit(10000, !reduceMotion)}>Animate sample deposit</Btn>
            <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => sim.selectEntity('vault')}>
              Inspect vault
            </Btn>
          </div>
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
            <div className="pt-2 text-indigo-300">
              Total vault capital &nbsp;${sim.state.vault.totalCapital.toLocaleString()}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => sim.deposit(10000, !reduceMotion)}>Deposit $10,000</Btn>
            <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => sim.selectEntity('depositor')}>
              Open depositor panel
            </Btn>
          </div>
          <p className="text-sm">
            Alice still owns her economic claim. She does not become the vault creator or
            administrator by depositing.
          </p>
        </div>
      )
    case 3: {
      const phases = ['REQUEST', 'UNDERWRITE', 'APPROVE', 'SIGN', 'FUND']
      return (
        <div className="space-y-4 text-slate-300">
          <p>The borrower is not the broker and not the protocol.</p>
          <Card title="Loan request">
            <div className="text-sm space-y-1">
              <div>Borrower: {sim.primaryBorrower.name}</div>
              <div>Requested: $8,000</div>
              <div>Purpose: Equipment</div>
              <div>Term: 12 months</div>
            </div>
          </Card>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {phases.map((p, i) => (
              <div key={p} className="flex items-center gap-2">
                <span
                  className={
                    'rounded px-2 py-1 border ' +
                    (i <= sim.state.underwritingPhase
                      ? 'border-amber-400/50 bg-amber-950/40 text-amber-100'
                      : 'border-slate-700 text-slate-500')
                  }
                >
                  {p}
                </span>
                {i < phases.length - 1 && <span className="text-slate-600">↓</span>}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => sim.requestLoan(8000)}>Request Loan</Btn>
            <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => sim.advanceUnderwrite()}>
              Advance underwriting
            </Btn>
            <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => sim.approveLoan()}>
              Approve
            </Btn>
            <Btn onClick={() => sim.fundLoan(!reduceMotion)}>Fund $8,000</Btn>
          </div>
          {sim.state.statusBanner === 'LOAN FUNDED' && (
            <Card title="Loan funded">
              <div className="text-sm font-mono space-y-1">
                <div>Principal: $8,000</div>
                <div>APR: 10%</div>
                <div>Term: 12 months</div>
                <div>Payments: Monthly</div>
              </div>
            </Card>
          )}
        </div>
      )
    }
    case 4:
      return (
        <div className="space-y-4 text-slate-300">
          <p>This is what everyone is actually agreeing to. Select a term to highlight its effect on the pipeline.</p>
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
                'Points',
                'Interest'
              ] as const
            ).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => sim.selectTerm(name)}
                className={
                  'rounded-lg border p-3 text-left transition ' +
                  (sim.state.selectedTerm === name
                    ? 'border-indigo-400 bg-indigo-950/40'
                    : 'border-slate-800 hover:border-slate-600')
                }
              >
                <Term name={name} onSelect={(n) => sim.selectTerm(n)} />
              </button>
            ))}
          </div>
          <Card title="Loan agreement">
            <div className="text-sm space-y-1 font-mono">
              <div>Principal: $8,000</div>
              <div>Interest: 10% APR</div>
              <div>Duration: 12 months · monthly</div>
              <div>Origination fee: 1%</div>
              <div>Prepayment: allowed</div>
              <div>Collateral: equipment</div>
              <div>Guarantor: none</div>
              <div>Default terms: grace then first-loss</div>
            </div>
            <p className="text-sm mt-3">
              <span className="text-amber-300">Borrower signs this agreement.</span> Depositors do
              not sign each loan.
            </p>
          </Card>
        </div>
      )
    case 5:
      return (
        <div className="space-y-4 text-slate-300">
          <p>Follow the same dollars through the system — deposit, lend, repay, distribute.</p>
          <LifecyclePlayer reducedMotion={reduceMotion} />
          <ul className="text-sm space-y-1">
            <li>Who is depositing? The lender / liquidity provider.</li>
            <li>Who is borrowing? The borrower.</li>
            <li>Who facilitates it? The protocol.</li>
          </ul>
        </div>
      )
    case 6:
      return (
        <div className="space-y-4 text-slate-300 text-sm">
          <p>Yield is not magic. Capital can be delayed or lost.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-slate-100">Borrower default</strong> — repayments stop;
              first-loss cover and then depositor principal absorb the shortfall.
            </li>
            <li>
              <strong className="text-slate-100">Liquidity risk</strong> — lent capital is not
              instantly recallable.
            </li>
            <li>
              <strong className="text-slate-100">Collateral risk</strong> — pledged assets may not
              cover the unpaid balance.
            </li>
            <li>
              <strong className="text-slate-100">Concentration risk</strong> — one large borrower or
              depositor can dominate outcomes.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Btn className="bg-rose-700 hover:bg-rose-600" onClick={() => sim.simulateDefault()}>
              Simulate Default
            </Btn>
            <Btn className="bg-rose-800 hover:bg-rose-700" onClick={() => sim.missPayment()}>
              Miss Payment
            </Btn>
          </div>
          {sim.state.defaultedConnection && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 space-y-1 font-mono text-xs">
              <div>Expected Payment: $703.33</div>
              <div className="text-rose-300">Received: $0</div>
              <div className="text-slate-400 pt-1">
                Vault liquidity and depositor returns are impaired until recovery or write-down.
              </div>
            </div>
          )}
        </div>
      )
    default:
      return <Sandbox reduceMotion={reduceMotion} />
  }
}

function Sandbox({ reduceMotion }: { reduceMotion: boolean }) {
  const sim = useSimulation()
  const { vault, depositors, borrowers, loans, log } = sim.state
  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-sm">
        Classroom money only — nothing hits Devnet until you open the live lab. Every action
        updates the network visualization.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Vault capital" value={`$${Math.round(vault.totalCapital).toLocaleString()}`} />
        <Stat label="Depositors" value={`${depositors.length}`} />
        <Stat label="Outstanding loans" value={`$${Math.round(vault.outstandingLoans).toLocaleString()}`} />
        <Stat label="Available liquidity" value={`$${Math.round(vault.availableLiquidity).toLocaleString()}`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => sim.addDepositor()}>Add Depositor</Btn>
        <Btn onClick={() => sim.deposit(5000, !reduceMotion)}>Deposit Capital</Btn>
        <Btn onClick={() => sim.addBorrower()}>Create Borrower</Btn>
        <Btn onClick={() => sim.requestLoan(4000)}>Request Loan</Btn>
        <Btn onClick={() => sim.approveLoan()}>Approve Loan</Btn>
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => sim.rejectLoan()}>
          Reject Loan
        </Btn>
        <Btn onClick={() => sim.fundLoan(!reduceMotion)}>Fund Loan</Btn>
        <Btn onClick={() => sim.makePayment(!reduceMotion)}>Make Payment</Btn>
        <Btn className="bg-rose-800 hover:bg-rose-700" onClick={() => sim.missPayment()}>
          Miss Payment
        </Btn>
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => sim.addGuarantor()}>
          Add Guarantor
        </Btn>
        <Btn onClick={() => sim.payOff()}>Pay Off Loan</Btn>
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => sim.withdraw(2000)}>
          Withdraw Capital
        </Btn>
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => sim.reset()}>
          Reset
        </Btn>
      </div>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-slate-500 mb-2">Depositors</div>
          {depositors.map((d) => (
            <div key={d.id} className="flex justify-between text-slate-300">
              <span>{d.name}</span>
              <span className="font-mono">${d.deposited.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-2">Loans ({borrowers.length} borrowers)</div>
          {loans.map((l) => (
            <div key={l.id} className="text-slate-300">
              {borrowers.find((b) => b.id === l.borrowerId)?.name} · ${l.remaining.toLocaleString()} ·{' '}
              {l.status}
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

function AcademyInner({ onOpenLab }: { onOpenLab: () => void }) {
  const [lesson, setLesson] = useState(() => {
    if (typeof window === 'undefined') return 0
    const n = Number(new URLSearchParams(window.location.search).get('lesson'))
    return Number.isFinite(n) && n >= 1 && n <= LESSONS.length ? n - 1 : 0
  })
  const [reduceMotion, setReduceMotion] = useState(false)
  const sim = useSimulation()

  useEffect(() => {
    sim.setLessonPreset(lesson)
    const url = new URL(window.location.href)
    url.searchParams.set('lesson', String(lesson + 1))
    window.history.replaceState({}, '', url)
    // intentionally only when lesson changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson])

  const lessonBlurb: Record<number, string> = {
    0: 'Someone supplies the money. Someone needs the money. Something manages the agreement.',
    1: 'A vault is a pool of capital governed by predefined rules — depositors own a position, not the vault.',
    2: 'Liquidity providers deposit capital into the vault and earn yield from borrower repayments.',
    3: 'Borrowers request capital from the vault; the protocol underwrites, approves, and funds the loan.',
    4: 'Loan terms define principal, rate, schedule, collateral, and what happens if payment stops.',
    5: 'Follow the same dollars: deposit → vault → loan → repayment → yield distribution.',
    6: 'Yield is not magic. Defaults, liquidity gaps, and concentration can impair returns.',
    7: 'Sandbox classroom money — every action updates the live network visualization.'
  }

  return (
    <div className="academy-shell h-[calc(100vh-3.25rem)] min-h-[640px] grid grid-cols-1 lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)] gap-3 lg:gap-4">
      {/* Compact lesson rail — no nested scrollbar on desktop */}
      <aside className="relative z-20 flex flex-col gap-1 lg:overflow-visible">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 px-2 pb-1">
          JRPU Lending Academy
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="Lessons">
          {LESSONS.map((title, i) => (
            <button
              key={title}
              type="button"
              onClick={() => setLesson(i)}
              className={
                'w-full text-left rounded-md px-2.5 py-1.5 text-[13px] leading-snug transition ' +
                (i === lesson ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900/80')
              }
            >
              <span className="block text-[10px] opacity-70 leading-none mb-0.5">Lesson {i + 1}</span>
              <span className="block">{title}</span>
            </button>
          ))}
        </nav>
        <label className="mt-2 flex items-center gap-2 px-2 text-[11px] text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => setReduceMotion(e.target.checked)}
            className="rounded border-slate-600"
          />
          Reduce motion
        </label>
      </aside>

      {/* Full-width main workspace */}
      <div className="min-w-0 flex flex-col gap-2.5 lg:overflow-auto">
        <header className="shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-indigo-300 leading-none">
            How a loan works
          </p>
          <h1 className="text-xl lg:text-2xl font-bold mt-0.5 leading-tight">
            Lesson {lesson + 1}: {LESSONS[lesson]}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-4xl">{lessonBlurb[lesson]}</p>
        </header>

        {/* Visualization + advanced roles side panel */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] gap-3 min-h-0">
          <div className="min-w-0 flex flex-col gap-2">
            <LendingPipelineCanvas lesson={lesson} reduceMotionOverride={reduceMotion} />
            <LifecycleTracker stage={sim.state.lifecycleStage} />
          </div>
          <AdvancedRolesPanel />
        </div>

        {/* Supporting content: lesson copy + entity inspector */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] gap-3 items-start">
          <div className="min-w-0">
            <LessonCopy lesson={lesson} reduceMotion={reduceMotion} />
          </div>
          <div className="space-y-2 xl:sticky xl:top-0">
            <EntityPanel />
            {!sim.state.selectedEntity && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-[11px] text-slate-500">
                Click Protocol, Vault, Depositor, or Borrower in the visualization to inspect
                responsibilities and balances.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 pb-2 shrink-0">
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

function AdvancedRolesPanel() {
  const sim = useSimulation()
  const open = sim.state.showAdvancedRoles
  const roles = [
    { id: 'guarantor' as const, name: 'Guarantor', blurb: 'Optional; stands behind the borrower if they do not perform.' },
    { id: 'broker' as const, name: 'Broker / Originator', blurb: 'Finds and packages borrowers; earns a point.' },
    { id: 'underwriter' as const, name: 'Underwriter', blurb: 'Evaluates credit risk before approval.' },
    { id: 'servicer' as const, name: 'Servicer', blurb: 'Collects payments and manages ongoing loan ops.' },
    { id: 'custodian' as const, name: 'Collateral Custodian', blurb: 'Holds pledged assets for the facility.' }
  ]

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex flex-col gap-2 h-fit xl:min-h-[200px]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Advanced roles</div>
          <div className="text-sm font-medium text-slate-200">Institutional extras</div>
        </div>
        <button
          type="button"
          onClick={() => sim.toggleAdvanced(!open)}
          className={
            'text-[11px] px-2 py-1 rounded-md border transition ' +
            (open
              ? 'border-indigo-400/50 bg-indigo-950/50 text-indigo-100'
              : 'border-slate-700 text-slate-400 hover:border-slate-500')
          }
        >
          {open ? 'Enabled' : 'Show on map'}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        Optional roles attach around the core three-party model. Enable to animate them into the
        network.
      </p>
      <div className="grid grid-cols-1 gap-1.5">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={!open}
            onClick={() => sim.selectEntity(r.id)}
            className={
              'text-left rounded-lg border px-2.5 py-2 transition ' +
              (open
                ? 'border-slate-700 hover:border-indigo-500/40 bg-slate-900/40'
                : 'border-slate-800/60 opacity-50 cursor-not-allowed')
            }
          >
            <div className="text-xs font-medium text-slate-200">{r.name}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{r.blurb}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Academy({ onOpenLab }: { onOpenLab: () => void }) {
  return (
    <SimulationProvider>
      <AcademyInner onOpenLab={onOpenLab} />
    </SimulationProvider>
  )
}
