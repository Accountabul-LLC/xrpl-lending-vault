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
