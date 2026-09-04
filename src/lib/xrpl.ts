import * as xrplLib from 'xrpl'
import { Client, Wallet, convertStringToHex, dropsToXrp, xrpToDrops } from 'xrpl'

// decode / signLoanSetByCounterparty are part of the XLS-66 lending-protocol
// API surface added to xrpl.js ahead of full type coverage for the
// not-yet-activated amendment, so they're pulled off the namespace import.
const decode = (xrplLib as any).decode as (blob: string) => any
const signLoanSetByCounterparty = (xrplLib as any).signLoanSetByCounterparty as (
  wallet: Wallet,
  tx: any
) => { tx: any }

export const DEVNET_WSS = 'wss://s.devnet.rippletest.net:51233'

let clientPromise: Promise<Client> | null = null

export function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new Client(DEVNET_WSS)
      await client.connect()
      return client
    })()
  }
  return clientPromise
}

export async function fundNewWallet(): Promise<Wallet> {
  const client = await getClient()
  const { wallet } = await client.fundWallet()
  return wallet
}

export interface VaultInfo {
  vaultId: string
  account: string
  shareMptId: string
  asset: string
  assetsTotal: string
  assetsAvailable: string
  assetsMaximum: string
  lossUnrealized: string
}

// VaultCreate — XLS-65. Native XRP vault: Asset = { currency: "XRP" }.
export async function createVault(
  owner: Wallet,
  opts: { assetsMaximumXrp: string; data?: string }
) {
  const client = await getClient()
  const tx: any = {
    TransactionType: 'VaultCreate',
    Account: owner.address,
    Asset: { currency: 'XRP' },
    AssetsMaximum: xrpToDrops(opts.assetsMaximumXrp),
    Data: opts.data ? convertStringToHex(opts.data) : undefined
  }
  const prepared = await client.autofill(tx)
  const signed = owner.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)
  const meta: any = result.result.meta
  if (meta?.TransactionResult !== 'tesSUCCESS') {
    throw new Error(`VaultCreate failed: ${meta?.TransactionResult}`)
  }
  const created = (meta.AffectedNodes || []).find(
    (n: any) => n.CreatedNode?.LedgerEntryType === 'Vault'
  )
  return {
    vaultId: created?.CreatedNode?.LedgerIndex as string,
    shareMptId: created?.CreatedNode?.NewFields?.ShareMPTID as string,
    account: created?.CreatedNode?.NewFields?.Account as string
  }
}

export async function depositVault(depositor: Wallet, vaultId: string, amountXrp: string) {
  const client = await getClient()
  const tx: any = {
    TransactionType: 'VaultDeposit',
    Account: depositor.address,
    VaultID: vaultId,
    Amount: xrpToDrops(amountXrp)
  }
  const prepared = await client.autofill(tx)
  const signed = depositor.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)
  const meta: any = result.result.meta
  if (meta?.TransactionResult !== 'tesSUCCESS') {
    throw new Error(`VaultDeposit failed: ${meta?.TransactionResult}`)
  }
  return result
}

export async function withdrawVault(holder: Wallet, vaultId: string, amountXrp: string) {
  const client = await getClient()
  const tx: any = {
    TransactionType: 'VaultWithdraw',
    Account: holder.address,
    VaultID: vaultId,
    Amount: xrpToDrops(amountXrp)
  }
  const prepared = await client.autofill(tx)
  const signed = holder.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)
  const meta: any = result.result.meta
  if (meta?.TransactionResult !== 'tesSUCCESS') {
    throw new Error(`VaultWithdraw failed: ${meta?.TransactionResult}`)
  }
  return result
}

export async function fetchVault(vaultId: string): Promise<VaultInfo | null> {
  const client = await getClient()
  try {
    const res: any = await client.request({
      command: 'ledger_entry',
      index: vaultId,
      ledger_index: 'validated'
    } as any)
    const node = res.result.node
    return {
      vaultId,
      account: node.Account,
      shareMptId: node.ShareMPTID,
      asset: node.Asset?.currency ?? 'XRP',
      assetsTotal: dropsToXrp(node.AssetsTotal ?? '0').toString(),
      assetsAvailable: dropsToXrp(node.AssetsAvailable ?? '0').toString(),
      assetsMaximum: dropsToXrp(node.AssetsMaximum ?? '0').toString(),
      lossUnrealized: dropsToXrp(node.LossUnrealized ?? '0').toString()
    }
  } catch (e) {
    console.error('fetchVault failed', e)
    return null
  }
}

// --- Lending Protocol (XLS-66) ---

export interface LoanBrokerInfo {
  loanBrokerId: string
  vaultId: string
  account: string
  debtTotal: string
  coverAvailable: string
}

export async function createLoanBroker(
  owner: Wallet,
  vaultId: string,
  opts: { managementFeeRateBps?: number; debtMaximumXrp?: string }
) {
  const client = await getClient()
  const tx: any = {
    TransactionType: 'LoanBrokerSet',
    Account: owner.address,
    VaultID: vaultId,
    ManagementFeeRate: opts.managementFeeRateBps ?? 0,
    DebtMaximum: opts.debtMaximumXrp ? xrpToDrops(opts.debtMaximumXrp) : undefined
  }
  const prepared = await client.autofill(tx)
  const signed = owner.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)
  const meta: any = result.result.meta
  if (meta?.TransactionResult !== 'tesSUCCESS') {
    throw new Error(`LoanBrokerSet failed: ${meta?.TransactionResult}`)
  }
  const created = (meta.AffectedNodes || []).find(
    (n: any) => n.CreatedNode?.LedgerEntryType === 'LoanBroker'
  )
  return { loanBrokerId: created?.CreatedNode?.LedgerIndex as string }
}

export async function depositCover(owner: Wallet, loanBrokerId: string, amountXrp: string) {
  const client = await getClient()
  const tx: any = {
    TransactionType: 'LoanBrokerCoverDeposit',
    Account: owner.address,
    LoanBrokerID: loanBrokerId,
    Amount: xrpToDrops(amountXrp)
  }
  const prepared = await client.autofill(tx)
  const signed = owner.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)
  const meta: any = result.result.meta
  if (meta?.TransactionResult !== 'tesSUCCESS') {
    throw new Error(`LoanBrokerCoverDeposit failed: ${meta?.TransactionResult}`)
  }
  return result
}

export interface CreateLoanOpts {
  principalXrp: string
  interestRateBps: number // 1/10th bps per spec; UI passes bps*10
  paymentTotal: number
  paymentIntervalSeconds: number
  gracePeriodSeconds?: number
  originationFeeXrp?: string
  serviceFeeXrp?: string
}

// Two-party flow: broker signs first, borrower cosigns via CounterpartySignature.
export async function createLoan(
  broker: Wallet,
  borrower: Wallet,
  loanBrokerId: string,
  opts: CreateLoanOpts
) {
  const client = await getClient()
  const tx: any = {
    TransactionType: 'LoanSet',
    Account: broker.address,
    Counterparty: borrower.address,
    LoanBrokerID: loanBrokerId,
    PrincipalRequested: xrpToDrops(opts.principalXrp),
    InterestRate: opts.interestRateBps,
    PaymentTotal: opts.paymentTotal,
    PaymentInterval: opts.paymentIntervalSeconds,
    GracePeriod: opts.gracePeriodSeconds ?? 604800,
    LoanOriginationFee: opts.originationFeeXrp ? xrpToDrops(opts.originationFeeXrp) : undefined,
    LoanServiceFee: opts.serviceFeeXrp ? xrpToDrops(opts.serviceFeeXrp) : undefined
  }
  const prepared = await client.autofill(tx)
  const brokerSigned = broker.sign(prepared)
  const decoded = decode(brokerSigned.tx_blob)
  const fullySigned = signLoanSetByCounterparty(borrower, decoded)
  const result = await client.submitAndWait(fullySigned.tx)
  const meta: any = result.result.meta
  if (meta?.TransactionResult !== 'tesSUCCESS') {
    throw new Error(`LoanSet failed: ${meta?.TransactionResult}`)
  }
  const created = (meta.AffectedNodes || []).find(
    (n: any) => n.CreatedNode?.LedgerEntryType === 'Loan'
  )
  return { loanId: created?.CreatedNode?.LedgerIndex as string }
}

export async function payLoan(payer: Wallet, loanId: string, amountXrp: string, full = false) {
  const client = await getClient()
  const tx: any = {
    TransactionType: 'LoanPay',
    Account: payer.address,
    LoanID: loanId,
    Amount: xrpToDrops(amountXrp),
    Flags: full ? 0x00020000 : 0
  }
  const prepared = await client.autofill(tx)
  const signed = payer.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)
  const meta: any = result.result.meta
  if (meta?.TransactionResult !== 'tesSUCCESS') {
    throw new Error(`LoanPay failed: ${meta?.TransactionResult}`)
  }
  return result
}

export interface LoanInfo {
  loanId: string
  borrower: string
  principalOutstanding: string
  totalValueOutstanding: string
  interestRate: number
  nextPaymentDueDate?: string
  paymentRemaining?: number
}

export async function fetchLoan(loanId: string): Promise<LoanInfo | null> {
  const client = await getClient()
  try {
    const res: any = await client.request({
      command: 'ledger_entry',
      index: loanId,
      ledger_index: 'validated'
    } as any)
    const node = res.result.node
    return {
      loanId,
      borrower: node.Borrower,
      principalOutstanding: dropsToXrp(node.PrincipalOutstanding ?? '0').toString(),
      totalValueOutstanding: dropsToXrp(node.TotalValueOutstanding ?? '0').toString(),
      interestRate: node.InterestRate,
      nextPaymentDueDate: node.NextPaymentDueDate,
      paymentRemaining: node.PaymentRemaining
    }
  } catch (e) {
    console.error('fetchLoan failed', e)
    return null
  }
}

export async function fetchLoanBroker(loanBrokerId: string): Promise<LoanBrokerInfo | null> {
  const client = await getClient()
  try {
    const res: any = await client.request({
      command: 'ledger_entry',
      index: loanBrokerId,
      ledger_index: 'validated'
    } as any)
    const node = res.result.node
    return {
      loanBrokerId,
      vaultId: node.VaultID,
      account: node.Account,
      debtTotal: dropsToXrp(node.DebtTotal ?? '0').toString(),
      coverAvailable: dropsToXrp(node.CoverAvailable ?? '0').toString()
    }
  } catch (e) {
    console.error('fetchLoanBroker failed', e)
    return null
  }
}
