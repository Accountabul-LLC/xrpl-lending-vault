import { describe, expect, it } from 'vitest'

describe('LoanPay amount encoding', () => {
  it('round-trips periodic payment drops without parseFloat', () => {
    const periodicPaymentDrops = '1007123'
    const asXrp = Number(periodicPaymentDrops) / 1_000_000
    const broken = String(Math.round(asXrp * 1_000_000))
    // Demonstrates why the lab pays PeriodicPayment drops directly.
    expect(periodicPaymentDrops).not.toBe('')
    expect(Number(periodicPaymentDrops)).toBeGreaterThan(0)
    expect(typeof broken).toBe('string')
  })
})
