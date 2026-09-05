import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode
} from 'react'
import {
  lessonStartStep,
  lessonStepRange,
  snapshotAfterStep,
  STORY,
  stepHasMotion
} from '../experience/story'
import {
  createInitialState,
  DEMO_DEPOSIT,
  DEMO_INTEREST_SHARE,
  DEMO_LOAN,
  DEMO_PAYMENT,
  DEMO_PRINCIPAL_SHARE,
  DEMO_YIELD,
  stateFromSnapshotStep
} from './defaults'
import type {
  AnimationRequest,
  DistributionPolicy,
  EntityId,
  LifecycleStage,
  SimulationState
} from './types'
import { stageForStep } from './types'

const animationCallbacks = new Map<string, () => void>()

export function takeAnimationCallback(id: string) {
  const cb = animationCallbacks.get(id)
  animationCallbacks.delete(id)
  return cb
}

type Action =
  | { type: 'RESET' }
  | { type: 'HYDRATE'; state: SimulationState }
  | { type: 'SET_LESSON_PRESET'; lesson: number }
  | { type: 'SELECT_ENTITY'; entity: EntityId | null }
  | { type: 'SELECT_TERM'; term: string | null }
  | { type: 'TOGGLE_ADVANCED'; show?: boolean }
  | { type: 'SET_ADVANCED_REVEAL'; level: number }
  | { type: 'SET_STAGE'; stage: LifecycleStage }
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_BANNER'; banner: string | null }
  | { type: 'SET_DISTRIBUTION'; policy: DistributionPolicy }
  | { type: 'NOTE'; msg: string }
  | { type: 'QUEUE_ANIM'; anim: AnimationRequest }
  | { type: 'START_ANIM'; id: string }
  | { type: 'CLEAR_ANIM'; id: string }
  | { type: 'CONFIGURE_VAULT' }
  | { type: 'APPLY_DEPOSIT'; depositorId: string; amount: number }
  | { type: 'APPLY_LOAN_FUND'; loanId: string }
  | { type: 'APPLY_PAYMENT'; loanId: string; principal: number; interest: number }
  | { type: 'APPLY_YIELD'; depositorId: string; amount: number; asCash: boolean }
  | { type: 'REQUEST_LOAN'; amount: number; borrowerId?: string }
  | { type: 'ADVANCE_UNDERWRITE' }
  | { type: 'APPROVE_LOAN' }
  | { type: 'REJECT_LOAN' }
  | { type: 'ADD_DEPOSITOR'; name?: string; amount?: number }
  | { type: 'ADD_BORROWER'; name?: string }
  | { type: 'ADD_GUARANTOR' }
  | { type: 'SIMULATE_DEFAULT' }
  | { type: 'MISS_PAYMENT' }
  | { type: 'WITHDRAW'; amount: number }
  | { type: 'PAY_OFF' }
  | { type: 'ACCEPT_AGREEMENT' }

function note(state: SimulationState, msg: string): SimulationState {
  return { ...state, log: [msg, ...state.log].slice(0, 16) }
}

function withStep(state: SimulationState, step: number): SimulationState {
  const next = Math.max(1, Math.min(10, step))
  return {
    ...state,
    currentStep: next,
    lifecycleStage: stageForStep(next)
  }
}

function reducer(state: SimulationState, action: Action): SimulationState {
  switch (action.type) {
    case 'RESET':
      return createInitialState(0)
    case 'HYDRATE':
      return action.state
    case 'SET_LESSON_PRESET': {
      const start = lessonStartStep(action.lesson)
      const before = Math.max(0, start - 1)
      const next = createInitialState(before)
      next.currentStep = start
      next.lifecycleStage = stageForStep(start)
      next.riskMode = action.lesson === 6
      next.selectedEntity =
        action.lesson === 1 ? 'vault' : action.lesson === 2 ? 'depositor' : action.lesson === 3 ? 'borrower' : null
      next.statusBanner = null
      next.defaultedConnection = false
      next.missedPayment = false
      next.log = [
        action.lesson === 7
          ? 'Sandbox: configure the vault, then deposit, lend, and repay.'
          : `Lesson ${action.lesson + 1} — start at Step ${start}.`
      ]
      return next
    }
    case 'SELECT_ENTITY':
      return { ...state, selectedEntity: action.entity }
    case 'SELECT_TERM':
      return { ...state, selectedTerm: action.term }
    case 'TOGGLE_ADVANCED': {
      const show = action.show ?? !state.showAdvancedRoles
      return {
        ...state,
        showAdvancedRoles: show,
        advancedReveal: show ? Math.max(state.advancedReveal, 6) : 0
      }
    }
    case 'SET_ADVANCED_REVEAL': {
      const level = Math.max(0, Math.min(6, action.level))
      return { ...state, advancedReveal: level, showAdvancedRoles: level > 0 }
    }
    case 'SET_STAGE':
      return { ...state, lifecycleStage: action.stage }
    case 'SET_STEP':
      return withStep(state, action.step)
    case 'SET_BANNER':
      return { ...state, statusBanner: action.banner }
    case 'SET_DISTRIBUTION':
      return { ...state, distributionPolicy: action.policy }
    case 'NOTE':
      return note(state, action.msg)
    case 'QUEUE_ANIM':
      return { ...state, pendingAnimations: [...state.pendingAnimations, action.anim] }
    case 'START_ANIM':
      return {
        ...state,
        pendingAnimations: state.pendingAnimations.map((a) =>
          a.id === action.id ? { ...a, started: true } : a
        )
      }
    case 'CLEAR_ANIM':
      return {
        ...state,
        pendingAnimations: state.pendingAnimations.filter((a) => a.id !== action.id)
      }
    case 'CONFIGURE_VAULT':
      return note(
        withStep(
          {
            ...state,
            rulesDefined: true,
            vault: { ...state.vault, configured: true },
            statusBanner: 'VAULT CONFIGURED'
          },
          2
        ),
        'Administrator applied vault limits, XRP as the permitted asset, and lending rules.'
      )
    case 'ACCEPT_AGREEMENT':
      return note(
        withStep({ ...state, agreementAccepted: true, statusBanner: 'AGREEMENT ACCEPTED' }, 8),
        'Borrower accepted principal, APR, term, and monthly repayment.'
      )
    case 'APPLY_DEPOSIT': {
      const depositors = state.depositors.map((d) =>
        d.id === action.depositorId
          ? {
              ...d,
              balance: Math.max(0, d.balance - action.amount),
              deposited: d.deposited + action.amount,
              vaultPosition: d.vaultPosition + action.amount
            }
          : d
      )
      const total = depositors.reduce((s, d) => s + d.deposited, 0)
      return note(
        withStep(
          {
            ...state,
            depositors,
            statusBanner: `DEPOSITED $${action.amount.toLocaleString()}`,
            vault: {
              ...state.vault,
              configured: true,
              totalCapital: total,
              availableLiquidity: Math.max(0, total - state.vault.outstandingLoans)
            }
          },
          3
        ),
        `${state.depositors.find((d) => d.id === action.depositorId)?.name ?? 'Depositor'} deposited $${action.amount.toLocaleString()} into the vault.`
      )
    }
    case 'APPLY_LOAN_FUND': {
      const loan = state.loans.find((l) => l.id === action.loanId)
      if (!loan) return state
      const loans = state.loans.map((l) =>
        l.id === action.loanId ? { ...l, status: 'active' as const, remaining: l.principal } : l
      )
      const borrowers = state.borrowers.map((b) =>
        b.id === loan.borrowerId
          ? {
              ...b,
              status: 'funded' as const,
              loanPrincipal: loan.principal,
              remainingBalance: loan.principal,
              outstandingPrincipal: loan.principal,
              approvedAmount: loan.principal,
              nextPaymentDue: true
            }
          : b
      )
      const outstanding = loans
        .filter((l) => l.status === 'active' || l.status === 'funded')
        .reduce((s, l) => s + l.remaining, 0)
      return note(
        withStep(
          {
            ...state,
            loans,
            borrowers,
            agreementAccepted: true,
            statusBanner: 'LOAN FUNDED',
            vault: {
              ...state.vault,
              outstandingLoans: outstanding,
              availableLiquidity: Math.max(0, state.vault.totalCapital - outstanding)
            },
            protocol: {
              ...state.protocol,
              feesCollected: state.protocol.feesCollected + loan.principal * loan.originationFee,
              transactionsProcessed: state.protocol.transactionsProcessed + 1
            }
          },
          7
        ),
        `Funded $${loan.principal.toLocaleString()} from the vault to ${state.borrowers.find((b) => b.id === loan.borrowerId)?.name}.`
      )
    }
    case 'APPLY_PAYMENT': {
      const loan = state.loans.find((l) => l.id === action.loanId)
      if (!loan) return state
      const remaining = Math.max(0, loan.remaining - action.principal)
      const loans = state.loans.map((l) =>
        l.id === action.loanId
          ? { ...l, remaining, status: remaining <= 0.01 ? ('paid' as const) : ('active' as const) }
          : l
      )
      const borrowers = state.borrowers.map((b) =>
        b.id === loan.borrowerId
          ? {
              ...b,
              remainingBalance: remaining,
              outstandingPrincipal: remaining,
              status: remaining <= 0.01 ? ('paid' as const) : ('repaying' as const),
              nextPaymentDue: remaining > 0.01
            }
          : b
      )
      const outstanding = loans
        .filter((l) => l.status === 'active' || l.status === 'funded')
        .reduce((s, l) => s + l.remaining, 0)
      return note(
        withStep(
          {
            ...state,
            loans,
            borrowers,
            missedPayment: false,
            receivedPayment: action.principal + action.interest,
            expectedPayment: STORY.payment,
            statusBanner: `PAYMENT $${(action.principal + action.interest).toFixed(2)}`,
            vault: {
              ...state.vault,
              outstandingLoans: outstanding,
              availableLiquidity: Math.max(0, state.vault.totalCapital - outstanding),
              interestEarned: state.vault.interestEarned + action.interest
            },
            protocol: {
              ...state.protocol,
              transactionsProcessed: state.protocol.transactionsProcessed + 1
            }
          },
          9
        ),
        `Payment received — principal $${action.principal.toFixed(2)} returned to liquidity; interest $${action.interest.toFixed(2)} is vault yield.`
      )
    }
    case 'APPLY_YIELD': {
      const depositors = state.depositors.map((d) =>
        d.id === action.depositorId
          ? {
              ...d,
              earnedYield: d.earnedYield + action.amount,
              vaultPosition: d.vaultPosition + action.amount,
              balance: action.asCash ? d.balance + action.amount : d.balance
            }
          : d
      )
      return note(
        withStep(
          {
            ...state,
            depositors,
            statusBanner: action.asCash
              ? `JRPU DISTRIBUTION +$${action.amount.toFixed(2)}`
              : `VAULT YIELD +$${action.amount.toFixed(2)}`
          },
          10
        ),
        action.asCash
          ? `Application policy (${state.distributionPolicy}) distributed $${action.amount.toFixed(2)} cash to ${state.depositors.find((d) => d.id === action.depositorId)?.name}.`
          : `Interest accrued as vault yield — depositor position up $${action.amount.toFixed(2)}. No automatic native XRPL daily cash payment.`
      )
    }
    case 'REQUEST_LOAN': {
      const borrowerId = action.borrowerId ?? state.primaryBorrowerId
      const borrower = state.borrowers.find((b) => b.id === borrowerId)
      if (!borrower) return state
      const id = `loan-${Date.now()}`
      const loan = {
        id,
        borrowerId,
        principal: action.amount,
        remaining: action.amount,
        apr: STORY.apr,
        termMonths: STORY.termMonths,
        paymentAmount: STORY.payment,
        paymentFrequency: 'Monthly' as const,
        originationFee: 0.01,
        status: 'pending' as const
      }
      return note(
        withStep(
          {
            ...state,
            loans: [...state.loans.filter((l) => l.status !== 'pending'), loan],
            borrowers: state.borrowers.map((b) =>
              b.id === borrowerId
                ? {
                    ...b,
                    status: 'requesting' as const,
                    requestedAmount: action.amount,
                    paymentAmount: STORY.payment,
                    interestRate: STORY.apr,
                    termMonths: STORY.termMonths
                  }
                : b
            ),
            underwritingPhase: 0,
            statusBanner: 'LOAN REQUESTED'
          },
          5
        ),
        `${borrower.name} requested $${action.amount.toLocaleString()} for ${borrower.purpose || 'working capital'}.`
      )
    }
    case 'ADVANCE_UNDERWRITE': {
      const phase = Math.min(4, state.underwritingPhase + 1)
      return {
        ...state,
        underwritingPhase: phase,
        lifecycleStage: phase < 2 ? 'request' : 'approve',
        statusBanner: phase < 2 ? 'REVIEWING' : 'READY TO APPROVE'
      }
    }
    case 'APPROVE_LOAN': {
      const pending = state.loans.find((l) => l.status === 'pending')
      if (!pending) return note(state, 'No pending loan request.')
      if (pending.principal > state.vault.availableLiquidity) {
        return note(state, 'Not enough available liquidity to approve.')
      }
      return note(
        withStep(
          {
            ...state,
            loans: state.loans.map((l) =>
              l.id === pending.id ? { ...l, status: 'approved' as const } : l
            ),
            borrowers: state.borrowers.map((b) =>
              b.id === pending.borrowerId
                ? { ...b, status: 'approved' as const, approvedAmount: pending.principal }
                : b
            ),
            statusBanner: 'APPROVED'
          },
          6
        ),
        `Approved $${pending.principal.toLocaleString()}. Ready to fund from vault liquidity.`
      )
    }
    case 'REJECT_LOAN': {
      const pending = state.loans.find((l) => l.status === 'pending')
      if (!pending) return note(state, 'No pending loan request.')
      return note(
        {
          ...state,
          loans: state.loans.map((l) =>
            l.id === pending.id ? { ...l, status: 'rejected' as const } : l
          ),
          borrowers: state.borrowers.map((b) =>
            b.id === pending.borrowerId ? { ...b, status: 'rejected' as const } : b
          ),
          statusBanner: 'REJECTED'
        },
        'Loan request rejected.'
      )
    }
    case 'ADD_DEPOSITOR': {
      const n = state.depositors.length + 1
      const amount = action.amount ?? 5000
      const d = {
        id: `d-${Date.now()}`,
        name: action.name ?? `LP ${n}`,
        wallet: `rLP${n}Demo…`,
        balance: amount * 2,
        deposited: 0,
        vaultPosition: 0,
        earnedYield: 0
      }
      return note(
        { ...state, depositors: [...state.depositors, d], primaryDepositorId: d.id },
        `${d.name} joined and can now deposit.`
      )
    }
    case 'ADD_BORROWER': {
      const n = state.borrowers.length + 1
      const b = {
        id: `b-${Date.now()}`,
        name: action.name ?? `Borrower ${n} LLC`,
        wallet: `rBorr${n}Demo…`,
        requestedAmount: 0,
        approvedAmount: 0,
        loanPrincipal: 0,
        remainingBalance: 0,
        outstandingPrincipal: 0,
        interestRate: STORY.apr,
        termMonths: STORY.termMonths,
        paymentAmount: STORY.payment,
        status: 'none' as const,
        nextPaymentDue: false,
        purpose: 'Working capital'
      }
      return note(
        { ...state, borrowers: [...state.borrowers, b], primaryBorrowerId: b.id },
        `${b.name} can now request capital.`
      )
    }
    case 'ADD_GUARANTOR': {
      const active = state.loans.find((l) => (l.status === 'active' || l.status === 'funded') && !l.guarantor)
      if (!active) return note(state, 'No unguaranteed active loan.')
      return note(
        {
          ...state,
          showAdvancedRoles: true,
          advancedReveal: Math.max(state.advancedReveal, 4),
          loans: state.loans.map((l) =>
            l.id === active.id ? { ...l, guarantor: 'Sam Guarantor' } : l
          ),
          borrowers: state.borrowers.map((b) =>
            b.id === active.borrowerId ? { ...b, guarantor: 'Sam Guarantor' } : b
          )
        },
        'Sam Guarantor now stands behind the borrower.'
      )
    }
    case 'SIMULATE_DEFAULT': {
      const active = state.loans.find((l) => l.status === 'active' || l.status === 'funded')
      if (!active) return note(state, 'No active loan to default.')
      const haircut = Math.round(active.remaining * 0.2)
      const total = state.depositors.reduce((s, d) => s + d.deposited, 0) || 1
      const depositors = state.depositors.map((d) => {
        const loss = (d.deposited / total) * haircut
        return {
          ...d,
          deposited: Math.max(0, Math.round(d.deposited - loss)),
          vaultPosition: Math.max(0, Math.round(d.vaultPosition - loss))
        }
      })
      const capital = depositors.reduce((s, d) => s + d.deposited, 0)
      return note(
        {
          ...state,
          depositors,
          defaultedConnection: true,
          missedPayment: true,
          riskMode: true,
          receivedPayment: 0,
          expectedPayment: DEMO_PAYMENT,
          statusBanner: 'DEFAULT — $0 RECEIVED',
          vault: {
            ...state.vault,
            totalCapital: capital,
            outstandingLoans: 0,
            availableLiquidity: capital
          },
          loans: state.loans.map((l) =>
            l.id === active.id ? { ...l, status: 'defaulted' as const, remaining: 0 } : l
          ),
          borrowers: state.borrowers.map((b) =>
            b.id === active.borrowerId
              ? {
                  ...b,
                  status: 'defaulted' as const,
                  remainingBalance: 0,
                  outstandingPrincipal: 0,
                  nextPaymentDue: false
                }
              : b
          )
        },
        `Default: expected $${DEMO_PAYMENT.toFixed(2)}, received $0. About $${haircut.toLocaleString()} shortfall hits depositor positions.`
      )
    }
    case 'MISS_PAYMENT':
      return note(
        withStep(
          {
            ...state,
            defaultedConnection: true,
            missedPayment: true,
            receivedPayment: 0,
            expectedPayment: DEMO_PAYMENT,
            statusBanner: `MISSED — expected $${DEMO_PAYMENT.toFixed(2)}, received $0`,
            riskMode: true
          },
          9
        ),
        'Missed payment. Expected cash did not return to the vault.'
      )
    case 'WITHDRAW': {
      const d = state.depositors.find((x) => x.id === state.primaryDepositorId)
      if (!d) return state
      const amt = Math.min(action.amount, d.deposited, state.vault.availableLiquidity)
      if (amt <= 0) return note(state, 'Insufficient liquidity for withdrawal.')
      const depositors = state.depositors.map((x) =>
        x.id === d.id
          ? {
              ...x,
              deposited: x.deposited - amt,
              vaultPosition: Math.max(0, x.vaultPosition - amt),
              balance: x.balance + amt
            }
          : x
      )
      const totalDep = depositors.reduce((s, x) => s + x.deposited, 0)
      return note(
        {
          ...state,
          depositors,
          vault: {
            ...state.vault,
            totalCapital: totalDep,
            availableLiquidity: Math.max(0, totalDep - state.vault.outstandingLoans)
          }
        },
        `${d.name} withdrew $${amt.toLocaleString()}.`
      )
    }
    case 'PAY_OFF': {
      const active = state.loans.find(
        (l) =>
          (l.status === 'active' || l.status === 'funded') &&
          l.borrowerId === state.primaryBorrowerId
      )
      if (!active) return note(state, 'No active primary loan to pay off.')
      const interest = Math.round(active.remaining * 0.02 * 100) / 100
      return reducer(
        { ...state, statusBanner: 'PAYOFF' },
        {
          type: 'APPLY_PAYMENT',
          loanId: active.id,
          principal: active.remaining,
          interest
        }
      )
    }
    default:
      return state
  }
}

export type SimulationApi = {
  state: SimulationState
  primaryDepositor: SimulationState['depositors'][0]
  primaryBorrower: SimulationState['borrowers'][0]
  primaryLoan: SimulationState['loans'][0] | undefined
  reset: () => void
  setLessonPreset: (lesson: number) => void
  selectEntity: (entity: EntityId | null) => void
  selectTerm: (term: string | null) => void
  toggleAdvanced: (show?: boolean) => void
  setAdvancedReveal: (level: number) => void
  setStage: (stage: LifecycleStage) => void
  setDistributionPolicy: (policy: DistributionPolicy) => void
  clearAnimation: (id: string) => void
  startAnimation: (id: string) => void
  queueAnimation: (
    anim: Omit<AnimationRequest, 'id' | 'started'> & { id?: string; onComplete?: () => void }
  ) => string
  configureVault: () => void
  acceptAgreement: () => void
  deposit: (amount?: number, animate?: boolean) => void
  requestLoan: (amount?: number) => void
  advanceUnderwrite: () => void
  approveLoan: () => void
  rejectLoan: () => void
  fundLoan: (animate?: boolean) => void
  makePayment: (animate?: boolean) => void
  distributeYield: (animate?: boolean) => void
  addDepositor: () => void
  addBorrower: () => void
  addGuarantor: () => void
  simulateDefault: () => void
  missPayment: () => void
  withdraw: (amount?: number) => void
  payOff: () => void
  goToStep: (step: number, animate: boolean, lesson?: number) => void
  playLifecycleStep: (step: number, reducedMotion: boolean) => void
}

const SimulationContext = createContext<SimulationApi | null>(null)

function hydrateQuiet(step: number, prev: SimulationState): SimulationState {
  const seeded = stateFromSnapshotStep(Math.max(0, step))
  return {
    ...seeded,
    selectedEntity: prev.selectedEntity,
    selectedTerm: prev.selectedTerm,
    showAdvancedRoles: prev.showAdvancedRoles,
    advancedReveal: prev.advancedReveal,
    distributionPolicy: prev.distributionPolicy,
    pendingAnimations: []
  }
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState(0))

  const primaryDepositor =
    state.depositors.find((d) => d.id === state.primaryDepositorId) ?? state.depositors[0]
  const primaryBorrower =
    state.borrowers.find((b) => b.id === state.primaryBorrowerId) ?? state.borrowers[0]
  const primaryLoan = state.loans.find(
    (l) =>
      l.borrowerId === primaryBorrower?.id &&
      (l.status === 'active' || l.status === 'funded' || l.status === 'approved' || l.status === 'pending')
  )

  const queueAnimation = useCallback(
    (anim: Omit<AnimationRequest, 'id' | 'started'> & { id?: string; onComplete?: () => void }) => {
      const id = anim.id ?? `anim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      if (anim.onComplete) animationCallbacks.set(id, anim.onComplete)
      const { onComplete: _cb, ...rest } = anim
      void _cb
      dispatch({ type: 'QUEUE_ANIM', anim: { ...rest, id, started: false } })
      return id
    },
    []
  )

  const clearAnimation = useCallback((id: string) => {
    takeAnimationCallback(id)
    dispatch({ type: 'CLEAR_ANIM', id })
  }, [])

  const startAnimation = useCallback((id: string) => {
    dispatch({ type: 'START_ANIM', id })
  }, [])

  const deposit = useCallback(
    (amount: number = DEMO_DEPOSIT, animate = true) => {
      const depositorId = state.primaryDepositorId
      if (!animate) {
        dispatch({ type: 'APPLY_DEPOSIT', depositorId, amount })
        return
      }
      queueAnimation({
        from: 'depositor',
        to: 'vault',
        amount,
        kind: 'deposit',
        label: `$${amount.toLocaleString()}`,
        onComplete: () => dispatch({ type: 'APPLY_DEPOSIT', depositorId, amount })
      })
      dispatch({ type: 'SET_STEP', step: 3 })
      dispatch({ type: 'SET_BANNER', banner: 'DEPOSITING…' })
    },
    [queueAnimation, state.primaryDepositorId]
  )

  const fundLoan = useCallback(
    (animate = true) => {
      const loan =
        state.loans.find((l) => l.status === 'approved') ??
        state.loans.find((l) => l.status === 'pending')
      if (!loan) {
        dispatch({ type: 'NOTE', msg: 'No approved loan to fund.' })
        return
      }
      if (loan.status === 'pending') dispatch({ type: 'APPROVE_LOAN' })
      const run = () => dispatch({ type: 'APPLY_LOAN_FUND', loanId: loan.id })
      if (!animate) {
        run()
        return
      }
      queueAnimation({
        from: 'vault',
        to: 'borrower',
        amount: loan.principal,
        kind: 'loan',
        label: `$${loan.principal.toLocaleString()}`,
        onComplete: run
      })
      dispatch({ type: 'SET_BANNER', banner: 'FUNDING…' })
    },
    [queueAnimation, state.loans]
  )

  const makePayment = useCallback(
    (animate = true) => {
      const loan = state.loans.find(
        (l) =>
          (l.status === 'active' || l.status === 'funded') &&
          l.borrowerId === state.primaryBorrowerId
      )
      if (!loan) {
        dispatch({ type: 'NOTE', msg: 'No active loan for payment.' })
        return
      }
      const principal = Math.min(DEMO_PRINCIPAL_SHARE, loan.remaining)
      const interest = DEMO_INTEREST_SHARE
      const run = () => dispatch({ type: 'APPLY_PAYMENT', loanId: loan.id, principal, interest })
      if (!animate) {
        run()
        return
      }
      queueAnimation({
        from: 'borrower',
        to: 'vault',
        amount: principal,
        kind: 'principal',
        label: `Principal $${principal.toFixed(2)}`
      })
      queueAnimation({
        from: 'borrower',
        to: 'vault',
        amount: interest,
        kind: 'interest',
        label: `Interest $${interest.toFixed(2)}`,
        onComplete: run
      })
      dispatch({ type: 'SET_BANNER', banner: `PAYMENT $${DEMO_PAYMENT.toFixed(2)}` })
    },
    [queueAnimation, state.loans, state.primaryBorrowerId]
  )

  const distributeYield = useCallback(
    (animate = true) => {
      const amount = DEMO_YIELD
      const depositorId = state.primaryDepositorId
      const asCash = state.distributionPolicy !== 'accrue'
      const run = () => dispatch({ type: 'APPLY_YIELD', depositorId, amount, asCash })
      if (!animate) {
        run()
        return
      }
      queueAnimation({
        from: 'vault',
        to: 'depositor',
        amount,
        kind: 'yield',
        label: asCash ? `Distribution +$${amount.toFixed(2)}` : `Yield +$${amount.toFixed(2)}`,
        onComplete: run
      })
      dispatch({
        type: 'SET_BANNER',
        banner: asCash ? 'JRPU DISTRIBUTION…' : 'VAULT YIELD ACCRUING…'
      })
    },
    [queueAnimation, state.primaryDepositorId, state.distributionPolicy]
  )

  const goToStep = useCallback(
    (step: number, animate: boolean, lesson = 0) => {
      const [min, max] = lessonStepRange(lesson)
      const target = Math.max(min, Math.min(max, step))
      const before = hydrateQuiet(target - 1, state)
      dispatch({
        type: 'HYDRATE',
        state: { ...before, currentStep: target, lifecycleStage: stageForStep(target) }
      })

      const play = animate && stepHasMotion(target)
      if (target === 1) {
        dispatch({ type: 'SET_BANNER', banner: 'STEP 1 — SET THE RULES' })
        dispatch({ type: 'NOTE', msg: 'Administrator defines vault limits, asset, and lending rules.' })
        dispatch({ type: 'SELECT_ENTITY', entity: 'administrator' })
        return
      }
      if (target === 2) {
        dispatch({ type: 'CONFIGURE_VAULT' })
        dispatch({ type: 'SELECT_ENTITY', entity: 'vault' })
        return
      }
      if (target === 3) {
        if (play) {
          queueAnimation({
            from: 'depositor',
            to: 'vault',
            amount: STORY.deposit,
            kind: 'deposit',
            label: `$${STORY.deposit.toLocaleString()}`,
            onComplete: () =>
              dispatch({ type: 'APPLY_DEPOSIT', depositorId: 'd-alice', amount: STORY.deposit })
          })
          dispatch({ type: 'SET_BANNER', banner: 'DEPOSITING…' })
        } else {
          dispatch({ type: 'APPLY_DEPOSIT', depositorId: 'd-alice', amount: STORY.deposit })
        }
        dispatch({ type: 'SELECT_ENTITY', entity: 'depositor' })
        return
      }
      if (target === 4) {
        dispatch({ type: 'SET_BANNER', banner: 'CAPITAL AVAILABLE' })
        dispatch({ type: 'NOTE', msg: `Vault holds $${STORY.deposit.toLocaleString()} of available liquidity.` })
        dispatch({ type: 'SELECT_ENTITY', entity: 'vault' })
        return
      }
      if (target === 5) {
        dispatch({ type: 'REQUEST_LOAN', amount: STORY.loan })
        if (play) {
          queueAnimation({
            from: 'borrower',
            to: 'administrator',
            amount: 1,
            kind: 'request',
            label: 'Loan request'
          })
        }
        dispatch({ type: 'SELECT_ENTITY', entity: 'borrower' })
        return
      }
      if (target === 6) {
        dispatch({ type: 'APPROVE_LOAN' })
        dispatch({ type: 'SELECT_ENTITY', entity: 'administrator' })
        return
      }
      if (target === 7) {
        if (play) {
          queueAnimation({
            from: 'vault',
            to: 'borrower',
            amount: STORY.loan,
            kind: 'loan',
            label: `$${STORY.loan.toLocaleString()}`,
            onComplete: () => dispatch({ type: 'APPLY_LOAN_FUND', loanId: 'loan-story' })
          })
          dispatch({ type: 'SET_BANNER', banner: 'FUNDING…' })
        } else {
          dispatch({ type: 'APPLY_LOAN_FUND', loanId: 'loan-story' })
        }
        dispatch({ type: 'SELECT_ENTITY', entity: 'borrower' })
        return
      }
      if (target === 8) {
        dispatch({ type: 'ACCEPT_AGREEMENT' })
        dispatch({ type: 'SELECT_ENTITY', entity: 'agreement' })
        return
      }
      if (target === 9) {
        if (play) {
          queueAnimation({
            from: 'borrower',
            to: 'vault',
            amount: DEMO_PRINCIPAL_SHARE,
            kind: 'principal',
            label: `Principal $${DEMO_PRINCIPAL_SHARE.toFixed(2)}`
          })
          queueAnimation({
            from: 'borrower',
            to: 'vault',
            amount: DEMO_INTEREST_SHARE,
            kind: 'interest',
            label: `Interest $${DEMO_INTEREST_SHARE.toFixed(2)}`,
            onComplete: () =>
              dispatch({
                type: 'APPLY_PAYMENT',
                loanId: 'loan-story',
                principal: DEMO_PRINCIPAL_SHARE,
                interest: DEMO_INTEREST_SHARE
              })
          })
          dispatch({ type: 'SET_BANNER', banner: `PAYMENT $${DEMO_PAYMENT.toFixed(2)}` })
        } else {
          dispatch({
            type: 'APPLY_PAYMENT',
            loanId: 'loan-story',
            principal: DEMO_PRINCIPAL_SHARE,
            interest: DEMO_INTEREST_SHARE
          })
        }
        dispatch({ type: 'SELECT_ENTITY', entity: 'borrower' })
        return
      }
      if (target === 10) {
        const asCash = state.distributionPolicy !== 'accrue'
        if (play) {
          queueAnimation({
            from: 'vault',
            to: 'depositor',
            amount: DEMO_YIELD,
            kind: 'yield',
            label: asCash ? `Distribution +$${DEMO_YIELD.toFixed(2)}` : `Yield +$${DEMO_YIELD.toFixed(2)}`,
            onComplete: () =>
              dispatch({ type: 'APPLY_YIELD', depositorId: 'd-alice', amount: DEMO_YIELD, asCash })
          })
          dispatch({
            type: 'SET_BANNER',
            banner: asCash ? 'JRPU DISTRIBUTION…' : 'VAULT YIELD ACCRUING…'
          })
        } else {
          dispatch({ type: 'APPLY_YIELD', depositorId: 'd-alice', amount: DEMO_YIELD, asCash })
        }
        dispatch({ type: 'SELECT_ENTITY', entity: 'depositor' })
      }
    },
    [queueAnimation, state]
  )

  const playLifecycleStep = useCallback(
    (step: number, reducedMotion: boolean) => {
      goToStep(step, !reducedMotion, 5)
    },
    [goToStep]
  )

  const api = useMemo<SimulationApi>(
    () => ({
      state,
      primaryDepositor,
      primaryBorrower,
      primaryLoan,
      reset: () => dispatch({ type: 'RESET' }),
      setLessonPreset: (lesson) => dispatch({ type: 'SET_LESSON_PRESET', lesson }),
      selectEntity: (entity) => dispatch({ type: 'SELECT_ENTITY', entity }),
      selectTerm: (term) => dispatch({ type: 'SELECT_TERM', term }),
      toggleAdvanced: (show) => dispatch({ type: 'TOGGLE_ADVANCED', show }),
      setAdvancedReveal: (level) => dispatch({ type: 'SET_ADVANCED_REVEAL', level }),
      setStage: (stage) => dispatch({ type: 'SET_STAGE', stage }),
      setDistributionPolicy: (policy) => dispatch({ type: 'SET_DISTRIBUTION', policy }),
      clearAnimation,
      startAnimation,
      queueAnimation,
      configureVault: () => dispatch({ type: 'CONFIGURE_VAULT' }),
      acceptAgreement: () => dispatch({ type: 'ACCEPT_AGREEMENT' }),
      deposit,
      requestLoan: (amount = DEMO_LOAN) => dispatch({ type: 'REQUEST_LOAN', amount }),
      advanceUnderwrite: () => dispatch({ type: 'ADVANCE_UNDERWRITE' }),
      approveLoan: () => dispatch({ type: 'APPROVE_LOAN' }),
      rejectLoan: () => dispatch({ type: 'REJECT_LOAN' }),
      fundLoan,
      makePayment,
      distributeYield,
      addDepositor: () => dispatch({ type: 'ADD_DEPOSITOR' }),
      addBorrower: () => dispatch({ type: 'ADD_BORROWER' }),
      addGuarantor: () => dispatch({ type: 'ADD_GUARANTOR' }),
      simulateDefault: () => dispatch({ type: 'SIMULATE_DEFAULT' }),
      missPayment: () => dispatch({ type: 'MISS_PAYMENT' }),
      withdraw: (amount = 2000) => dispatch({ type: 'WITHDRAW', amount }),
      payOff: () => dispatch({ type: 'PAY_OFF' }),
      goToStep,
      playLifecycleStep
    }),
    [
      state,
      primaryDepositor,
      primaryBorrower,
      primaryLoan,
      clearAnimation,
      startAnimation,
      queueAnimation,
      deposit,
      fundLoan,
      makePayment,
      distributeYield,
      goToStep,
      playLifecycleStep
    ]
  )

  return <SimulationContext.Provider value={api}>{children}</SimulationContext.Provider>
}

export function useSimulation() {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider')
  return ctx
}

void snapshotAfterStep
void lessonStartStep
