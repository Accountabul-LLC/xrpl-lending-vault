export type EntityId = 'protocol' | 'vault' | 'depositor' | 'borrower' | 'guarantor' | 'broker' | 'underwriter' | 'servicer' | 'custodian'

export type FlowKind =
  | 'deposit'
  | 'loan'
  | 'principal'
  | 'interest'
  | 'yield'
  | 'admin'
  | 'default'

export type LifecycleStage =
  | 'deposit'
  | 'request'
  | 'underwrite'
  | 'approve'
  | 'fund'
  | 'repay'
  | 'distribute'

export type SimDepositor = {
  id: string
  name: string
  wallet: string
  balance: number
  deposited: number
  earnedYield: number
}

export type SimBorrower = {
  id: string
  name: string
  wallet: string
  loanPrincipal: number
  remainingBalance: number
  interestRate: number
  termMonths: number
  paymentAmount: number
  status: 'none' | 'requesting' | 'underwriting' | 'approved' | 'funded' | 'repaying' | 'paid' | 'defaulted' | 'rejected'
  guarantor?: string
  nextPaymentDue: boolean
}

export type SimLoan = {
  id: string
  borrowerId: string
  principal: number
  remaining: number
  apr: number
  termMonths: number
  paymentAmount: number
  originationFee: number
  status: 'pending' | 'approved' | 'funded' | 'active' | 'paid' | 'defaulted' | 'rejected'
  guarantor?: string
}

export type VaultState = {
  totalCapital: number
  availableLiquidity: number
  outstandingLoans: number
  interestEarned: number
  maxSize: number
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

export type SimulationState = {
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
  statusBanner: string | null
  log: string[]
  pendingAnimations: AnimationRequest[]
  underwritingPhase: number
  riskMode: boolean
  defaultedConnection: boolean
}

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  'deposit',
  'request',
  'underwrite',
  'approve',
  'fund',
  'repay',
  'distribute'
]

export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  deposit: 'Deposit',
  request: 'Request',
  underwrite: 'Underwrite',
  approve: 'Approve',
  fund: 'Fund',
  repay: 'Repay',
  distribute: 'Distribute'
}
