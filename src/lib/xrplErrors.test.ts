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

  it('extracts nested tec codes from wrapped errors', () => {
    expect(extractResultCode('LoanPay failed: tecINSUFFICIENT_FUNDS')).toBe('tecINSUFFICIENT_FUNDS')
  })
})
