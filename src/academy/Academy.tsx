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
    <span className="relative inline-block max-w-full align-baseline">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v)
          onSelect?.(name)
        }}
        className="text-indigo-300 underline decoration-dotted underline-offset-2 hover:text-indigo-200 text-left"
      >
        {name}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-[var(--z-popover)] left-0 top-full mt-1 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300 shadow-xl"
        >
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
        <div className="space-y-4 text-slate-300">
          <p>
            Someone supplies the money. Someone needs the money. Something manages the agreement
            between them. Click any node in the network to inspect it.
          </p>
          <div className="overflow-x-auto max-w-full">
            <table className="w-full min-w-[28rem] text-sm">
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
          <p className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-3 text-sm">
            You are not buying the vault. You are providing capital to the vault.
          </p>
          <details
            className="text-sm text-slate-400"
            open={sim.state.showAdvancedRoles}
            onToggle={(e) => sim.toggleAdvanced((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer text-slate-200">Advanced Lending Roles →</summary>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Guarantor — optional; stands behind the borrower if they do not perform</li>
              <li>Broker / loan originator — finds and packages borrowers, earns a point</li>
              <li>Underwriter / servicer / collateral custodian — operational extras</li>
            </ul>
            <p className="mt-2 text-xs text-indigo-300">
              Expanding this list animates optional roles into the network.
            </p>
          </details>
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs font-mono">
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
                {i < phases.length - 1 && (
                  <span className="text-slate-600" aria-hidden>
                    →
                  </span>
                )}
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
                  'rounded-lg border p-3 text-left transition min-w-0 ' +
                  (sim.state.selectedTerm === name
                    ? 'border-indigo-400 bg-indigo-950/40'
                    : 'border-slate-800 hover:border-slate-600')
                }
              >
                <span className="text-indigo-300 underline decoration-dotted underline-offset-2">
                  {name}
                </span>
                {sim.state.selectedTerm === name && (
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">{GLOSSARY[name]}</p>
                )}
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
      <div className="grid md:grid-cols-2 gap-4 text-sm min-w-0">
        <div className="min-w-0">
          <div className="text-xs text-slate-500 mb-2">Depositors</div>
          {depositors.map((d) => (
            <div key={d.id} className="flex justify-between gap-3 min-w-0 text-slate-300">
              <span className="truncate">{d.name}</span>
              <span className="font-mono shrink-0">${d.deposited.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-slate-500 mb-2">Loans ({borrowers.length} borrowers)</div>
          {loans.map((l) => (
            <div key={l.id} className="text-slate-300 break-words">
              {borrowers.find((b) => b.id === l.borrowerId)?.name} · ${l.remaining.toLocaleString()} ·{' '}
              {l.status}
              {l.guarantor ? ` · guarantor: ${l.guarantor}` : ''}
            </div>
          ))}
        </div>
      </div>
      <div className="font-mono text-xs text-slate-400 space-y-1 max-h-48 overflow-y-auto">
        {log.map((l, i) => (
          <div key={i} className="break-words">
            {l}
          </div>
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

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(13rem,15rem)_minmax(0,1fr)] lg:gap-6">
      <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start lg:z-[var(--z-sticky-sidebar)]">
        <div className="text-xs uppercase tracking-wide text-slate-500 px-1 lg:px-2">
          JRPU Lending Academy
        </div>
        <div className="lg:hidden mt-2 flex flex-wrap gap-1.5">
          {LESSONS.map((title, i) => (
            <button
              key={title}
              type="button"
              title={`Lesson ${i + 1}: ${title}`}
              aria-current={i === lesson ? 'page' : undefined}
              onClick={() => setLesson(i)}
              className={
                'h-9 min-w-9 px-2.5 rounded-lg text-sm transition ' +
                (i === lesson ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800')
              }
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="hidden lg:block space-y-2 mt-2">
          {LESSONS.map((title, i) => (
            <button
              key={title}
              type="button"
              aria-current={i === lesson ? 'page' : undefined}
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
        </div>
        <label className="mt-3 flex items-center gap-2 px-1 lg:px-2 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => setReduceMotion(e.target.checked)}
            className="rounded border-slate-600"
          />
          Reduce motion
        </label>
      </aside>

      <div className="space-y-5 min-w-0">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-indigo-300">How a loan works</p>
          <h1 className="text-xl sm:text-2xl font-bold mt-1 break-words">
            Lesson {lesson + 1}: {LESSONS[lesson]}
          </h1>
        </div>

        <LendingPipelineCanvas lesson={lesson} reduceMotionOverride={reduceMotion} />
        <LifecycleTracker stage={sim.state.lifecycleStage} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
          <div className="min-w-0">
            <LessonCopy lesson={lesson} reduceMotion={reduceMotion} />
          </div>
          <div className="space-y-3 min-w-0">
            <EntityPanel />
            {!sim.state.selectedEntity && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-500">
                Click Protocol, Vault, Depositor, or Borrower in the visualization to inspect
                responsibilities and balances.
              </div>
            )}
          </div>
        </div>

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

export default function Academy({ onOpenLab }: { onOpenLab: () => void }) {
  return (
    <SimulationProvider>
      <AcademyInner onOpenLab={onOpenLab} />
    </SimulationProvider>
  )
}
