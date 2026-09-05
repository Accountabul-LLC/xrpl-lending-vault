export type EntityId =
  | 'protocol'
  | 'administrator'
  | 'vault'
  | 'depositor'
  | 'borrower'
  | 'agreement'
  | 'originator'
  | 'underwriter'
  | 'broker'
  | 'guarantor'
  | 'custodian'
  | 'servicer'

export type FlowKind =
  | 'deposit'
  | 'loan'
  | 'principal'
  | 'interest'
  | 'yield'
  | 'admin'
  | 'request'
  | 'default'

export type LifecycleStage =
  | 'configure'
  | 'create'
  | 'deposit'
  | 'available'
  | 'request'
  | 'approve'
  | 'fund'
  | 'agree'
  | 'repay'
  | 'earn'

export type SimDepositor = {
  id: string
  name: string
  wallet: string
  balance: number
  deposited: number
  vaultPosition: number
  earnedYield: number
}

export type SimBorrower = {
  id: string
  name: string
  wallet: string
  requestedAmount: number
  approvedAmount: number
  loanPrincipal: number
  remainingBalance: number
  outstandingPrincipal: number
  interestRate: number
  termMonths: number
  paymentAmount: number
  status:
    | 'none'
    | 'requesting'
    | 'underwriting'
    | 'approved'
    | 'funded'
    | 'repaying'
    | 'paid'
    | 'defaulted'
    | 'rejected'
  guarantor?: string
  nextPaymentDue: boolean
  purpose: string
}

export type SimLoan = {
  id: string
  borrowerId: string
  principal: number
  remaining: number
  apr: number
  termMonths: number
  paymentAmount: number
  paymentFrequency: 'Monthly'
  originationFee: number
  status: 'none' | 'pending' | 'approved' | 'funded' | 'active' | 'paid' | 'defaulted' | 'rejected'
  guarantor?: string
}

export type VaultState = {
  configured: boolean
  totalCapital: number
  availableLiquidity: number
  outstandingLoans: number
  interestEarned: number
  maxSize: number
  asset: string
  minDeposit: number
  maxDeposit: number
  maxLtv: number
}

export type ProtocolState = {
  feesCollected: number
  transactionsProcessed: number
}

export type AnimationRequest = {
  id: string
  from: EntityId
  to: EntityId
  amount: number
  kind: FlowKind
  label?: string
  /** Set once the scene has claimed this animation (prevents remount double-play). */
  started?: boolean
}

export type DistributionPolicy = 'accrue' | 'daily' | 'weekly' | 'monthly'

export type SimulationState = {
  currentStep: number
  vault: VaultState
  protocol: ProtocolState
  depositors: SimDepositor[]
  borrowers: SimBorrower[]
  loans: SimLoan[]
  primaryDepositorId: string
  primaryBorrowerId: string
  lifecycleStage: LifecycleStage
  selectedEntity: EntityId | null
  selectedTerm: string | null
  showAdvancedRoles: boolean
  advancedReveal: number
  distributionPolicy: DistributionPolicy
  statusBanner: string | null
  log: string[]
  pendingAnimations: AnimationRequest[]
  underwritingPhase: number
  riskMode: boolean
  defaultedConnection: boolean
  missedPayment: boolean
  expectedPayment: number
  receivedPayment: number
  agreementAccepted: boolean
  rulesDefined: boolean
}

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  'configure',
  'create',
  'deposit',
  'available',
  'request',
  'approve',
  'fund',
  'agree',
  'repay',
  'earn'
]

export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  configure: 'Configure',
  create: 'Create vault',
  deposit: 'Deposit',
  available: 'Available',
  request: 'Request',
  approve: 'Approve',
  fund: 'Fund',
  agree: 'Agreement',
  repay: 'Repay',
  earn: 'Earn'
}

export function stageForStep(step: number): LifecycleStage {
  return LIFECYCLE_STAGES[Math.max(0, Math.min(9, step - 1))] ?? 'configure'
}
