import type { EntityId } from '../simulation/types'

/** Classroom story amounts — round numbers so the vault fill is obvious. */
export const STORY = {
  deposit: 100_000,
  loan: 20_000,
  apr: 0.1,
  termMonths: 12,
  paymentFrequency: 'Monthly' as const,
  payment: 1_750,
  /** 20,000 × 10% / 12 */
  interestPortion: 166.67,
  principalPortion: 1_583.33,
  depositorStartCash: 120_000,
  maxVault: 250_000,
  minDeposit: 100,
  maxDeposit: 100_000,
  maxLtv: 0.8,
  asset: 'XRP'
} as const

export type StoryStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type CameraPreset = {
  position: [number, number, number]
  lookAt: [number, number, number]
}

export type StoryStep = {
  id: StoryStepId
  title: string
  who: string
  what: string
  why: string
  focus: EntityId[]
  camera: CameraPreset
}

export const STORY_STEPS: StoryStep[] = [
  {
    id: 1,
    title: 'Configure the Lending System',
    who: 'Protocol Administrator',
    what: 'The administrator sets vault limits, the permitted asset, deposit rules, and borrowing parameters.',
    why: 'Loans can only happen after someone has defined the rules the vault must follow.',
    focus: ['administrator', 'protocol'],
    camera: { position: [0, 3.4, 9.2], lookAt: [0, 1.4, -1.4] }
  },
  {
    id: 2,
    title: 'Create the Vault',
    who: 'Protocol Administrator + Lending Vault',
    what: 'The administrator applies those rules to a real lending vault — a secure pool that will hold depositor capital.',
    why: 'The vault is the treasury. It is not a person and depositors do not own it.',
    focus: ['administrator', 'vault', 'protocol'],
    camera: { position: [0.2, 2.6, 8.4], lookAt: [0, 0.9, 0] }
  },
  {
    id: 3,
    title: 'Deposit Capital',
    who: 'Depositor / Lender + Lending Vault',
    what: `The depositor supplies $${STORY.deposit.toLocaleString()} to the lending vault.`,
    why: 'The vault needs liquidity before it can fund loans.',
    focus: ['depositor', 'vault'],
    camera: { position: [-3.4, 2.4, 8.6], lookAt: [-1.4, 0.6, 0] }
  },
  {
    id: 4,
    title: 'Capital Available',
    who: 'Lending Vault',
    what: `Vault capital is now $${STORY.deposit.toLocaleString()} and available liquidity is $${STORY.deposit.toLocaleString()}.`,
    why: 'Deposited funds sit in the vault according to its lending rules, ready to be lent.',
    focus: ['vault'],
    camera: { position: [0, 2.2, 7.2], lookAt: [0, 0.8, 0] }
  },
  {
    id: 5,
    title: 'Request a Loan',
    who: 'Borrower',
    what: `The borrower requests $${STORY.loan.toLocaleString()} for 12 months at 10% APR, with monthly repayments.`,
    why: 'A loan starts as a request. Capital does not leave the vault until the request is approved and funded.',
    focus: ['borrower', 'vault'],
    camera: { position: [3.4, 2.4, 8.6], lookAt: [1.4, 0.6, 0] }
  },
  {
    id: 6,
    title: 'Review and Approve',
    who: 'Protocol / Lending Facilitator',
    what: 'The protocol reviews the request against vault rules and available liquidity, then approves it.',
    why: 'Approval is a control step. In the institutional track this later expands to originator, underwriter, and broker.',
    focus: ['administrator', 'protocol', 'borrower', 'vault'],
    camera: { position: [0.6, 3.2, 9.4], lookAt: [0.4, 1.1, -0.4] }
  },
  {
    id: 7,
    title: 'Fund the Loan',
    who: 'Lending Vault + Borrower',
    what: `$${STORY.loan.toLocaleString()} leaves the vault and is received by the borrower. Available liquidity falls to $80,000.`,
    why: 'Borrowed money comes from depositor capital already sitting in the vault — not from the protocol printing funds.',
    focus: ['vault', 'borrower'],
    camera: { position: [2.2, 2.6, 8.8], lookAt: [1.2, 0.7, 0] }
  },
  {
    id: 8,
    title: 'Repayment Agreement',
    who: 'Borrower + Agreement',
    what: `The borrower accepts principal $${STORY.loan.toLocaleString()}, 10% APR, 12 months, monthly payments of $${STORY.payment.toLocaleString()}.`,
    why: 'This is the obligation. Depositors do not sign each loan; the borrower does.',
    focus: ['borrower', 'agreement', 'vault'],
    camera: { position: [3.6, 2.3, 7.8], lookAt: [2.4, 1.1, 0.4] }
  },
  {
    id: 9,
    title: 'Repay the Loan',
    who: 'Borrower + Lending Vault',
    what: `The borrower pays $${STORY.payment.toLocaleString()}. Principal ($${STORY.principalPortion.toLocaleString()}) returns to vault liquidity. Interest ($${STORY.interestPortion.toLocaleString()}) is yield.`,
    why: 'Splitting principal from interest is the key: only interest grows the vault’s economic value.',
    focus: ['borrower', 'vault'],
    camera: { position: [1.6, 2.8, 9.2], lookAt: [0.6, 0.7, 0] }
  },
  {
    id: 10,
    title: 'Depositor Earns',
    who: 'Depositor / Lender + Lending Vault',
    what: 'Interest raises the vault’s economic value. JRPU may later distribute that yield daily, weekly, or monthly as an application policy — not as a native XRPL daily cash payment.',
    why: 'The depositor benefits because the borrower paid for the use of pooled capital.',
    focus: ['depositor', 'vault'],
    camera: { position: [-2.6, 2.6, 9], lookAt: [-1.2, 0.8, 0] }
  }
]

export const ADVANCED_ROLES: { id: EntityId; label: string; blurb: string }[] = [
  { id: 'originator', label: 'Loan Originator', blurb: 'Finds the borrower and packages the request.' },
  { id: 'underwriter', label: 'Underwriter', blurb: 'Evaluates credit risk before approval.' },
  { id: 'broker', label: 'Loan Broker', blurb: 'Connects the approved loan to the vault (XRPL Loan Broker).' },
  { id: 'guarantor', label: 'Guarantor', blurb: 'Optional. Stands behind the borrower if they do not perform.' },
  { id: 'custodian', label: 'Collateral Custodian', blurb: 'Holds pledged assets for the facility.' },
  { id: 'servicer', label: 'Loan Servicer', blurb: 'Collects payments and manages the loan over time.' }
]

export type DistributionPolicy = 'accrue' | 'daily' | 'weekly' | 'monthly'

export type StorySnapshot = {
  currentStep: StoryStepId
  vaultConfigured: boolean
  rulesDefined: boolean
  agreementVisible: boolean
  totalCapital: number
  availableLiquidity: number
  outstandingLoans: number
  interestEarned: number
  depositorBalance: number
  deposited: number
  vaultPosition: number
  earnedYield: number
  requestedAmount: number
  approvedAmount: number
  outstandingPrincipal: number
  borrowerStatus:
    | 'none'
    | 'requesting'
    | 'underwriting'
    | 'approved'
    | 'funded'
    | 'repaying'
    | 'paid'
    | 'defaulted'
    | 'rejected'
  loanStatus: 'none' | 'pending' | 'approved' | 'funded' | 'active' | 'paid' | 'defaulted' | 'rejected'
  missedPayment: boolean
}

export function emptySnapshot(): StorySnapshot {
  return {
    currentStep: 1,
    vaultConfigured: false,
    rulesDefined: false,
    agreementVisible: false,
    totalCapital: 0,
    availableLiquidity: 0,
    outstandingLoans: 0,
    interestEarned: 0,
    depositorBalance: STORY.depositorStartCash,
    deposited: 0,
    vaultPosition: 0,
    earnedYield: 0,
    requestedAmount: 0,
    approvedAmount: 0,
    outstandingPrincipal: 0,
    borrowerStatus: 'none',
    loanStatus: 'none',
    missedPayment: false
  }
}

/** Financial + visibility state after a step has fully completed. Step 0 = nothing yet. */
export function snapshotAfterStep(step: number): StorySnapshot {
  const s = emptySnapshot()
  const n = Math.max(0, Math.min(10, Math.floor(step)))
  if (n < 1) return s

  s.rulesDefined = true
  s.currentStep = n as StoryStepId
  if (n < 2) return s

  s.vaultConfigured = true
  if (n < 3) return s

  s.deposited = STORY.deposit
  s.depositorBalance = STORY.depositorStartCash - STORY.deposit
  s.vaultPosition = STORY.deposit
  s.totalCapital = STORY.deposit
  s.availableLiquidity = STORY.deposit
  if (n < 5) return s

  s.requestedAmount = STORY.loan
  s.borrowerStatus = 'requesting'
  s.loanStatus = 'pending'
  if (n < 6) return s

  s.approvedAmount = STORY.loan
  s.borrowerStatus = 'approved'
  s.loanStatus = 'approved'
  if (n < 7) return s

  s.borrowerStatus = 'funded'
  s.loanStatus = 'active'
  s.outstandingPrincipal = STORY.loan
  s.outstandingLoans = STORY.loan
  s.availableLiquidity = STORY.deposit - STORY.loan
  if (n < 8) return s

  s.agreementVisible = true
  if (n < 9) return s

  s.outstandingPrincipal = round2(STORY.loan - STORY.principalPortion)
  s.outstandingLoans = s.outstandingPrincipal
  s.availableLiquidity = round2(STORY.deposit - STORY.loan + STORY.principalPortion)
  s.interestEarned = STORY.interestPortion
  s.borrowerStatus = 'repaying'
  if (n < 10) return s

  s.earnedYield = STORY.interestPortion
  s.vaultPosition = round2(STORY.deposit + STORY.interestPortion)
  return s
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function paymentSplit(): { principal: number; interest: number } {
  return { principal: STORY.principalPortion, interest: STORY.interestPortion }
}

/** Inclusive step range each basic lesson may play. */
export function lessonStepRange(lesson: number): [StoryStepId, StoryStepId] {
  switch (lesson) {
    case 0:
      return [1, 10]
    case 1:
      return [1, 4]
    case 2:
      return [3, 4]
    case 3:
      return [5, 7]
    case 4:
      return [8, 8]
    case 5:
      return [1, 10]
    case 6:
      return [9, 10]
    default:
      return [1, 10]
  }
}

export function lessonStartStep(lesson: number): StoryStepId {
  return lessonStepRange(lesson)[0]
}

export function stepHasMotion(step: number): boolean {
  return step === 3 || step === 5 || step === 7 || step === 9 || step === 10
}

export function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

export function formatUsdExact(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
