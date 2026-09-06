import type { LabViewState } from '../lab/types'
import type { TxPhase } from '../lab/receipt'
import type { LoanBrokerInfo, LoanInfo, VaultInfo } from '../lib/xrpl'

const OWNER = 'rAccOwner7VaultBrokerXRPLab01'
const DEPOSITOR = 'rAccDepositSharesXRPLab02'
const BORROWER = 'rAccBorrowPayXRPLab03'
export const VAULT_ID = 'A1B2C3D4E5F60718293A4B5C6D7E8F90112233445566778899AABBCCDDEEFF00'
export const BROKER_ID = 'B0C1D2E3F405162738495A6B7C8D9E0F11223344556677889900AABBCCDDEEFF'
export const LOAN_ID = 'C1D2E3F405162738495A6B7C8D9E0F102132435465768798A9B0C1D2E3F40516'
const TX_HASH = 'F7A1C90E2B4D6E8F102132435465768798A9B0C1D2E3F405162738495A6B7C8D'
const SHARE_MPT = '00000A1B2C3D4E5F60718293A4B5C6D7'

function demoVault(partial: Pick<VaultInfo, 'assetsTotal' | 'assetsAvailable'> & Partial<VaultInfo>): VaultInfo {
  return {
    vaultId: VAULT_ID,
    account: OWNER,
    owner: OWNER,
    shareMptId: SHARE_MPT,
    asset: 'XRP',
    assetsMaximum: '100000',
    lossUnrealized: '0',
    flags: 0,
    isPrivate: false,
    outstandingShares: '0',
    scale: 0,
    vaultKind: 1,
    subscriptionIso: '—',
    redemptionIso: '—',
    ...partial
  }
}

function demoBroker(partial: Pick<LoanBrokerInfo, 'debtTotal'> & Partial<LoanBrokerInfo>): LoanBrokerInfo {
  return {
    loanBrokerId: BROKER_ID,
    vaultId: VAULT_ID,
    account: OWNER,
    owner: OWNER,
    debtMaximum: '100000',
    coverAvailable: '0',
    coverRateMinimum: 0,
    coverRateLiquidation: 0,
    managementFeeRate: 1000,
    ownerCount: 0,
    loanSequence: 1,
    ...partial
  }
}

function demoLoan(
  partial: Pick<LoanInfo, 'principalOutstanding' | 'totalValueOutstanding' | 'nextPaymentDueDate' | 'paymentRemaining'> &
    Partial<LoanInfo>
): LoanInfo {
  return {
    loanId: LOAN_ID,
    borrower: BORROWER,
    loanBrokerId: BROKER_ID,
    managementFeeOutstanding: '0',
    interestRate: 10000,
    nextPaymentDueIso: String(partial.nextPaymentDueDate ?? '—'),
    periodicPayment: '879',
    periodicPaymentDrops: '879000000',
    flags: 0,
    defaulted: false,
    impaired: false,
    ...partial
  }
}

function funded(address: string) {
  return { address, funded: true }
}

const NOOP_ERROR = null
const emptyWallets = {
  owner: null,
  depositor: null,
  borrower: null
}

const fundedWallets = {
  owner: funded(OWNER),
  depositor: funded(DEPOSITOR),
  borrower: funded(BORROWER)
}

function base(partial: Partial<LabViewState>): LabViewState {
  return {
    wallets: emptyWallets,
    busy: null,
    txPhase: null,
    vaultId: '',
    vault: null,
    assetsMaximum: '250000',
    depositAmount: '10000',
    withdrawAmount: '500',
    loanBrokerId: '',
    loanBroker: null,
    coverAmount: '10',
    coverWithdrawAmount: '1',
    principal: '10000',
    aprPercent: '10',
    paymentTotal: '12',
    loanId: '',
    loan: null,
    paymentAmount: '879',
    log: [],
    sharesIssued: '—',
    depositorAssetBalance: '—',
    lastTx: null,
    error: NOOP_ERROR,
    technicalOpen: false,
    highlight: null,
    pressed: null,
    brokerSigned: false,
    borrowerSigned: false,
    ...partial
  }
}

function receipt(type: string, ledgerIndex: number) {
  return {
    hash: TX_HASH,
    ledgerIndex,
    type,
    result: 'tesSUCCESS',
    validated: true
  }
}

export const SNAPSHOTS: Record<string, LabViewState> = {
  empty: base({
    log: ['Lab ready. DevNet assets only — not real money.']
  }),
  funding: base({
    wallets: {
      owner: funded(OWNER),
      depositor: { address: '', funded: false },
      borrower: { address: '', funded: false }
    },
    busy: 'fund-all',
    txPhase: 'submitting',
    log: [
      'Submitting faucet request for Vault Owner / Loan Broker…',
      'Waiting for DevNet validation…'
    ]
  }),
  funded: base({
    wallets: fundedWallets,
    txPhase: 'confirmed',
    log: [
      'Funded Borrower wallet rAccBo…Lab03 — verified on DevNet',
      'Funded Depositor wallet rAccDe…Lab02 — verified on DevNet',
      'Funded Vault Owner / Loan Broker rAccOw…Lab01 — verified on DevNet'
    ]
  }),
  capacitySet: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    log: ['Maximum Capacity set to 100,000 XRP']
  }),
  vaultCreated: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    vaultId: VAULT_ID,
    vault: demoVault({ assetsTotal: '0', assetsAvailable: '0' }),
    sharesIssued: '0',
    lastTx: receipt('VaultCreate', 48_102_331),
    txPhase: 'confirmed',
    log: [
      'Vault object verified on DevNet',
      'VaultCreate tesSUCCESS — VaultID A1B2C3…EFF00'
    ]
  }),
  deposited: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    vaultId: VAULT_ID,
    vault: demoVault({ assetsTotal: '10000', assetsAvailable: '10000' }),
    sharesIssued: '10,000',
    lastTx: receipt('VaultDeposit', 48_102_340),
    txPhase: 'confirmed',
    log: [
      'Vault shares issued to depositor',
      'VaultDeposit 10000 XRP — tesSUCCESS'
    ]
  }),
  brokerCreated: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    vaultId: VAULT_ID,
    vault: demoVault({ assetsTotal: '10000', assetsAvailable: '10000' }),
    sharesIssued: '10,000',
    loanBrokerId: BROKER_ID,
    loanBroker: demoBroker({ debtTotal: '0' }),
    lastTx: receipt('LoanBrokerSet', 48_102_351),
    txPhase: 'confirmed',
    log: [
      'No loans yet. Originate your first loan.',
      'LoanBrokerSet tesSUCCESS — protocol loan book created'
    ]
  }),
  termsSet: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    vaultId: VAULT_ID,
    vault: demoVault({ assetsTotal: '10000', assetsAvailable: '10000' }),
    sharesIssued: '10,000',
    loanBrokerId: BROKER_ID,
    loanBroker: demoBroker({ debtTotal: '0' }),
    principal: '10000',
    aprPercent: '10',
    paymentTotal: '12',
    lastTx: receipt('LoanBrokerSet', 48_102_351)
  }),
  signing: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    vaultId: VAULT_ID,
    vault: demoVault({ assetsTotal: '10000', assetsAvailable: '10000' }),
    sharesIssued: '10,000',
    loanBrokerId: BROKER_ID,
    loanBroker: demoBroker({ debtTotal: '0' }),
    principal: '10000',
    aprPercent: '10',
    paymentTotal: '12',
    brokerSigned: true,
    borrowerSigned: true,
    txPhase: 'signing',
    busy: 'create-loan',
    log: ['Loan Broker signed. Borrower signed. Submitting LoanSet…']
  }),
  loanActive: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    vaultId: VAULT_ID,
    vault: demoVault({ assetsTotal: '10000', assetsAvailable: '0' }),
    sharesIssued: '10,000',
    loanBrokerId: BROKER_ID,
    loanBroker: demoBroker({ debtTotal: '10000' }),
    principal: '10000',
    aprPercent: '10',
    paymentTotal: '12',
    paymentAmount: '879',
    loanId: LOAN_ID,
    loan: demoLoan({ principalOutstanding: '10000', totalValueOutstanding: '10548', nextPaymentDueDate: 'Month 1', paymentRemaining: 12 }),
    brokerSigned: true,
    borrowerSigned: true,
    lastTx: receipt('LoanSet', 48_102_366),
    txPhase: 'confirmed',
    log: [
      'LoanSet tesSUCCESS — loan is live on DevNet',
      'Available vault assets moved from 10,000 to 0'
    ]
  }),
  paid: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    vaultId: VAULT_ID,
    vault: demoVault({ assetsTotal: '10083', assetsAvailable: '879' }),
    sharesIssued: '10,000',
    loanBrokerId: BROKER_ID,
    loanBroker: demoBroker({ debtTotal: '9204' }),
    principal: '10000',
    aprPercent: '10',
    paymentTotal: '12',
    paymentAmount: '879',
    loanId: LOAN_ID,
    loan: demoLoan({ principalOutstanding: '9204', totalValueOutstanding: '9669', nextPaymentDueDate: 'Month 2', paymentRemaining: 11 }),
    brokerSigned: true,
    borrowerSigned: true,
    lastTx: receipt('LoanPay', 48_102_380),
    txPhase: 'confirmed',
    log: [
      'Loan re-queried after validation',
      'Interest 83 · Principal 796 · tesSUCCESS',
      'LoanPay 879 XRP'
    ]
  }),
  withdrawn: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    vaultId: VAULT_ID,
    vault: demoVault({ assetsTotal: '9583', assetsAvailable: '379' }),
    sharesIssued: '9,500',
    depositorAssetBalance: '500',
    withdrawAmount: '500',
    loanBrokerId: BROKER_ID,
    loanBroker: demoBroker({ debtTotal: '9204' }),
    principal: '10000',
    aprPercent: '10',
    paymentTotal: '12',
    paymentAmount: '879',
    loanId: LOAN_ID,
    loan: demoLoan({ principalOutstanding: '9204', totalValueOutstanding: '9669', nextPaymentDueDate: 'Month 2', paymentRemaining: 11 }),
    brokerSigned: true,
    borrowerSigned: true,
    lastTx: receipt('VaultWithdraw', 48_102_391),
    txPhase: 'confirmed',
    log: [
      'Depositor received 500 XRP · shares now 9,500',
      'VaultWithdraw 500 XRP — tesSUCCESS'
    ]
  }),
  errorDemo: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    vaultId: VAULT_ID,
    vault: demoVault({ assetsTotal: '9583', assetsAvailable: '379' }),
    sharesIssued: '9,500',
    loanBrokerId: BROKER_ID,
    loanBroker: demoBroker({ debtTotal: '9204' }),
    loanId: LOAN_ID,
    loan: demoLoan({ principalOutstanding: '9204', totalValueOutstanding: '9669', nextPaymentDueDate: 'Month 2', paymentRemaining: 11 }),
    brokerSigned: true,
    borrowerSigned: true,
    error: {
      title: 'Deposit Failed',
      code: 'tecNO_AUTH',
      meaning: 'The account is not authorized for this action.',
      action:
        'Confirm the account is allowed to hold or send this asset, then retry the same step.',
      raw: 'VaultDeposit failed: tecNO_AUTH'
    },
    log: ['ERROR tecNO_AUTH: VaultDeposit failed: tecNO_AUTH']
  }),
  verified: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    vaultId: VAULT_ID,
    vault: demoVault({ assetsTotal: '9583', assetsAvailable: '379' }),
    sharesIssued: '9,500',
    depositorAssetBalance: '500',
    loanBrokerId: BROKER_ID,
    loanBroker: demoBroker({ debtTotal: '9204' }),
    principal: '10000',
    aprPercent: '10',
    paymentTotal: '12',
    paymentAmount: '879',
    loanId: LOAN_ID,
    loan: demoLoan({ principalOutstanding: '9204', totalValueOutstanding: '9669', nextPaymentDueDate: 'Month 2', paymentRemaining: 11 }),
    brokerSigned: true,
    borrowerSigned: true,
    lastTx: receipt('VaultWithdraw', 48_102_391),
    txPhase: 'confirmed',
    log: [
      'Interface and DevNet ledger agree',
      'VaultWithdraw 500 XRP — tesSUCCESS'
    ]
  }),
  technical: base({
    wallets: fundedWallets,
    assetsMaximum: '100000',
    vaultId: VAULT_ID,
    vault: demoVault({ assetsTotal: '9583', assetsAvailable: '379' }),
    sharesIssued: '9,500',
    depositorAssetBalance: '500',
    loanBrokerId: BROKER_ID,
    loanBroker: demoBroker({ debtTotal: '9204' }),
    loanId: LOAN_ID,
    loan: demoLoan({ principalOutstanding: '9204', totalValueOutstanding: '9669', nextPaymentDueDate: 'Month 2', paymentRemaining: 11 }),
    brokerSigned: true,
    borrowerSigned: true,
    lastTx: receipt('VaultWithdraw', 48_102_391),
    technicalOpen: true,
    txPhase: 'confirmed',
    log: ['Validated on ledger index 48102391']
  })
}

export type CameraName =
  | 'title'
  | 'overview'
  | 'wallets'
  | 'reset'
  | 'vault'
  | 'deposit'
  | 'loanbook'
  | 'originate'
  | 'payment'
  | 'withdraw'
  | 'error'
  | 'technical'

export const CAMERAS: Record<CameraName, { x: number; y: number; scale: number }> = {
  title: { x: 0, y: 0, scale: 0.9 },
  overview: { x: 0, y: 0, scale: 0.86 },
  wallets: { x: 0, y: 36, scale: 1.06 },
  reset: { x: 0, y: 70, scale: 1.1 },
  vault: { x: 140, y: 110, scale: 1.08 },
  deposit: { x: 160, y: 170, scale: 1.1 },
  loanbook: { x: -180, y: 130, scale: 1.08 },
  originate: { x: 140, y: 250, scale: 1.06 },
  payment: { x: -160, y: 270, scale: 1.08 },
  withdraw: { x: 160, y: 200, scale: 1.1 },
  error: { x: 0, y: 20, scale: 1.05 },
  technical: { x: 0, y: 320, scale: 1.08 }
}

export function applySceneChrome(
  snapshot: LabViewState,
  opts: { highlight: string | null; pressed: string | null; txPhase: TxPhase | null }
): LabViewState {
  return {
    ...snapshot,
    highlight: opts.highlight,
    pressed: opts.pressed,
    txPhase: opts.txPhase ?? snapshot.txPhase
  }
}
