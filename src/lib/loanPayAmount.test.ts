import { describe, expect, it } from 'vitest'
import { roundUpDrops } from './amounts'

describe('LoanPay amount encoding', () => {
  it('round-trips integer periodic payment drops without parseFloat', () => {
    const periodicPaymentDrops = '1007123'
    expect(roundUpDrops(periodicPaymentDrops)).toBe(periodicPaymentDrops)
    expect(Number(periodicPaymentDrops)).toBeGreaterThan(0)
  })

  it('does not submit the fractional STNumber that xrpl.js rejects as an illegal amount (DEVNET-003)', () => {
    const ledgerPeriodicPayment = '8000001.217659692176'
    const amount = roundUpDrops(ledgerPeriodicPayment)
    expect(amount).toBe('8000002')
    expect(amount.includes('.')).toBe(false)
    expect(() => {
      if (amount.includes('.')) throw new Error(`${amount} is an illegal amount`)
    }).not.toThrow()
  })
})
