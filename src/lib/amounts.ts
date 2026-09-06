import { dropsToXrp, xrpToDrops } from 'xrpl'

/** Ledger numeric amounts for XRP vaults/loans are drops unless they already contain a decimal. */
export function ledgerAmountToXrp(value: unknown): string {
  if (value == null || value === '') return '0'
  const s = String(value)
  if (s.includes('.')) return s
  try {
    return dropsToXrp(s).toString()
  } catch {
    return s
  }
}

export function xrpAmountToDrops(xrp: string | number): string {
  const n = typeof xrp === 'number' ? xrp : parseFloat(xrp)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('Amount must be a positive number')
  }
  return xrpToDrops(String(n))
}

export function tenthsOfBpsToPercent(value: unknown): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0.00%'
  return `${(n / 1000).toFixed(2)}%`
}

export function percentToTenthsOfBps(percent: string | number): number {
  const n = typeof percent === 'number' ? percent : parseFloat(percent)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Percent must be a non-negative number')
  }
  return Math.round(n * 1000)
}

export const RIPPLE_EPOCH_OFFSET = 946684800

export function rippleTimeToIso(rippleTime?: number | string | null): string {
  if (rippleTime == null || rippleTime === '') return '—'
  const n = Number(rippleTime)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return new Date((n + RIPPLE_EPOCH_OFFSET) * 1000).toISOString()
}

export function formatXrp(value: string | number, digits = 6): string {
  const n = typeof value === 'number' ? value : parseFloat(value)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString(undefined, { maximumFractionDigits: digits })
}

export function parseXrpNumber(value: string | number | undefined | null): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Lending STNumber values (PeriodicPayment, etc.) are drop-denominated and may include a
 * fractional drop. LoanPay `Amount` is an STAmount and must be a whole number of drops.
 * Round **up** so the payment is never short of the required installment.
 */
export function roundUpDrops(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.ceil(value))
  }
  const s = String(value ?? '0').trim()
  if (!s || s === '0') return '0'
  if (/e/i.test(s)) {
    const n = Number(s)
    if (!Number.isFinite(n)) return '0'
    return String(Math.ceil(n))
  }
  const neg = s.startsWith('-')
  const raw = neg ? s.slice(1) : s
  const [intPart, frac = ''] = raw.split('.')
  const whole = BigInt(intPart || '0')
  const bump = frac.split('').some((c) => c !== '0')
  const drops = whole + (bump ? 1n : 0n)
  return `${neg ? '-' : ''}${drops.toString()}`
}
