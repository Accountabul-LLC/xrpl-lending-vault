import { describe, expect, it } from 'vitest'
import { roundUpDrops } from './amounts'
import { TF_LOAN_LATE_PAYMENT, isLoanPayLate, loanPayFlags } from './xrpl'

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

  it('treats now >= NextPaymentDueDate as late so regular LoanPay is not submitted (DEVNET-004)', () => {
    expect(isLoanPayLate(100, 101)).toBe(false)
    expect(isLoanPayLate(101, 101)).toBe(true)
    expect(isLoanPayLate(102, 101)).toBe(true)
    expect(loanPayFlags(100, 101)).toBe(0)
    expect(loanPayFlags(101, 101)).toBe(TF_LOAN_LATE_PAYMENT)
  })
})
