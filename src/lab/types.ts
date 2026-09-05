import type { LoanBrokerInfo, LoanInfo, VaultInfo } from '../lib/xrpl'
import type { TxPhase, TxReceipt } from './receipt'
import type { XrplHint } from './errors'

export type Role = 'owner' | 'depositor' | 'borrower'

export const ROLES: Role[] = ['owner', 'depositor', 'borrower']

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Vault Owner / Loan Broker',
  depositor: 'Depositor',
  borrower: 'Borrower'
}

export const ROLE_HINT: Record<Role, string> = {
  owner: 'Creates the vault and manages the Loan Broker',
  depositor: 'Provides liquidity and holds vault shares',
  borrower: 'Receives a loan and makes repayments'
}

export type WalletView = {
  address: string
  funded: boolean
} | null

export type LabError = XrplHint & {
  title: string
  raw: string
}

export type LabViewState = {
  wallets: Record<Role, WalletView>
  busy: string | null
  txPhase: TxPhase | null
  vaultId: string
  vault: VaultInfo | null
  assetsMaximum: string
  depositAmount: string
  withdrawAmount: string
  loanBrokerId: string
  loanBroker: LoanBrokerInfo | null
  coverAmount: string
  coverWithdrawAmount: string
  principal: string
  aprPercent: string
  paymentTotal: string
  loanId: string
  loan: LoanInfo | null
  paymentAmount: string
  log: string[]
  sharesIssued: string
  depositorAssetBalance: string
  lastTx: TxReceipt | null
  error: LabError | null
  technicalOpen: boolean
  highlight: string | null
  pressed: string | null
  brokerSigned: boolean
  borrowerSigned: boolean
}

export type LabViewHandlers = {
  onFundRole: (role: Role) => void
  onFundAll: () => void
  onReset: () => void
  onCreateVault: () => void
  onRefreshVault: () => void
  onDeposit: () => void
  onWithdraw: () => void
  onCreateLoanBook: () => void
  onDepositCover: () => void
  onWithdrawCover: () => void
  onCreateLoan: () => void
  onPayLoan: () => void
  onPayFull: () => void
  onToggleTechnical: () => void
  onAssetsMaximum: (value: string) => void
  onDepositAmount: (value: string) => void
  onWithdrawAmount: (value: string) => void
  onCoverAmount: (value: string) => void
  onCoverWithdrawAmount: (value: string) => void
  onPrincipal: (value: string) => void
  onAprPercent: (value: string) => void
  onPaymentTotal: (value: string) => void
  onPaymentAmount: (value: string) => void
}

export function shortAddr(addr?: string) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export const EMPTY_WALLETS: Record<Role, WalletView> = {
  owner: null,
  depositor: null,
  borrower: null
}
