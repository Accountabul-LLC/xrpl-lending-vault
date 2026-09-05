import { useEffect, useState } from 'react'
import { Btn, Card, Stat } from '../ui'
import { EntityPanel } from './components/EntityPanel'
import { InfoPanel } from './components/InfoPanel'
import { LessonNav } from './components/LessonNav'
import { LifecycleTracker } from './components/LifecycleTracker'
import { StepControls } from './components/StepControls'
import { ADVANCED_ROLES, formatUsd, STORY } from './experience/story'
import Institutional from './institutional/Institutional'
import { INST_LESSONS } from './institutional/glossary'
import { TrackToggle } from './institutional/shared'
import { LendingPipelineCanvas } from './pipeline/LendingPipelineCanvas'
import { SimulationProvider, useSimulation } from './simulation/SimulationContext'

export type AcademyTrack = 'basic' | 'institutional'

const LESSONS = [
  'Meet the Parties',
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
    <span className="inline-flex flex-col items-start max-w-full align-top">
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
          role="note"
          className="mt-1 w-full max-w-prose rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300 shadow-xl"
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
        <div className="space-y-3 text-slate-300">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {(
              [
                {
                  title: 'Administrator',
                  tone: 'border-indigo-500/40 bg-indigo-950/20',
                  duty: 'Creates the rules and the vault',
                  entity: 'administrator' as const
                },
                {
                  title: 'Depositor / Lender',
                  tone: 'border-emerald-500/40 bg-emerald-950/20',
                  duty: 'Puts capital into the vault',
                  entity: 'depositor' as const
                },
                {
                  title: 'Lending Vault',
                  tone: 'border-sky-500/40 bg-sky-950/20',
                  duty: 'Holds capital and funds loans',
                  entity: 'vault' as const
                },
                {
                  title: 'Borrower',
                  tone: 'border-amber-500/40 bg-amber-950/20',
                  duty: 'Requests capital and repays it',
                  entity: 'borrower' as const
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
                <div className="mt-1 text-[11px] text-slate-400">{role.duty}</div>
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
        <div className="space-y-3 text-slate-300">
          <p className="text-sm">
            The administrator configures a vault — a pool of capital with rules. Depositors own a{' '}
            <strong className="text-slate-100">position</strong> in that pool, not the vault itself.
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
                Permitted asset: {STORY.asset}
              </li>
              <li>
                <Term name="Maximum Loan-to-Vault Ratio" />: 80%
              </li>
            </ul>
          </Card>
        </div>
      )
    case 2:
      return (
        <div className="space-y-3 text-slate-300">
          <p className="text-sm">
            Alice is the depositor. Watch capital move from her hands into the vault. The classroom
            uses {formatUsd(STORY.deposit)} so the fill is obvious.
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => sim.goToStep(3, !reduceMotion, 2)}>Watch the deposit</Btn>
            <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => sim.selectEntity('depositor')}>
              Inspect depositor
            </Btn>
          </div>
        </div>
      )
    case 3:
      return (
        <div className="space-y-3 text-slate-300">
          <p className="text-sm">
            Bob requests {formatUsd(STORY.loan)}. The protocol reviews it, then vault capital moves
            to the borrower.
          </p>
          <Card title="Loan request">
            <div className="text-sm space-y-1 font-mono">
              <div>Borrower: {sim.primaryBorrower.name}</div>
              <div>Amount: {formatUsd(STORY.loan)}</div>
              <div>Purpose: Equipment</div>
              <div>Term: 12 months · 10% APR · monthly</div>
            </div>
          </Card>
        </div>
      )
    case 4:
      return (
        <div className="space-y-3 text-slate-300">
          <p className="text-sm">This is what the borrower is actually agreeing to.</p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {(
              [
                'Principal',
                'APR',
                'Term',
                'Payment frequency',
                'Interest',
                'Default',
                'Origination fee',
                'Collateral'
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
        </div>
      )
    case 5:
      return (
        <div className="space-y-3 text-slate-300 text-sm">
          <p>
            Follow the same dollars: deposit → vault → loan → borrower → repayment (principal and
            interest) → vault yield → depositor benefit.
          </p>
        </div>
      )
    case 6:
      return (
        <div className="space-y-3 text-slate-300 text-sm">
          <p>Yield is not magic. If the borrower misses a payment, expected cash does not arrive.</p>
          <div className="flex flex-wrap gap-2">
            <Btn className="bg-rose-800 hover:bg-rose-700" onClick={() => sim.missPayment()}>
              Simulate Missed Payment
            </Btn>
            <Btn className="bg-rose-700 hover:bg-rose-600" onClick={() => sim.simulateDefault()}>
              Simulate Default
            </Btn>
          </div>
          {sim.state.missedPayment && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 space-y-1 font-mono text-xs">
              <div>Expected Payment: ${sim.state.expectedPayment.toFixed(2)}</div>
              <div className="text-rose-300">Received: ${sim.state.receivedPayment.toFixed(2)}</div>
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
    <div className="space-y-3">
      <p className="text-slate-300 text-sm">
        Classroom money only. Every action updates the same lending world.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Vault capital" value={formatUsd(vault.totalCapital)} />
        <Stat label="Available" value={formatUsd(vault.availableLiquidity)} />
        <Stat label="Outstanding" value={formatUsd(vault.outstandingLoans)} />
        <Stat label="Interest earned" value={formatUsd(vault.interestEarned)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => sim.configureVault()}>Configure Vault</Btn>
        <Btn onClick={() => sim.addDepositor()}>Add Depositor</Btn>
        <Btn onClick={() => sim.deposit(STORY.deposit, !reduceMotion)}>Deposit</Btn>
        <Btn onClick={() => sim.addBorrower()}>Create Borrower</Btn>
        <Btn onClick={() => sim.requestLoan(STORY.loan)}>Request Loan</Btn>
        <Btn onClick={() => sim.approveLoan()}>Approve</Btn>
        <Btn onClick={() => sim.fundLoan(!reduceMotion)}>Fund</Btn>
        <Btn onClick={() => sim.makePayment(!reduceMotion)}>Make Payment</Btn>
        <Btn className="bg-rose-800 hover:bg-rose-700" onClick={() => sim.missPayment()}>
          Miss Payment
        </Btn>
        <Btn onClick={() => sim.payOff()}>Repay Loan</Btn>
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => sim.withdraw(2000)}>
          Withdraw
        </Btn>
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => sim.reset()}>
          Reset
        </Btn>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span>JRPU distribution policy</span>
        {(['accrue', 'daily', 'weekly', 'monthly'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => sim.setDistributionPolicy(p)}
            className={
              'rounded-md border px-2 py-1 capitalize ' +
              (sim.state.distributionPolicy === p
                ? 'border-indigo-400 bg-indigo-950/40 text-indigo-100'
                : 'border-slate-700')
            }
          >
            {p === 'accrue' ? 'Accrue in vault' : p}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4 text-sm min-w-0">
        <div className="min-w-0">
          <div className="text-xs text-slate-500 mb-2">Depositors</div>
          {depositors.map((d) => (
            <div key={d.id} className="flex justify-between gap-3 min-w-0 text-slate-300">
              <span className="truncate">{d.name}</span>
              <span className="font-mono shrink-0">{formatUsd(d.deposited)}</span>
            </div>
          ))}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-slate-500 mb-2">Loans ({borrowers.length} borrowers)</div>
          {loans.map((l) => (
            <div key={l.id} className="text-slate-300 break-words">
              {borrowers.find((b) => b.id === l.borrowerId)?.name} · {formatUsd(l.remaining)} · {l.status}
            </div>
          ))}
        </div>
      </div>
      <div className="font-mono text-xs text-slate-400 space-y-1 max-h-28 overflow-y-auto">
        {log.map((l, i) => (
          <div key={i} className="break-words">
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}

function parseTrack(): AcademyTrack {
  if (typeof window === 'undefined') return 'basic'
  return new URLSearchParams(window.location.search).get('track') === 'institutional'
    ? 'institutional'
    : 'basic'
}

function parseLesson(track: AcademyTrack): number {
  if (typeof window === 'undefined') return 0
  const n = Number(new URLSearchParams(window.location.search).get('lesson'))
  const max = track === 'institutional' ? INST_LESSONS.length : LESSONS.length
  return Number.isFinite(n) && n >= 1 && n <= max ? n - 1 : 0
}

function AcademyInner({ onOpenLab }: { onOpenLab: () => void }) {
  const [track, setTrack] = useState<AcademyTrack>(parseTrack)
  const [lesson, setLesson] = useState(() => parseLesson(parseTrack()))
  const [instLesson, setInstLesson] = useState(() =>
    parseTrack() === 'institutional' ? parseLesson('institutional') : 0
  )
  const [reduceMotion, setReduceMotion] = useState(false)
  const sim = useSimulation()

  function changeTrack(next: AcademyTrack) {
    setTrack(next)
    if (next === 'basic' && lesson < 0) setLesson(0)
  }

  useEffect(() => {
    if (track !== 'basic') return
    sim.setLessonPreset(lesson)
    const url = new URL(window.location.href)
    url.searchParams.delete('track')
    url.searchParams.set('lesson', String(lesson + 1))
    window.history.replaceState({}, '', url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, track])

  useEffect(() => {
    if (track !== 'institutional') return
    const url = new URL(window.location.href)
    url.searchParams.set('track', 'institutional')
    url.searchParams.set('lesson', String(instLesson + 1))
    window.history.replaceState({}, '', url)
  }, [instLesson, track])

  if (track === 'institutional') {
    return (
      <Institutional
        onOpenLab={onOpenLab}
        track={track}
        setTrack={changeTrack}
        lesson={instLesson}
        setLesson={setInstLesson}
        reduceMotion={reduceMotion}
        setReduceMotion={setReduceMotion}
      />
    )
  }

  const lessonBlurb: Record<number, string> = {
    0: 'Watch the people, the vault, and the capital. Play the full process.',
    1: 'The administrator sets the rules and creates the vault that will hold liquidity.',
    2: 'The depositor brings capital. It becomes vault liquidity.',
    3: 'The borrower requests, the protocol reviews, the vault funds the loan.',
    4: 'Principal, APR, term, and monthly payments are the borrower’s obligation.',
    5: 'Follow one path of money from deposit through repayment to depositor yield.',
    6: 'If repayment fails, expected cash is not received — and the vault is impaired.',
    7: 'Drive the same world yourself: configure, deposit, lend, repay, or miss a payment.'
  }

  return (
    <div className="academy-shell min-w-0 lg:h-[calc(100vh-3.25rem)] lg:min-h-[640px] grid grid-cols-1 lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)] gap-3 lg:gap-4">
      <aside className="relative z-[var(--z-sticky-sidebar)] min-w-0 flex flex-col gap-1 lg:overflow-visible">
        <div className="pb-1">
          <TrackToggle track={track} onChange={changeTrack} />
        </div>
        <LessonNav lessons={LESSONS} lesson={lesson} onSelect={setLesson} />
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

      <div className="min-w-0 flex flex-col gap-2 lg:overflow-hidden">
        <header className="shrink-0 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-indigo-300 leading-none">
            Lending protocol & vault
          </p>
          <h1 className="text-xl lg:text-2xl font-bold mt-0.5 leading-tight break-words">
            Lesson {lesson + 1}: {LESSONS[lesson]}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-4xl">{lessonBlurb[lesson]}</p>
        </header>

        <div className="shrink-0">
          <StepControls lesson={lesson} reducedMotion={reduceMotion} />
        </div>

        <div className="min-h-[220px] lg:min-h-0 flex-1 flex flex-col gap-2 min-w-0">
          <LendingPipelineCanvas lesson={lesson} reduceMotionOverride={reduceMotion} />
          <LifecycleTracker stage={sim.state.lifecycleStage} />
        </div>

        <div className="shrink-0">
          <InfoPanel />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] gap-3 items-start min-h-0 lg:overflow-auto lg:max-h-[32vh]">
          <div className="min-w-0">
            <LessonCopy lesson={lesson} reduceMotion={reduceMotion} />
            <AdvancedRolesStrip />
          </div>
          <div className="space-y-2 min-w-0">
            <EntityPanel />
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

function AdvancedRolesStrip() {
  const sim = useSimulation()
  const level = sim.state.advancedReveal
  return (
    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Advanced lending roles</div>
          <div className="text-sm text-slate-200">Same world, more desks around the vault</div>
        </div>
        <button
          type="button"
          onClick={() => sim.setAdvancedReveal(level > 0 ? 0 : 6)}
          className="text-[11px] px-2 py-1 rounded-md border border-slate-700 text-slate-300 hover:border-slate-500"
        >
          {level > 0 ? 'Hide extras' : 'Show all'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ADVANCED_ROLES.map((role, i) => {
          const on = level > i
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => {
                sim.setAdvancedReveal(on && level === i + 1 ? i : i + 1)
                sim.selectEntity(role.id)
              }}
              className={
                'rounded-full border px-2.5 py-1 text-[11px] transition ' +
                (on
                  ? 'border-indigo-400/50 bg-indigo-950/40 text-indigo-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500')
              }
            >
              {role.label}
            </button>
          )
        })}
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
