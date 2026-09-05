import { describe, expect, it } from 'vitest'
import {
  extractResultCode,
  formatErrorReport,
  interpretXrplError
} from './xrplErrors'

describe('interpretXrplError', () => {
  it('translates tecNO_AUTH into a private-vault credential action', () => {
    const g = interpretXrplError(new Error('VaultDeposit failed: tecNO_AUTH'), 'VaultDeposit')
    expect(g.code).toBe('tecNO_AUTH')
    expect(g.whatFailed).toBe('VaultDeposit')
    expect(g.meaning.toLowerCase()).toMatch(/not authorized|private vault/)
    expect(g.fix.toLowerCase()).toMatch(/credential|public vault/)
    const report = formatErrorReport(g)
    expect(report).toMatch(/WHAT FAILED\?/)
    expect(report).not.toMatch(/Something went wrong/)
  })

  it('classifies websocket failures as NETWORK / external DevNet', () => {
    const g = interpretXrplError(new Error('websocket disconnected'), 'VaultCreate')
    expect(g.category === 'NETWORK' || g.category === 'EXTERNAL DEVNET FAILURE').toBe(true)
  })

  it('explains LoanBrokerSet tecNO_PERMISSION as closed-ended vault requirement (DEVNET-001)', () => {
    const g = interpretXrplError(new Error('LoanBrokerSet failed: tecNO_PERMISSION'), 'LoanBrokerSet')
    expect(g.code).toBe('tecNO_PERMISSION')
    expect(g.meaning.toLowerCase()).toMatch(/closed-ended/)
    expect(g.fix.toLowerCase()).toMatch(/vaultkind/)
  })

  it('explains VaultWithdraw tecTOO_SOON as investment-phase lock', () => {
    const g = interpretXrplError(new Error('VaultWithdraw failed: tecTOO_SOON'), 'VaultWithdraw')
    expect(g.meaning.toLowerCase()).toMatch(/investment/)
    expect(g.fix.toLowerCase()).toMatch(/redemptiondate/)
  })

  it('maps fractional LoanPay amounts to temBAD_AMOUNT (DEVNET-003)', () => {
    const g = interpretXrplError(
      new Error('8000001.217659692176 is an illegal amount: 8000001.217659692176 is an illegal amount'),
      'LoanPay'
    )
    expect(g.code).toBe('temBAD_AMOUNT')
    expect(g.category).toBe('XRPL TRANSACTION CONSTRUCTION')
    expect(g.meaning.toLowerCase()).toMatch(/integer drops|periodicpayment/)
  })
})
