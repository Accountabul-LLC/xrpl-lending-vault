import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode
} from 'react'
import {
  createInitialState,
  DEMO_DEPOSIT,
  DEMO_INTEREST_SHARE,
  DEMO_LOAN,
  DEMO_PAYMENT,
  DEMO_PRINCIPAL_SHARE,
  DEMO_YIELD
} from './defaults'
import type {
  AnimationRequest,
  EntityId,
  FlowKind,
  LifecycleStage,
  SimulationState
} from './types'

/** Callbacks live outside React state so Strict Mode remounts cannot lose or double-store them. */
const animationCallbacks = new Map<string, () => void>()

export function takeAnimationCallback(id: string) {
  const cb = animationCallbacks.get(id)
  animationCallbacks.delete(id)
  return cb
}

type Action =
  | { type: 'RESET' }
  | { type: 'SET_LESSON_PRESET'; lesson: number }
  | { type: 'SELECT_ENTITY'; entity: EntityId | null }
  | { type: 'SELECT_TERM'; term: string | null }
  | { type: 'TOGGLE_ADVANCED'; show?: boolean }
  | { type: 'SET_STAGE'; stage: LifecycleStage }
  | { type: 'SET_BANNER'; banner: string | null }
  | { type: 'NOTE'; msg: string }
  | { type: 'QUEUE_ANIM'; anim: AnimationRequest }
  | { type: 'START_ANIM'; id: string }
  | { type: 'CLEAR_ANIM'; id: string }
  | { type: 'APPLY_DEPOSIT'; depositorId: string; amount: number }
  | { type: 'APPLY_LOAN_FUND'; loanId: string }
  | { type: 'APPLY_PAYMENT'; loanId: string; principal: number; interest: number }
  | { type: 'APPLY_YIELD'; depositorId: string; amount: number }
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
  | { type: 'SET_RISK_MODE'; on: boolean }

function note(state: SimulationState, msg: string): SimulationState {
  return { ...state, log: [msg, ...state.log].slice(0, 16) }
}

function recalcVault(state: SimulationState): SimulationState {
  const totalCapital = state.depositors.reduce((s, d) => s + d.deposited, 0)
  const outstandingLoans = state.loans
    .filter((l) => l.status === 'active' || l.status === 'funded')
    .reduce((s, l) => s + l.remaining, 0)
  const interestEarned = state.depositors.reduce((s, d) => s + d.earnedYield, 0)
  return {
    ...state,
    vault: {
      ...state.vault,
      totalCapital,
      outstandingLoans,
      availableLiquidity: Math.max(0, totalCapital - outstandingLoans),
      interestEarned
    }
  }
}

function reducer(state: SimulationState, action: Action): SimulationState {
  switch (action.type) {
    case 'RESET':
      return createInitialState()
    case 'SET_LESSON_PRESET': {
      const next = { ...state, riskMode: action.lesson === 6, defaultedConnection: false }
      if (action.lesson === 0) return { ...next, lifecycleStage: 'deposit', selectedEntity: null }
      if (action.lesson === 1) return { ...next, selectedEntity: 'vault', lifecycleStage: 'deposit' }
      if (action.lesson === 2) return { ...next, selectedEntity: 'depositor', lifecycleStage: 'deposit' }
      if (action.lesson === 3) return { ...next, selectedEntity: 'borrower', lifecycleStage: 'request', underwritingPhase: 0 }
      if (action.lesson === 4) return { ...next, selectedEntity: null, selectedTerm: null, lifecycleStage: 'approve' }
      if (action.lesson === 5) return { ...next, lifecycleStage: 'deposit', statusBanner: null }
      if (action.lesson === 6) return { ...next, lifecycleStage: 'repay', selectedEntity: 'borrower' }
      return { ...next, lifecycleStage: 'deposit', selectedEntity: null }
    }
    case 'SELECT_ENTITY':
      return { ...state, selectedEntity: action.entity }
    case 'SELECT_TERM':
      return { ...state, selectedTerm: action.term }
    case 'TOGGLE_ADVANCED':
      return { ...state, showAdvancedRoles: action.show ?? !state.showAdvancedRoles }
    case 'SET_STAGE':
      return { ...state, lifecycleStage: action.stage }
    case 'SET_BANNER':
      return { ...state, statusBanner: action.banner }
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
    case 'APPLY_DEPOSIT': {
      const depositors = state.depositors.map((d) =>
        d.id === action.depositorId
          ? {
              ...d,
              balance: Math.max(0, d.balance - action.amount),
              deposited: d.deposited + action.amount
            }
          : d
      )
      return recalcVault(
        note(
          { ...state, depositors, lifecycleStage: 'deposit', statusBanner: `DEPOSITED $${action.amount.toLocaleString()}` },
          `${state.depositors.find((d) => d.id === action.depositorId)?.name ?? 'Depositor'} deposited $${action.amount.toLocaleString()}.`
        )
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
              nextPaymentDue: true
            }
          : b
      )
      return recalcVault(
        note(
          {
            ...state,
            loans,
            borrowers,
            lifecycleStage: 'fund',
            statusBanner: 'LOAN FUNDED',
            protocol: {
              ...state.protocol,
              feesCollected: state.protocol.feesCollected + loan.principal * loan.originationFee,
              transactionsProcessed: state.protocol.transactionsProcessed + 1
            }
          },
          `Funded $${loan.principal.toLocaleString()} to ${state.borrowers.find((b) => b.id === loan.borrowerId)?.name}.`
        )
      )
    }
    case 'APPLY_PAYMENT': {
      const loan = state.loans.find((l) => l.id === action.loanId)
      if (!loan) return state
      const remaining = Math.max(0, loan.remaining - action.principal)
      const loans = state.loans.map((l) =>
        l.id === action.loanId
          ? {
              ...l,
              remaining,
              status: remaining <= 0.01 ? ('paid' as const) : ('active' as const)
            }
          : l
      )
      const borrowers = state.borrowers.map((b) =>
        b.id === loan.borrowerId
          ? {
              ...b,
              remainingBalance: remaining,
              status: remaining <= 0.01 ? ('paid' as const) : ('repaying' as const),
              nextPaymentDue: remaining > 0.01
            }
          : b
      )
      return recalcVault(
        note(
          {
            ...state,
            loans,
            borrowers,
            lifecycleStage: 'repay',
            statusBanner: `PAYMENT $${(action.principal + action.interest).toFixed(2)}`,
            vault: {
              ...state.vault,
              interestEarned: state.vault.interestEarned + action.interest
            },
            protocol: {
              ...state.protocol,
              transactionsProcessed: state.protocol.transactionsProcessed + 1
            }
          },
          `Payment received — principal $${action.principal.toFixed(2)}, interest $${action.interest.toFixed(2)}.`
        )
      )
    }
    case 'APPLY_YIELD': {
      const depositors = state.depositors.map((d) =>
        d.id === action.depositorId
          ? {
              ...d,
              earnedYield: d.earnedYield + action.amount,
              balance: d.balance + action.amount
            }
          : d
      )
      return recalcVault(
        note(
          {
            ...state,
            depositors,
            lifecycleStage: 'distribute',
            statusBanner: `YIELD +$${action.amount.toFixed(2)}`
          },
          `Yield distribution of $${action.amount.toFixed(2)} to ${state.depositors.find((d) => d.id === action.depositorId)?.name}.`
        )
      )
    }
    case 'REQUEST_LOAN': {
      const borrowerId = action.borrowerId ?? state.primaryBorrowerId
      const borrower = state.borrowers.find((b) => b.id === borrowerId)
      if (!borrower) return state
      const id = `loan-${Date.now()}`
      const paymentAmount = Math.round((action.amount * 1.1) / 12 * 100) / 100
      const loan = {
        id,
        borrowerId,
        principal: action.amount,
        remaining: action.amount,
        apr: 0.1,
        termMonths: 12,
        paymentAmount,
        originationFee: 0.01,
        status: 'pending' as const
      }
      return note(
        {
          ...state,
          loans: [...state.loans, loan],
          borrowers: state.borrowers.map((b) =>
            b.id === borrowerId
              ? { ...b, status: 'requesting' as const, paymentAmount, interestRate: 0.1, termMonths: 12 }
              : b
          ),
          lifecycleStage: 'request',
          underwritingPhase: 0,
          statusBanner: 'LOAN REQUESTED'
        },
        `${borrower.name} requested $${action.amount.toLocaleString()}.`
      )
    }
    case 'ADVANCE_UNDERWRITE': {
      const phase = Math.min(4, state.underwritingPhase + 1)
      const stages = ['REQUEST', 'UNDERWRITE', 'APPROVE', 'SIGN', 'FUND']
      return {
        ...state,
        underwritingPhase: phase,
        lifecycleStage: phase < 2 ? 'underwrite' : phase < 3 ? 'approve' : 'fund',
        statusBanner: stages[phase] ?? 'FUND'
      }
    }
    case 'APPROVE_LOAN': {
      const pending = state.loans.find((l) => l.status === 'pending')
      if (!pending) return note(state, 'No pending loan request.')
      if (pending.principal > state.vault.availableLiquidity) {
        return note(state, 'Not enough available liquidity to approve.')
      }
      return note(
        {
          ...state,
          loans: state.loans.map((l) =>
            l.id === pending.id ? { ...l, status: 'approved' as const } : l
          ),
          borrowers: state.borrowers.map((b) =>
            b.id === pending.borrowerId ? { ...b, status: 'approved' as const } : b
          ),
          lifecycleStage: 'approve',
          statusBanner: 'APPROVED'
        },
        `Approved $${pending.principal.toLocaleString()}. Ready to fund.`
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
        deposited: amount,
        earnedYield: 0
      }
      return recalcVault(note({ ...state, depositors: [...state.depositors, d] }, `${d.name} joined with $${amount.toLocaleString()}.`))
    }
    case 'ADD_BORROWER': {
      const n = state.borrowers.length + 1
      const b = {
        id: `b-${Date.now()}`,
        name: action.name ?? `Borrower ${n} LLC`,
        wallet: `rBorr${n}Demo…`,
        loanPrincipal: 0,
        remainingBalance: 0,
        interestRate: 0.1,
        termMonths: 12,
        paymentAmount: 0,
        status: 'none' as const,
        nextPaymentDue: false
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
          loans: state.loans.map((l) =>
            l.id === active.id ? { ...l, guarantor: 'Sam Guarantor' } : l
          ),
          borrowers: state.borrowers.map((b) =>
            b.id === active.borrowerId ? { ...b, guarantor: 'Sam Guarantor' } : b
          )
        },
        `Sam Guarantor now stands behind the borrower.`
      )
    }
    case 'SIMULATE_DEFAULT': {
      const active = state.loans.find((l) => l.status === 'active' || l.status === 'funded')
      if (!active) return note(state, 'No active loan to default.')
      const haircut = Math.round(active.remaining * 0.2)
      const total = state.depositors.reduce((s, d) => s + d.deposited, 0) || 1
      const depositors = state.depositors.map((d) => ({
        ...d,
        deposited: Math.max(0, Math.round(d.deposited - (d.deposited / total) * haircut))
      }))
      return recalcVault(
        note(
          {
            ...state,
            depositors,
            defaultedConnection: true,
            riskMode: true,
            statusBanner: 'DEFAULT — $0 RECEIVED',
            loans: state.loans.map((l) =>
              l.id === active.id ? { ...l, status: 'defaulted' as const, remaining: 0 } : l
            ),
            borrowers: state.borrowers.map((b) =>
              b.id === active.borrowerId
                ? { ...b, status: 'defaulted' as const, remainingBalance: 0, nextPaymentDue: false }
                : b
            )
          },
          `Default: expected $${DEMO_PAYMENT.toFixed(2)}, received $0. ~$${haircut.toLocaleString()} shortfall hits depositor positions.`
        )
      )
    }
    case 'MISS_PAYMENT':
      return note(
        {
          ...state,
          defaultedConnection: true,
          statusBanner: `LATE — expected $${DEMO_PAYMENT.toFixed(2)}, received $0`,
          riskMode: true
        },
        'Missed payment. Borrower-to-vault pipeline in warning state.'
      )
    case 'WITHDRAW': {
      const d = state.depositors.find((x) => x.id === state.primaryDepositorId)
      if (!d) return state
      const amt = Math.min(action.amount, d.deposited, state.vault.availableLiquidity)
      if (amt <= 0) return note(state, 'Insufficient liquidity for withdrawal.')
      const depositors = state.depositors.map((x) =>
        x.id === d.id
          ? { ...x, deposited: x.deposited - amt, balance: x.balance + amt }
          : x
      )
      return recalcVault(note({ ...state, depositors }, `${d.name} withdrew $${amt.toLocaleString()}.`))
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
    case 'SET_RISK_MODE':
      return { ...state, riskMode: action.on }
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
  setStage: (stage: LifecycleStage) => void
  clearAnimation: (id: string) => void
  startAnimation: (id: string) => void
  queueAnimation: (anim: Omit<AnimationRequest, 'id' | 'started'> & { id?: string; onComplete?: () => void }) => string
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
  playLifecycleStep: (step: number, reducedMotion: boolean) => void
}

const SimulationContext = createContext<SimulationApi | null>(null)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  const primaryDepositor = state.depositors.find((d) => d.id === state.primaryDepositorId) ?? state.depositors[0]
  const primaryBorrower = state.borrowers.find((b) => b.id === state.primaryBorrowerId) ?? state.borrowers[0]
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
    (amount = DEMO_DEPOSIT, animate = true) => {
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
      dispatch({ type: 'SET_STAGE', stage: 'deposit' })
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
      if (loan.status === 'pending') {
        dispatch({ type: 'APPROVE_LOAN' })
      }
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
      const run = () =>
        dispatch({ type: 'APPLY_PAYMENT', loanId: loan.id, principal, interest })
      if (!animate) {
        run()
        return
      }
      const total = principal + interest
      queueAnimation({
        from: 'borrower',
        to: 'vault',
        amount: total,
        kind: 'principal',
        label: `Principal $${principal.toFixed(2)}`,
        onComplete: undefined
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
      const run = () => dispatch({ type: 'APPLY_YIELD', depositorId, amount })
      if (!animate) {
        run()
        return
      }
      queueAnimation({
        from: 'vault',
        to: 'depositor',
        amount,
        kind: 'yield',
        label: `Yield +$${amount.toFixed(2)}`,
        onComplete: run
      })
      dispatch({ type: 'SET_BANNER', banner: 'DISTRIBUTING YIELD…' })
    },
    [queueAnimation, state.primaryDepositorId]
  )

  const playLifecycleStep = useCallback(
    (step: number, reducedMotion: boolean) => {
      const animate = !reducedMotion
      switch (step) {
        case 0:
          deposit(DEMO_DEPOSIT, animate)
          break
        case 1:
          dispatch({ type: 'SET_STAGE', stage: 'deposit' })
          dispatch({ type: 'SET_BANNER', banner: 'VAULT FUNDED' })
          dispatch({ type: 'NOTE', msg: 'Vault holds pooled capital ready to lend.' })
          break
        case 2:
          dispatch({ type: 'REQUEST_LOAN', amount: DEMO_LOAN })
          break
        case 3:
          dispatch({ type: 'ADVANCE_UNDERWRITE' })
          dispatch({ type: 'APPROVE_LOAN' })
          break
        case 4:
          fundLoan(animate)
          break
        case 5:
          makePayment(animate)
          break
        case 6:
          dispatch({ type: 'SET_BANNER', banner: 'INTEREST RECEIVED' })
          dispatch({ type: 'NOTE', msg: 'Interest portion settled into vault earnings.' })
          break
        case 7:
          distributeYield(animate)
          break
        default:
          break
      }
    },
    [deposit, distributeYield, fundLoan, makePayment]
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
      setStage: (stage) => dispatch({ type: 'SET_STAGE', stage }),
      clearAnimation,
      startAnimation,
      queueAnimation,
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
