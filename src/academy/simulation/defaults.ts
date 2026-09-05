import { snapshotAfterStep, STORY } from '../experience/story'
import { stageForStep, type SimulationState } from './types'

function applySnapshot(state: SimulationState, step: number): SimulationState {
  const snap = snapshotAfterStep(step)
  const depositor = {
    ...state.depositors[0],
    id: 'd-alice',
    name: 'Alice',
    wallet: 'rAliceDemo…x7K2',
    balance: snap.depositorBalance,
    deposited: snap.deposited,
    vaultPosition: snap.vaultPosition,
    earnedYield: snap.earnedYield
  }
  const borrower = {
    ...state.borrowers[0],
    id: 'b-bob',
    name: "Bob's Construction LLC",
    wallet: 'rBobDemo…c1N4',
    requestedAmount: snap.requestedAmount,
    approvedAmount: snap.approvedAmount,
    loanPrincipal: snap.approvedAmount || snap.requestedAmount,
    remainingBalance: snap.outstandingPrincipal,
    outstandingPrincipal: snap.outstandingPrincipal,
    interestRate: STORY.apr,
    termMonths: STORY.termMonths,
    paymentAmount: STORY.payment,
    status: snap.borrowerStatus,
    nextPaymentDue: snap.loanStatus === 'active' || snap.loanStatus === 'funded',
    purpose: 'Equipment'
  }
  const loan =
    snap.loanStatus === 'none'
      ? []
      : [
          {
            id: 'loan-story',
            borrowerId: 'b-bob',
            principal: STORY.loan,
            remaining: snap.outstandingPrincipal || (snap.loanStatus === 'pending' || snap.loanStatus === 'approved' ? STORY.loan : 0),
            apr: STORY.apr,
            termMonths: STORY.termMonths,
            paymentAmount: STORY.payment,
            paymentFrequency: 'Monthly' as const,
            originationFee: 0.01,
            status: snap.loanStatus
          }
        ]

  return {
    ...state,
    currentStep: snap.currentStep,
    rulesDefined: snap.rulesDefined,
    agreementAccepted: snap.agreementVisible,
    missedPayment: snap.missedPayment,
    expectedPayment: STORY.payment,
    receivedPayment: snap.missedPayment ? 0 : step >= 9 ? STORY.payment : 0,
    lifecycleStage: stageForStep(snap.currentStep),
    vault: {
      ...state.vault,
      configured: snap.vaultConfigured,
      totalCapital: snap.totalCapital,
      availableLiquidity: snap.availableLiquidity,
      outstandingLoans: snap.outstandingLoans,
      interestEarned: snap.interestEarned,
      maxSize: STORY.maxVault,
      asset: STORY.asset,
      minDeposit: STORY.minDeposit,
      maxDeposit: STORY.maxDeposit,
      maxLtv: STORY.maxLtv
    },
    depositors: [depositor],
    borrowers: [borrower],
    loans: loan,
    primaryDepositorId: 'd-alice',
    primaryBorrowerId: 'b-bob'
  }
}

/** Classroom starts empty so the origin of capital can be taught. */
export function createInitialState(step = 0): SimulationState {
  const base: SimulationState = {
    currentStep: 1,
    vault: {
      configured: false,
      totalCapital: 0,
      availableLiquidity: 0,
      outstandingLoans: 0,
      interestEarned: 0,
      maxSize: STORY.maxVault,
      asset: STORY.asset,
      minDeposit: STORY.minDeposit,
      maxDeposit: STORY.maxDeposit,
      maxLtv: STORY.maxLtv
    },
    protocol: {
      feesCollected: 0,
      transactionsProcessed: 0
    },
    depositors: [
      {
        id: 'd-alice',
        name: 'Alice',
        wallet: 'rAliceDemo…x7K2',
        balance: STORY.depositorStartCash,
        deposited: 0,
        vaultPosition: 0,
        earnedYield: 0
      }
    ],
    borrowers: [
      {
        id: 'b-bob',
        name: "Bob's Construction LLC",
        wallet: 'rBobDemo…c1N4',
        requestedAmount: 0,
        approvedAmount: 0,
        loanPrincipal: 0,
        remainingBalance: 0,
        outstandingPrincipal: 0,
        interestRate: STORY.apr,
        termMonths: STORY.termMonths,
        paymentAmount: STORY.payment,
        status: 'none',
        nextPaymentDue: false,
        purpose: 'Equipment'
      }
    ],
    loans: [],
    primaryDepositorId: 'd-alice',
    primaryBorrowerId: 'b-bob',
    lifecycleStage: 'configure',
    selectedEntity: null,
    selectedTerm: null,
    showAdvancedRoles: false,
    advancedReveal: 0,
    distributionPolicy: 'accrue',
    statusBanner: null,
    log: ['JRPU classroom vault — start by configuring the lending system.'],
    pendingAnimations: [],
    underwritingPhase: 0,
    riskMode: false,
    defaultedConnection: false,
    missedPayment: false,
    expectedPayment: STORY.payment,
    receivedPayment: 0,
    agreementAccepted: false,
    rulesDefined: false
  }
  return applySnapshot(base, step)
}

export function stateFromSnapshotStep(step: number): SimulationState {
  return createInitialState(step)
}

export const DEMO_DEPOSIT = STORY.deposit
export const DEMO_LOAN = STORY.loan
export const DEMO_PAYMENT = STORY.payment
export const DEMO_PRINCIPAL_SHARE = STORY.principalPortion
export const DEMO_INTEREST_SHARE = STORY.interestPortion
export const DEMO_YIELD = STORY.interestPortion
