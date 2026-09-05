import { RIPPLE_EPOCH_OFFSET, rippleTimeToIso } from './amounts'

/** rippled `kMinInvestmentPeriod` — RedemptionDate - SubscriptionDate must be ≥ this. */
export const CLOSED_ENDED_MIN_INVESTMENT_SECONDS = 180
/** rippled `kLoanRedemptionBuffer` — final payment + buffer must be ≤ RedemptionDate. */
export const LOAN_REDEMPTION_BUFFER_SECONDS = 60
/**
 * Lab loan schedule that fits a min-gap closed-ended vault:
 * origination + PaymentInterval + buffer ≤ 180s investment window.
 */
export const LAB_PAYMENT_INTERVAL_SECONDS = 60
export const LAB_PAYMENT_TOTAL = 1
export const LAB_GRACE_PERIOD_SECONDS = 1
/** Seconds after ledger close time before SubscriptionDate, so deposit+broker can complete. */
export const LAB_SUBSCRIPTION_LEAD_SECONDS = 45

export const VAULT_KIND_OPEN_ENDED = 0
export const VAULT_KIND_CLOSED_ENDED = 1

export type VaultPhase = 'open-ended' | 'subscription' | 'investment' | 'redemption'

/**
 * Matches rippled `getVaultPhase`:
 *   now <= SubscriptionDate → Subscription
 *   now <  RedemptionDate   → Investment
 *   now >= RedemptionDate   → Redemption
 * Open-ended vaults have no phase (deposits/withdrawals always allowed; LoanBrokerSet forbidden on V1.1).
 */
export function classifyVaultPhase(opts: {
  vaultKind?: number | string | null
  subscriptionDate?: number | string | null
  redemptionDate?: number | string | null
  nowRippleTime: number
}): VaultPhase {
  const kind = Number(opts.vaultKind ?? VAULT_KIND_OPEN_ENDED)
  if (kind !== VAULT_KIND_CLOSED_ENDED) return 'open-ended'
  const sub = Number(opts.subscriptionDate ?? 0)
  const red = Number(opts.redemptionDate ?? 0)
  if (!sub || !red) return 'open-ended'
  if (opts.nowRippleTime <= sub) return 'subscription'
  if (opts.nowRippleTime < red) return 'investment'
  return 'redemption'
}

export function isValidClosedEndedGap(subscriptionDate: number, redemptionDate: number): boolean {
  const gap = redemptionDate - subscriptionDate
  const thirtyYears = 30 * 365 * 24 * 60 * 60
  return gap >= CLOSED_ENDED_MIN_INVESTMENT_SECONDS && gap < thirtyYears
}

export function loanFitsRedemption(opts: {
  originationRippleTime: number
  paymentIntervalSeconds: number
  paymentTotal: number
  redemptionDate: number
}): boolean {
  const finalPayment =
    opts.originationRippleTime + opts.paymentIntervalSeconds * opts.paymentTotal
  return finalPayment + LOAN_REDEMPTION_BUFFER_SECONDS <= opts.redemptionDate
}

export function unixMsToRippleTime(ms: number): number {
  return Math.round(ms / 1000) - RIPPLE_EPOCH_OFFSET
}

export function formatPhase(phase: VaultPhase): string {
  switch (phase) {
    case 'subscription':
      return 'SUBSCRIPTION'
    case 'investment':
      return 'INVESTMENT'
    case 'redemption':
      return 'REDEMPTION'
    default:
      return 'OPEN-ENDED (no phase)'
  }
}

export function secondsUntil(target: number | undefined, now: number): number {
  if (!target) return 0
  return Math.max(0, target - now)
}

export function phaseHint(phase: VaultPhase, vault: {
  subscriptionDate?: number
  redemptionDate?: number
}, now: number): string {
  switch (phase) {
    case 'subscription':
      return `Deposits and LoanBrokerSet are allowed until SubscriptionDate (${rippleTimeToIso(vault.subscriptionDate)}). Originate after that. ${secondsUntil(vault.subscriptionDate, now)}s remaining.`
    case 'investment':
      return `Deposits are closed. Originate and repay loans. Withdrawals unlock at RedemptionDate (${rippleTimeToIso(vault.redemptionDate)}). ${secondsUntil(vault.redemptionDate, now)}s remaining.`
    case 'redemption':
      return 'The investment window has ended. Depositors may redeem available assets. New loans are not allowed.'
    default:
      return 'Open-ended vaults allow deposits and withdrawals at any time, but LendingProtocolV1_1 rejects LoanBrokerSet on them.'
  }
}
