import * as xrplLib from 'xrpl'
import { Client, Wallet, convertStringToHex, dropsToXrp } from 'xrpl'
import { ledgerAmountToXrp, percentToTenthsOfBps, rippleTimeToIso, xrpAmountToDrops } from './amounts'
import { signWithLendingDefs } from './vaultCodec'
import {
  CLOSED_ENDED_MIN_INVESTMENT_SECONDS,
  LAB_SUBSCRIPTION_LEAD_SECONDS,
  VAULT_KIND_CLOSED_ENDED,
  classifyVaultPhase,
  type VaultPhase
} from './vaultPhase'
import { XrplLabError } from './xrplErrors'

const decode = (xrplLib as any).decode as (blob: string) => any
const signLoanSetByCounterparty = (xrplLib as any).signLoanSetByCounterparty as (
  wallet: Wallet,
  tx: any
) => { tx: any }

export const DEVNET_WSS = 'wss://s.devnet.rippletest.net:51233'
export const DEVNET_EXPLORER_TX = 'https://devnet.xrpl.org/transactions/'
export const NETWORK_LABEL = 'XRPL DEVNET'

const LSF_VAULT_PRIVATE = 0x00010000
export const TF_LOAN_DEFAULT = 0x00010000
export const TF_LOAN_IMPAIR = 0x00020000
export const TF_LOAN_UNIMPAIR = 0x00040000
export const TF_LOAN_OVERPAYMENT = 0x00010000
export const TF_LOAN_FULL_PAYMENT = 0x00020000
export const LSF_LOAN_DEFAULT = 0x00010000
export const LSF_LOAN_IMPAIRED = 0x00020000

const OBJECT_CREATE_FEE_DROPS = '400000'
const RETRIES = 5

let clientPromise: Promise<Client> | null = null

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = RETRIES): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      const msg = e instanceof Error ? e.message : String(e)
      const retryable =
        /websocket|disconnected|timeout|ECONN|ETIMEDOUT|faucet|429|503|terRETRY|tefPAST_SEQ|unavailable/i.test(
          msg
        )
      if (!retryable || i === attempts - 1) throw e
      await sleep(1000 * 2 ** i)
      if (/websocket|disconnected|not connected/i.test(msg)) {
        await disconnectClient()
      }
    }
  }
  throw last instanceof Error ? last : new Error(`${label} failed`)
}

export async function disconnectClient() {
  if (!clientPromise) return
  try {
    const client = await clientPromise
    if (client.isConnected()) await client.disconnect()
  } catch {
    /* ignore */
  } finally {
    clientPromise = null
  }
}

export function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new Client(DEVNET_WSS, { connectionTimeout: 20_000 })
      client.on('disconnected', () => {
        clientPromise = null
      })
      await client.connect()
      return client
    })()
  }
  return clientPromise.then(async (client) => {
    if (!client.isConnected()) {
      clientPromise = null
      return getClient()
    }
    return client
  })
}

export interface AffectedObject {
  action: 'created' | 'modified' | 'deleted'
  type: string
  index?: string
}

export interface TxReceipt {
  transactionType: string
  account: string
  txJson: Record<string, unknown>
  hash: string
  ledgerIndex?: number
  resultCode: string
  validated: boolean
  affectedObjects: AffectedObject[]
  raw: unknown
}

function parseAffected(meta: any): AffectedObject[] {
  const nodes = meta?.AffectedNodes || []
  const out: AffectedObject[] = []
  for (const n of nodes) {
    if (n.CreatedNode) {
      out.push({
        action: 'created',
        type: n.CreatedNode.LedgerEntryType,
        index: n.CreatedNode.LedgerIndex
      })
    } else if (n.ModifiedNode) {
      out.push({
        action: 'modified',
        type: n.ModifiedNode.LedgerEntryType,
        index: n.ModifiedNode.LedgerIndex
      })
    } else if (n.DeletedNode) {
      out.push({
        action: 'deleted',
        type: n.DeletedNode.LedgerEntryType,
        index: n.DeletedNode.LedgerIndex
      })
    }
  }
  return out
}

function createdOf(meta: any, type: string) {
  const node = (meta?.AffectedNodes || []).find((n: any) => n.CreatedNode?.LedgerEntryType === type)
  return node?.CreatedNode
}

function receiptFrom(result: any, txJson: Record<string, unknown>, label: string): TxReceipt {
  const meta: any = result?.result?.meta ?? result?.meta
  const resultCode = meta?.TransactionResult ?? result?.result?.engine_result ?? 'unknown'
  const hash = result?.result?.hash ?? txJson.hash ?? ''
  const ledgerIndex = result?.result?.ledger_index ?? result?.result?.ledger_index
  const validated = Boolean(result?.result?.validated ?? meta)
  return {
    transactionType: label,
    account: String(txJson.Account ?? ''),
    txJson,
    hash,
    ledgerIndex,
    resultCode,
    validated,
    affectedObjects: parseAffected(meta),
    raw: result
  }
}

async function submitSigned(
  wallet: Wallet,
  tx: any,
  label: string,
  extra?: { feeDrops?: string; lendingCodec?: boolean }
): Promise<{ receipt: TxReceipt; meta: any; result: any }> {
  return withRetry(label, async () => {
    const client = await getClient()
    if (extra?.feeDrops) tx.Fee = extra.feeDrops
    const prepared = await client.autofill(tx)
    if (extra?.feeDrops && Number(prepared.Fee) < Number(extra.feeDrops)) {
      prepared.Fee = extra.feeDrops
    }
    const signed = extra?.lendingCodec
      ? signWithLendingDefs(wallet, prepared as Record<string, unknown>)
      : wallet.sign(prepared)
    const result = await client.submitAndWait(signed.tx_blob)
    const meta: any = result.result.meta
    const receipt = receiptFrom(result, prepared, label)
    if (meta?.TransactionResult !== 'tesSUCCESS') {
      throw new XrplLabError(label, `${label} failed: ${meta?.TransactionResult}`, receipt as any)
    }
    return { receipt, meta, result }
  })
}

export async function fetchRippleTime(): Promise<number> {
  const client = await getClient()
  const res: any = await client.request({
    command: 'ledger',
    ledger_index: 'validated'
  })
  const close = res.result.ledger?.close_time ?? res.result.closed?.ledger?.close_time
  const n = Number(close)
  if (!Number.isFinite(n) || n <= 0) {
    throw new XrplLabError('ledger', 'validated ledger close_time missing')
  }
  return n
}

export async function waitUntilRippleTime(target: number, label: string): Promise<number> {
  for (;;) {
    const now = await fetchRippleTime()
    if (now >= target) return now
    const remaining = target - now
    console.log(`[lab] waiting for ${label}: ${remaining}s remaining (ledger ${now} → ${target})`)
    await sleep(Math.min(Math.max(remaining * 1000, 800), 12_000))
  }
}

export async function fetchAccountXrp(address: string): Promise<{
  exists: boolean
  xrp: number
  balanceDrops: string
}> {
  try {
    const client = await getClient()
    const res: any = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    })
    const drops = res.result.account_data?.Balance ?? '0'
    return { exists: true, xrp: Number(dropsToXrp(drops)), balanceDrops: String(drops) }
  } catch (e: any) {
    const msg = String(e?.data?.error ?? e?.message ?? e)
    if (/actNotFound|Account not found/i.test(msg)) {
      return { exists: false, xrp: 0, balanceDrops: '0' }
    }
    throw e
  }
}

export async function fundNewWallet(): Promise<{ wallet: Wallet; xrp: number; verified: true }> {
  return withRetry('faucet', async () => {
    const client = await getClient()
    const { wallet } = await client.fundWallet()
    for (let i = 0; i < 8; i++) {
      const info = await fetchAccountXrp(wallet.address)
      if (info.exists && info.xrp > 0) {
        return { wallet, xrp: info.xrp, verified: true as const }
      }
      await sleep(1000)
    }
    throw new XrplLabError(
      'DevNet faucet',
      'Faucet returned a wallet but account_info did not find a funded account on the validated ledger'
    )
  })
}

export async function fetchMptAmount(account: string, mptIssuanceId: string): Promise<string> {
  if (!account || !mptIssuanceId) return '0'
  try {
    const client = await getClient()
    const res: any = await client.request({
      command: 'ledger_entry',
      mptoken: { account, mpt_issuance_id: mptIssuanceId },
      ledger_index: 'validated'
    } as any)
    return String(res.result.node?.MPTAmount ?? '0')
  } catch {
    return '0'
  }
}

export interface VaultInfo {
  vaultId: string
  account: string
  owner: string
  shareMptId: string
  asset: string
  assetsTotal: string
  assetsAvailable: string
  assetsMaximum: string
  lossUnrealized: string
  flags: number
  isPrivate: boolean
  outstandingShares: string
  scale: number
  withdrawalPolicy?: string | number
  vaultKind: number
  subscriptionDate?: number
  redemptionDate?: number
  subscriptionIso: string
  redemptionIso: string
}

function vaultFromNode(vaultId: string, node: any, shares?: any): VaultInfo {
  const flags = Number(node.Flags ?? 0)
  const asset = node.Asset?.currency ?? (node.Asset?.mpt_issuance_id ? 'MPT' : 'XRP')
  const subscriptionDate = node.SubscriptionDate != null ? Number(node.SubscriptionDate) : undefined
  const redemptionDate = node.RedemptionDate != null ? Number(node.RedemptionDate) : undefined
  return {
    vaultId,
    account: node.Account,
    owner: node.Owner ?? '',
    shareMptId: node.ShareMPTID ?? shares?.mpt_issuance_id ?? '',
    asset,
    assetsTotal: ledgerAmountToXrp(node.AssetsTotal ?? '0'),
    assetsAvailable: ledgerAmountToXrp(node.AssetsAvailable ?? '0'),
    assetsMaximum: ledgerAmountToXrp(node.AssetsMaximum ?? '0'),
    lossUnrealized: ledgerAmountToXrp(node.LossUnrealized ?? '0'),
    flags,
    isPrivate: (flags & LSF_VAULT_PRIVATE) !== 0,
    outstandingShares: String(shares?.OutstandingAmount ?? '0'),
    scale: Number(node.Scale ?? shares?.AssetScale ?? 0),
    withdrawalPolicy: node.WithdrawalPolicy,
    vaultKind: Number(node.VaultKind ?? 0),
    subscriptionDate: Number.isFinite(subscriptionDate) ? subscriptionDate : undefined,
    redemptionDate: Number.isFinite(redemptionDate) ? redemptionDate : undefined,
    subscriptionIso: rippleTimeToIso(subscriptionDate),
    redemptionIso: rippleTimeToIso(redemptionDate)
  }
}

export function vaultPhaseOf(vault: VaultInfo, nowRippleTime: number): VaultPhase {
  return classifyVaultPhase({
    vaultKind: vault.vaultKind,
    subscriptionDate: vault.subscriptionDate,
    redemptionDate: vault.redemptionDate,
    nowRippleTime
  })
}

export async function fetchVault(vaultId: string): Promise<VaultInfo> {
  const client = await getClient()
  let fromInfo: VaultInfo | null = null
  try {
    const res: any = await client.request({
      command: 'vault_info',
      vault_id: vaultId,
      ledger_index: 'validated'
    } as any)
    const vault = res.result.vault
    if (vault) fromInfo = vaultFromNode(vault.index ?? vaultId, vault, vault.shares)
  } catch {
    /* fall through to ledger_entry */
  }
  try {
    const res: any = await client.request({
      command: 'ledger_entry',
      index: vaultId,
      ledger_index: 'validated'
    } as any)
    const node = res.result.node
    if (!node || node.LedgerEntryType !== 'Vault') {
      throw new XrplLabError('vault_info', `tecNO_ENTRY: Vault ${vaultId} not found`)
    }
    const fromEntry = vaultFromNode(vaultId, node)
    if (!fromInfo) return fromEntry
    return {
      ...fromInfo,
      vaultKind: fromEntry.vaultKind || fromInfo.vaultKind,
      subscriptionDate: fromEntry.subscriptionDate ?? fromInfo.subscriptionDate,
      redemptionDate: fromEntry.redemptionDate ?? fromInfo.redemptionDate,
      subscriptionIso: fromEntry.subscriptionIso !== '—' ? fromEntry.subscriptionIso : fromInfo.subscriptionIso,
      redemptionIso: fromEntry.redemptionIso !== '—' ? fromEntry.redemptionIso : fromInfo.redemptionIso
    }
  } catch (e) {
    if (fromInfo) return fromInfo
    throw new XrplLabError('vault_info', e)
  }
}

export async function createVault(
  owner: Wallet,
  opts: {
    assetsMaximumXrp: string
    data?: string
    closedEnded?: boolean
    subscriptionDate?: number
    redemptionDate?: number
  } = { assetsMaximumXrp: '100000' }
) {
  const closedEnded = opts.closedEnded !== false
  const tx: any = {
    TransactionType: 'VaultCreate',
    Account: owner.address,
    Asset: { currency: 'XRP' },
    AssetsMaximum: xrpAmountToDrops(opts.assetsMaximumXrp),
    WithdrawalPolicy: 1,
    Data: opts.data ? convertStringToHex(opts.data) : undefined
  }
  if (closedEnded) {
    const now = await fetchRippleTime()
    const subscriptionDate = opts.subscriptionDate ?? now + LAB_SUBSCRIPTION_LEAD_SECONDS
    const redemptionDate =
      opts.redemptionDate ?? subscriptionDate + CLOSED_ENDED_MIN_INVESTMENT_SECONDS
    tx.VaultKind = VAULT_KIND_CLOSED_ENDED
    tx.SubscriptionDate = subscriptionDate
    tx.RedemptionDate = redemptionDate
  }
  const { receipt, meta } = await submitSigned(owner, tx, 'VaultCreate', {
    feeDrops: OBJECT_CREATE_FEE_DROPS,
    lendingCodec: closedEnded
  })
  const created = createdOf(meta, 'Vault')
  const vaultId = created?.LedgerIndex as string
  if (!vaultId) {
    throw new XrplLabError('VaultCreate', 'tesSUCCESS but no Vault object in metadata', receipt as any)
  }
  const info = await fetchVault(vaultId)
  if (closedEnded && info.vaultKind !== VAULT_KIND_CLOSED_ENDED) {
    throw new XrplLabError(
      'VaultCreate',
      `Vault exists but VaultKind is ${info.vaultKind} (expected closed-ended ${VAULT_KIND_CLOSED_ENDED}). The binary codec likely dropped VaultKind.`
    )
  }
  return {
    vaultId,
    shareMptId: info.shareMptId || (created?.NewFields?.ShareMPTID as string),
    account: info.account || (created?.NewFields?.Account as string),
    owner: info.owner || owner.address,
    info,
    receipt
  }
}

export async function depositVault(depositor: Wallet, vaultId: string, amountXrp: string) {
  const tx: any = {
    TransactionType: 'VaultDeposit',
    Account: depositor.address,
    VaultID: vaultId,
    Amount: xrpAmountToDrops(amountXrp)
  }
  const { receipt } = await submitSigned(depositor, tx, 'VaultDeposit')
  const vault = await fetchVault(vaultId)
  const shares = await fetchMptAmount(depositor.address, vault.shareMptId)
  return { receipt, vault, shares }
}

export async function withdrawVault(holder: Wallet, vaultId: string, amountXrp: string) {
  const tx: any = {
    TransactionType: 'VaultWithdraw',
    Account: holder.address,
    VaultID: vaultId,
    Amount: xrpAmountToDrops(amountXrp)
  }
  const { receipt } = await submitSigned(holder, tx, 'VaultWithdraw')
  const vault = await fetchVault(vaultId)
  const shares = await fetchMptAmount(holder.address, vault.shareMptId)
  return { receipt, vault, shares }
}

export interface LoanBrokerInfo {
  loanBrokerId: string
  vaultId: string
  account: string
  owner: string
  debtTotal: string
  debtMaximum: string
  coverAvailable: string
  coverRateMinimum: number
  coverRateLiquidation: number
  managementFeeRate: number
  ownerCount: number
  loanSequence: number
}

export async function fetchLoanBroker(loanBrokerId: string): Promise<LoanBrokerInfo> {
  const client = await getClient()
  try {
    const res: any = await client.request({
      command: 'ledger_entry',
      index: loanBrokerId,
      ledger_index: 'validated'
    } as any)
    const node = res.result.node
    if (!node) throw new Error('LoanBroker not found')
    return {
      loanBrokerId,
      vaultId: node.VaultID,
      account: node.Account,
      owner: node.Owner ?? '',
      debtTotal: ledgerAmountToXrp(node.DebtTotal ?? '0'),
      debtMaximum: ledgerAmountToXrp(node.DebtMaximum ?? '0'),
      coverAvailable: ledgerAmountToXrp(node.CoverAvailable ?? '0'),
      coverRateMinimum: node.CoverRateMinimum ?? 0,
      coverRateLiquidation: node.CoverRateLiquidation ?? 0,
      managementFeeRate: node.ManagementFeeRate ?? 0,
      ownerCount: node.OwnerCount ?? 0,
      loanSequence: node.LoanSequence ?? 1
    }
  } catch (e) {
    throw new XrplLabError('fetchLoanBroker', e)
  }
}

export async function createLoanBroker(
  owner: Wallet,
  vaultId: string,
  opts: { managementFeeRateBps10?: number; debtMaximumXrp?: string } = {}
) {
  const tx: any = {
    TransactionType: 'LoanBrokerSet',
    Account: owner.address,
    VaultID: vaultId,
    ManagementFeeRate: opts.managementFeeRateBps10 ?? 1000,
    DebtMaximum: opts.debtMaximumXrp ? xrpAmountToDrops(opts.debtMaximumXrp) : undefined
  }
  const { receipt, meta } = await submitSigned(owner, tx, 'LoanBrokerSet', {
    feeDrops: OBJECT_CREATE_FEE_DROPS
  })
  const created = createdOf(meta, 'LoanBroker')
  const loanBrokerId = created?.LedgerIndex as string
  if (!loanBrokerId) {
    throw new XrplLabError(
      'LoanBrokerSet',
      'tesSUCCESS but no LoanBroker object in metadata',
      receipt as any
    )
  }
  const info = await fetchLoanBroker(loanBrokerId)
  return { loanBrokerId, info, receipt }
}

export async function depositCover(funder: Wallet, loanBrokerId: string, amountXrp: string) {
  const { receipt } = await submitSigned(
    funder,
    {
      TransactionType: 'LoanBrokerCoverDeposit',
      Account: funder.address,
      LoanBrokerID: loanBrokerId,
      Amount: xrpAmountToDrops(amountXrp)
    },
    'LoanBrokerCoverDeposit'
  )
  return { receipt, broker: await fetchLoanBroker(loanBrokerId) }
}

export async function withdrawCover(owner: Wallet, loanBrokerId: string, amountXrp: string) {
  const { receipt } = await submitSigned(
    owner,
    {
      TransactionType: 'LoanBrokerCoverWithdraw',
      Account: owner.address,
      LoanBrokerID: loanBrokerId,
      Amount: xrpAmountToDrops(amountXrp)
    },
    'LoanBrokerCoverWithdraw'
  )
  return { receipt, broker: await fetchLoanBroker(loanBrokerId) }
}

export interface CreateLoanOpts {
  principalXrp: string
  interestRateBps10: number
  paymentTotal: number
  paymentIntervalSeconds: number
  gracePeriodSeconds?: number
  originationFeeXrp?: string
  serviceFeeXrp?: string
}

export interface LoanInfo {
  loanId: string
  borrower: string
  loanBrokerId: string
  principalOutstanding: string
  totalValueOutstanding: string
  managementFeeOutstanding: string
  interestRate: number
  nextPaymentDueDate?: string
  nextPaymentDueIso: string
  paymentRemaining?: number
  periodicPayment: string
  periodicPaymentDrops: string
  paymentInterval?: number
  gracePeriod?: number
  flags: number
  defaulted: boolean
  impaired: boolean
}

function loanFromNode(loanId: string, node: any): LoanInfo {
  const flags = node.Flags ?? 0
  return {
    loanId,
    borrower: node.Borrower,
    loanBrokerId: node.LoanBrokerID,
    principalOutstanding: ledgerAmountToXrp(node.PrincipalOutstanding ?? '0'),
    totalValueOutstanding: ledgerAmountToXrp(node.TotalValueOutstanding ?? '0'),
    managementFeeOutstanding: ledgerAmountToXrp(node.ManagementFeeOutstanding ?? '0'),
    interestRate: node.InterestRate,
    nextPaymentDueDate: node.NextPaymentDueDate,
    nextPaymentDueIso: (() => {
      const n = Number(node.NextPaymentDueDate)
      if (!Number.isFinite(n) || n <= 0) return '—'
      return new Date((n + 946684800) * 1000).toISOString()
    })(),
    paymentRemaining: node.PaymentRemaining,
    periodicPayment: ledgerAmountToXrp(node.PeriodicPayment ?? '0'),
    periodicPaymentDrops: String(node.PeriodicPayment ?? '0'),
    paymentInterval: node.PaymentInterval,
    gracePeriod: node.GracePeriod,
    flags,
    defaulted: (flags & LSF_LOAN_DEFAULT) !== 0,
    impaired: (flags & LSF_LOAN_IMPAIRED) !== 0
  }
}

export async function fetchLoan(loanId: string): Promise<LoanInfo> {
  const client = await getClient()
  try {
    const res: any = await client.request({
      command: 'ledger_entry',
      index: loanId,
      ledger_index: 'validated'
    } as any)
    const node = res.result.node
    if (!node) throw new Error('Loan not found')
    return loanFromNode(loanId, node)
  } catch (e) {
    throw new XrplLabError('fetchLoan', e)
  }
}

export async function listLoans(opts: {
  loanBrokerId: string
  brokerPseudoAccount?: string
  borrowerAddress?: string
  knownIds?: string[]
}): Promise<LoanInfo[]> {
  const ids = new Set((opts.knownIds ?? []).filter(Boolean))
  const client = await getClient()
  async function scan(account?: string) {
    if (!account) return
    let marker: unknown
    do {
      const res: any = await client.request({
        command: 'account_objects',
        account,
        ledger_index: 'validated',
        limit: 200,
        marker
      } as any)
      for (const obj of res.result.account_objects ?? []) {
        if (obj.LedgerEntryType === 'Loan' && obj.LoanBrokerID === opts.loanBrokerId) {
          ids.add(obj.index)
        }
      }
      marker = res.result.marker
    } while (marker)
  }
  try {
    await scan(opts.brokerPseudoAccount)
    await scan(opts.borrowerAddress)
  } catch {
    /* listing is best-effort; session IDs still apply */
  }
  const loans: LoanInfo[] = []
  for (const id of ids) {
    try {
      loans.push(await fetchLoan(id))
    } catch {
      /* skip stale ids */
    }
  }
  return loans
}

export async function createLoan(
  broker: Wallet,
  borrower: Wallet,
  loanBrokerId: string,
  opts: CreateLoanOpts
) {
  if (typeof signLoanSetByCounterparty !== 'function') {
    throw new XrplLabError(
      'LoanSet',
      'WALLET / SIGNING: xrpl.js signLoanSetByCounterparty is unavailable in this build'
    )
  }
  const client = await getClient()
  const tx: any = {
    TransactionType: 'LoanSet',
    Account: broker.address,
    Counterparty: borrower.address,
    LoanBrokerID: loanBrokerId,
    PrincipalRequested: xrpAmountToDrops(opts.principalXrp),
    InterestRate: opts.interestRateBps10,
    PaymentTotal: opts.paymentTotal,
    PaymentInterval: opts.paymentIntervalSeconds,
    GracePeriod:
      opts.gracePeriodSeconds != null && opts.gracePeriodSeconds > 0
        ? opts.gracePeriodSeconds
        : undefined,
    LoanOriginationFee: opts.originationFeeXrp ? xrpAmountToDrops(opts.originationFeeXrp) : undefined,
    LoanServiceFee: opts.serviceFeeXrp ? xrpAmountToDrops(opts.serviceFeeXrp) : undefined
  }
  const prepared = await client.autofill(tx)
  const brokerSigned = broker.sign(prepared)
  const decoded = decode(brokerSigned.tx_blob)
  const fullySigned = signLoanSetByCounterparty(borrower, decoded)
  const result = await client.submitAndWait(fullySigned.tx)
  const meta: any = result.result.meta
  const receipt = receiptFrom(result, fullySigned.tx, 'LoanSet')
  if (meta?.TransactionResult !== 'tesSUCCESS') {
    throw new XrplLabError('LoanSet', `LoanSet failed: ${meta?.TransactionResult}`, receipt as any)
  }
  const created = createdOf(meta, 'Loan')
  const loanId = created?.LedgerIndex as string
  if (!loanId) {
    throw new XrplLabError('LoanSet', 'tesSUCCESS but no Loan object in metadata', receipt as any)
  }
  const info = await fetchLoan(loanId)
  return {
    loanId,
    info,
    receipt,
    signing: {
      brokerSigned: true,
      borrowerSigned: true,
      submitted: true,
      validated: receipt.validated
    }
  }
}

export async function payLoan(
  payer: Wallet,
  loanId: string,
  amountXrp: string,
  flags = 0
) {
  return payLoanDrops(payer, loanId, xrpAmountToDrops(amountXrp), flags)
}

export async function payLoanDrops(payer: Wallet, loanId: string, amountDrops: string, flags = 0) {
  const { receipt } = await submitSigned(
    payer,
    {
      TransactionType: 'LoanPay',
      Account: payer.address,
      LoanID: loanId,
      Amount: amountDrops,
      Flags: flags
    },
    'LoanPay'
  )
  return { receipt, loan: await fetchLoan(loanId) }
}

export async function payRequiredInstallment(payer: Wallet, loan: LoanInfo) {
  const amount = loan.periodicPaymentDrops
  if (!amount || amount === '0') {
    throw new XrplLabError('LoanPay', 'Loan has no PeriodicPayment on the ledger')
  }
  return payLoanDrops(payer, loan.loanId, amount, 0)
}

export async function payLoanFull(payer: Wallet, loanId: string, amountXrp: string) {
  return payLoan(payer, loanId, amountXrp, TF_LOAN_FULL_PAYMENT)
}

export async function manageLoan(
  owner: Wallet,
  loanId: string,
  flag: typeof TF_LOAN_DEFAULT | typeof TF_LOAN_IMPAIR | typeof TF_LOAN_UNIMPAIR
) {
  const { receipt } = await submitSigned(
    owner,
    {
      TransactionType: 'LoanManage',
      Account: owner.address,
      LoanID: loanId,
      Flags: flag
    },
    'LoanManage'
  )
  return { receipt, loan: await fetchLoan(loanId) }
}

export async function deleteLoan(signer: Wallet, loanId: string) {
  const { receipt } = await submitSigned(
    signer,
    {
      TransactionType: 'LoanDelete',
      Account: signer.address,
      LoanID: loanId
    },
    'LoanDelete'
  )
  return { receipt }
}

export async function setVault(
  owner: Wallet,
  vaultId: string,
  opts: { assetsMaximumXrp?: string; data?: string }
) {
  const { receipt } = await submitSigned(
    owner,
    {
      TransactionType: 'VaultSet',
      Account: owner.address,
      VaultID: vaultId,
      AssetsMaximum: opts.assetsMaximumXrp ? xrpAmountToDrops(opts.assetsMaximumXrp) : undefined,
      Data: opts.data ? convertStringToHex(opts.data) : undefined
    },
    'VaultSet'
  )
  return { receipt, vault: await fetchVault(vaultId) }
}

export { percentToTenthsOfBps, xrpAmountToDrops }
