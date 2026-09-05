import { Wallet } from 'xrpl'
import { parseXrpNumber } from './amounts'
import {
  createLoan,
  createLoanBroker,
  createVault,
  depositVault,
  disconnectClient,
  fetchAccountXrp,
  fetchLoan,
  fetchLoanBroker,
  fetchMptAmount,
  fetchRippleTime,
  fetchVault,
  fundNewWallet,
  payRequiredInstallment,
  vaultPhaseOf,
  waitUntilRippleTime,
  withdrawVault,
  type LoanBrokerInfo,
  type LoanInfo,
  type TxReceipt,
  type VaultInfo
} from './xrpl'
import { interpretXrplError, type FailureCategory } from './xrplErrors'
import {
  CLOSED_ENDED_MIN_INVESTMENT_SECONDS,
  LAB_PAYMENT_INTERVAL_SECONDS,
  LAB_PAYMENT_TOTAL,
  LAB_SUBSCRIPTION_LEAD_SECONDS,
  VAULT_KIND_CLOSED_ENDED
} from './vaultPhase'

export const LAB_DEFAULTS = {
  assetsMaximumXrp: '100000',
  depositXrp: '20',
  withdrawXrp: '3',
  principalXrp: '8',
  aprPercent: '8',
  paymentTotal: LAB_PAYMENT_TOTAL,
  paymentIntervalSeconds: LAB_PAYMENT_INTERVAL_SECONDS,
  gracePeriodSeconds: undefined as number | undefined,
  managementFeeRate: 1000,
  originationFeeXrp: undefined as string | undefined,
  serviceFeeXrp: undefined as string | undefined,
  subscriptionLeadSeconds: LAB_SUBSCRIPTION_LEAD_SECONDS,
  minInvestmentSeconds: CLOSED_ENDED_MIN_INVESTMENT_SECONDS
}

export type RoleWallets = {
  owner: Wallet
  depositor: Wallet
  borrower: Wallet
}

export interface StepResult {
  name: string
  ok: boolean
  receipt?: TxReceipt
  detail?: string
  error?: string
  category?: FailureCategory
}

export interface LifecycleResult {
  ok: boolean
  wallets: RoleWallets
  vault?: VaultInfo
  broker?: LoanBrokerInfo
  loan?: LoanInfo
  sharesAfterDeposit?: string
  sharesAfterWithdraw?: string
  steps: Record<string, StepResult>
  defects: string[]
}

function fail(name: string, e: unknown): StepResult {
  const g = interpretXrplError(e, name)
  return {
    name,
    ok: false,
    error: `${g.code}: ${g.meaning}`,
    category: g.category,
    detail: g.fix
  }
}

export async function fundLabWallets(): Promise<{
  wallets: RoleWallets
  balances: { owner: number; depositor: number; borrower: number }
}> {
  const owner = await fundNewWallet()
  const depositor = await fundNewWallet()
  const borrower = await fundNewWallet()
  const [ob, db, bb] = await Promise.all([
    fetchAccountXrp(owner.wallet.address),
    fetchAccountXrp(depositor.wallet.address),
    fetchAccountXrp(borrower.wallet.address)
  ])
  if (!ob.exists || !db.exists || !bb.exists || ob.xrp <= 0 || db.xrp <= 0 || bb.xrp <= 0) {
    throw new Error('Faucet reported success but ledger verification failed for one or more wallets')
  }
  return {
    wallets: { owner: owner.wallet, depositor: depositor.wallet, borrower: borrower.wallet },
    balances: { owner: ob.xrp, depositor: db.xrp, borrower: bb.xrp }
  }
}

export async function runFullLabLifecycle(
  defaults: typeof LAB_DEFAULTS = LAB_DEFAULTS
): Promise<LifecycleResult> {
  const steps: Record<string, StepResult> = {}
  const defects: string[] = []
  const result: LifecycleResult = { ok: false, wallets: {} as RoleWallets, steps, defects }

  try {
    const funded = await fundLabWallets()
    result.wallets = funded.wallets
    steps.fund = {
      name: 'Fund',
      ok: true,
      detail: `owner ${funded.balances.owner} XRP, depositor ${funded.balances.depositor} XRP, borrower ${funded.balances.borrower} XRP`
    }
  } catch (e) {
    steps.fund = fail('Fund', e)
    return result
  }

  const { owner, depositor, borrower } = result.wallets

  try {
    const created = await createVault(owner, {
      assetsMaximumXrp: defaults.assetsMaximumXrp,
      data: 'JRPU Live DevNet Lab vault',
      closedEnded: true
    })
    const verified = await fetchVault(created.vaultId)
    if (verified.vaultId !== created.vaultId) {
      throw new Error('vault_info returned a different Vault ID than VaultCreate')
    }
    if (verified.vaultKind !== VAULT_KIND_CLOSED_ENDED) {
      throw new Error(
        `VaultKind is ${verified.vaultKind}; LoanBrokerSet requires a closed-ended vault (VaultKind=1)`
      )
    }
    result.vault = verified
    steps.vault = {
      name: 'Vault',
      ok: true,
      receipt: created.receipt,
      detail: `VaultID ${verified.vaultId} closed-ended cap ${verified.assetsMaximum} sub ${verified.subscriptionIso} red ${verified.redemptionIso}`
    }
  } catch (e) {
    steps.vault = fail('VaultCreate', e)
    return result
  }

  const vaultId = result.vault!.vaultId
  let vaultBeforeDeposit: VaultInfo | undefined
  try {
    const now = await fetchRippleTime()
    const phase = vaultPhaseOf(result.vault!, now)
    if (phase !== 'subscription' && phase !== 'open-ended') {
      throw new Error(
        `Cannot deposit: vault phase is ${phase}. Deposits require the subscription window.`
      )
    }
    vaultBeforeDeposit = await fetchVault(vaultId)
    const dep = await depositVault(depositor, vaultId, defaults.depositXrp)
    const after = dep.vault
    const expected = parseXrpNumber(vaultBeforeDeposit.assetsTotal) + parseFloat(defaults.depositXrp)
    if (Math.abs(parseXrpNumber(after.assetsTotal) - expected) > 0.0001) {
      throw new Error(
        `Assets Total did not increase as expected: before ${vaultBeforeDeposit.assetsTotal} after ${after.assetsTotal}`
      )
    }
    if (parseXrpNumber(dep.shares) <= 0) {
      throw new Error('Depositor received no vault shares after VaultDeposit')
    }
    result.vault = after
    result.sharesAfterDeposit = dep.shares
    steps.deposit = {
      name: 'Deposit',
      ok: true,
      receipt: dep.receipt,
      detail: `total ${after.assetsTotal} shares ${dep.shares}`
    }
  } catch (e) {
    steps.deposit = fail('VaultDeposit', e)
    return result
  }

  try {
    const created = await createLoanBroker(owner, vaultId, {
      managementFeeRateBps10: defaults.managementFeeRate
    })
    const verified = await fetchLoanBroker(created.loanBrokerId)
    result.broker = verified
    steps.broker = {
      name: 'Broker',
      ok: true,
      receipt: created.receipt,
      detail: `LoanBrokerID ${verified.loanBrokerId}`
    }
  } catch (e) {
    steps.broker = fail('LoanBrokerSet', e)
    return result
  }

  const loanBrokerId = result.broker!.loanBrokerId
  try {
    const vault = await fetchVault(vaultId)
    if (vault.subscriptionDate) {
      await waitUntilRippleTime(vault.subscriptionDate + 1, 'investment phase (after SubscriptionDate)')
    }
    const now = await fetchRippleTime()
    const phase = vaultPhaseOf(vault, now)
    if (phase === 'subscription') {
      throw new Error('Still in subscription after wait; LoanSet would return tecTOO_SOON')
    }
    if (phase === 'redemption') {
      throw new Error('Vault entered redemption before origination; LoanSet would return tecEXPIRED')
    }
    const created = await createLoan(owner, borrower, loanBrokerId, {
      principalXrp: defaults.principalXrp,
      interestRateBps10: Math.round(parseFloat(defaults.aprPercent) * 1000),
      paymentTotal: defaults.paymentTotal,
      paymentIntervalSeconds: defaults.paymentIntervalSeconds,
      gracePeriodSeconds: defaults.gracePeriodSeconds,
      originationFeeXrp: defaults.originationFeeXrp,
      serviceFeeXrp: defaults.serviceFeeXrp
    })
    const verified = await fetchLoan(created.loanId)
    if (verified.borrower !== borrower.address) {
      throw new Error('Loan borrower does not match the funded borrower wallet')
    }
    result.loan = verified
    result.vault = await fetchVault(vaultId)
    result.broker = await fetchLoanBroker(loanBrokerId)
    steps.loan = {
      name: 'Loan',
      ok: true,
      receipt: created.receipt,
      detail: `LoanID ${verified.loanId} periodic ${verified.periodicPayment}`
    }
  } catch (e) {
    steps.loan = fail('LoanSet', e)
    return result
  }

  try {
    const before = await fetchLoan(result.loan!.loanId)
    const due = Number(before.nextPaymentDueDate ?? 0)
    if (due > 0) {
      await waitUntilRippleTime(due, 'first payment due (regular LoanPay)')
    }
    const paid = await payRequiredInstallment(borrower, before)
    const after = paid.loan
    if ((after.paymentRemaining ?? 0) >= (before.paymentRemaining ?? 1)) {
      throw new Error(
        `PaymentRemaining did not decrease (before ${before.paymentRemaining} after ${after.paymentRemaining})`
      )
    }
    result.loan = after
    result.vault = await fetchVault(vaultId)
    result.broker = await fetchLoanBroker(loanBrokerId)
    steps.payment = {
      name: 'Payment',
      ok: true,
      receipt: paid.receipt,
      detail: `remaining ${after.paymentRemaining} principal ${after.principalOutstanding}`
    }
  } catch (e) {
    steps.payment = fail('LoanPay', e)
    return result
  }

  try {
    result.vault = await fetchVault(vaultId)
    if (result.vault.redemptionDate) {
      await waitUntilRippleTime(result.vault.redemptionDate, 'redemption phase (VaultWithdraw)')
    }
    result.vault = await fetchVault(vaultId)
    const now = await fetchRippleTime()
    const phase = vaultPhaseOf(result.vault, now)
    if (phase === 'investment') {
      throw new Error('Still in investment phase; VaultWithdraw would return tecTOO_SOON')
    }
    const available = parseXrpNumber(result.vault.assetsAvailable)
    const requested = parseFloat(defaults.withdrawXrp)
    if (available + 1e-9 < requested) {
      throw new Error(
        `Cannot withdraw ${requested} XRP; Assets Available is ${available}`
      )
    }
    const beforeShares = await fetchMptAmount(depositor.address, result.vault.shareMptId)
    const wd = await withdrawVault(depositor, vaultId, defaults.withdrawXrp)
    if (parseXrpNumber(wd.shares) >= parseXrpNumber(beforeShares) && parseXrpNumber(beforeShares) > 0) {
      throw new Error(`Share balance did not decrease after withdraw (${beforeShares} -> ${wd.shares})`)
    }
    result.vault = wd.vault
    result.sharesAfterWithdraw = wd.shares
    steps.withdraw = {
      name: 'Withdraw',
      ok: true,
      receipt: wd.receipt,
      detail: `available ${wd.vault.assetsAvailable} shares ${wd.shares}`
    }
  } catch (e) {
    steps.withdraw = fail('VaultWithdraw', e)
    return result
  }

  try {
    const vault = await fetchVault(vaultId)
    const broker = await fetchLoanBroker(loanBrokerId)
    const loan = await fetchLoan(result.loan!.loanId)
    const ownerBal = await fetchAccountXrp(owner.address)
    const depBal = await fetchAccountXrp(depositor.address)
    const borBal = await fetchAccountXrp(borrower.address)
    if (!ownerBal.exists || !depBal.exists || !borBal.exists) {
      throw new Error('A lab wallet disappeared from the ledger during verification')
    }
    result.vault = vault
    result.broker = broker
    result.loan = loan
    steps.final = {
      name: 'Final',
      ok: true,
      detail: `vault ${vault.assetsTotal}/${vault.assetsAvailable} loan remaining ${loan.paymentRemaining}`
    }
  } catch (e) {
    steps.final = fail('Verify', e)
    return result
  }

  result.ok = Boolean(
    steps.fund?.ok &&
      steps.vault?.ok &&
      steps.deposit?.ok &&
      steps.broker?.ok &&
      steps.loan?.ok &&
      steps.payment?.ok &&
      steps.withdraw?.ok &&
      steps.final?.ok
  )
  return result
}

export async function closeLabClient() {
  await disconnectClient()
}
