import { describe, expect, it } from 'vitest'

export function protocolLoanBookView(input: {
  brokerExists: boolean
  loans: { loanId: string }[]
}) {
  if (!input.brokerExists) {
    return { kind: 'needs-broker' as const, message: 'Create Loan Broker first' }
  }
  if (input.loans.length === 0) {
    return {
      kind: 'empty' as const,
      title: 'NO LOANS YET',
      next: 'Originate your first loan.'
    }
  }
  return { kind: 'list' as const, count: input.loans.length }
}

describe('Protocol Loan Book view model', () => {
  it('does not render a blank screen when the broker exists but no loans do', () => {
    const view = protocolLoanBookView({ brokerExists: true, loans: [] })
    expect(view.kind).toBe('empty')
    if (view.kind === 'empty') {
      expect(view.title).toBe('NO LOANS YET')
      expect(view.next).toMatch(/Originate/)
    }
  })

  it('tells the user to create a LoanBroker instead of no-opping', () => {
    const view = protocolLoanBookView({ brokerExists: false, loans: [] })
    expect(view.kind).toBe('needs-broker')
  })
})
