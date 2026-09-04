import type { SimulationState } from './types'

/** Classroom starting balances — educational dollars, not on-ledger. */
export function createInitialState(): SimulationState {
  const depositors = [
    {
      id: 'd-alice',
      name: 'Alice',
      wallet: 'rAliceDemo…x7K2',
      balance: 15000,
      deposited: 10000,
      earnedYield: 0
    },
    {
      id: 'd-james',
      name: 'James',
      wallet: 'rJamesDemo…m9P1',
      balance: 20000,
      deposited: 5000,
      earnedYield: 0
    },
    {
      id: 'd-abc',
      name: 'Company ABC',
      wallet: 'rAbcDemo…q4R8',
      balance: 50000,
      deposited: 25000,
      earnedYield: 125
    },
    {
      id: 'd-priya',
      name: 'Priya',
      wallet: 'rPriyaDemo…t2L5',
      balance: 12000,
      deposited: 20000,
      earnedYield: 200
    },
    {
      id: 'd-north',
      name: 'Northside Credit',
      wallet: 'rNorthDemo…w6H3',
      balance: 30000,
      deposited: 15000,
      earnedYield: 150
    }
  ]

  const borrowers = [
    {
      id: 'b-bob',
      name: "Bob's Construction LLC",
      wallet: 'rBobDemo…c1N4',
      loanPrincipal: 8000,
      remainingBalance: 8000,
      interestRate: 0.1,
      termMonths: 12,
      paymentAmount: 703.33,
      status: 'funded' as const,
      nextPaymentDue: true
    },
    {
      id: 'b-clinic',
      name: 'River Clinic',
      wallet: 'rClinicDemo…v8S2',
      loanPrincipal: 18000,
      remainingBalance: 18000,
      interestRate: 0.1,
      termMonths: 24,
      paymentAmount: 829.15,
      status: 'funded' as const,
      nextPaymentDue: true
    },
    {
      id: 'b-elm',
      name: 'Elm Freight',
      wallet: 'rElmDemo…p5M7',
      loanPrincipal: 14000,
      remainingBalance: 14000,
      interestRate: 0.1,
      termMonths: 18,
      paymentAmount: 848.42,
      status: 'funded' as const,
      nextPaymentDue: true
    }
  ]

  const loans = borrowers.map((b, i) => ({
    id: `loan-${i + 1}`,
    borrowerId: b.id,
    principal: b.loanPrincipal,
    remaining: b.remainingBalance,
    apr: b.interestRate,
    termMonths: b.termMonths,
    paymentAmount: b.paymentAmount,
    originationFee: 0.01,
    status: 'active' as const
  }))

  const totalDeposited = depositors.reduce((s, d) => s + d.deposited, 0)
  const outstanding = loans.reduce((s, l) => s + l.remaining, 0)
  const interestEarned = depositors.reduce((s, d) => s + d.earnedYield, 0)

  return {
    vault: {
      totalCapital: totalDeposited,
      availableLiquidity: totalDeposited - outstanding,
      outstandingLoans: outstanding,
      interestEarned,
      maxSize: 250000
    },
    protocol: {
      feesCollected: 400,
      transactionsProcessed: 12
    },
    depositors,
    borrowers,
    loans,
    primaryDepositorId: 'd-alice',
    primaryBorrowerId: 'b-bob',
    lifecycleStage: 'deposit',
    selectedEntity: null,
    selectedTerm: null,
    showAdvancedRoles: false,
    statusBanner: null,
    log: ['JRPU classroom vault open — $75,000 deposited, $40,000 currently lent.'],
    pendingAnimations: [],
    underwritingPhase: 0,
    riskMode: false,
    defaultedConnection: false
  }
}

export const DEMO_DEPOSIT = 10000
export const DEMO_LOAN = 8000
export const DEMO_PAYMENT = 703.33
export const DEMO_PRINCIPAL_SHARE = 636.67
export const DEMO_INTEREST_SHARE = 66.66
export const DEMO_YIELD = 42.5
