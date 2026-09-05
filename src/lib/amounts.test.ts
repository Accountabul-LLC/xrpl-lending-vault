import { describe, expect, it } from 'vitest'
import { ledgerAmountToXrp, percentToTenthsOfBps, tenthsOfBpsToPercent } from './amounts'

describe('amount helpers', () => {
  it('converts drop integers to XRP and leaves decimals alone', () => {
    expect(ledgerAmountToXrp('20000000')).toBe('20')
    expect(ledgerAmountToXrp('20.5')).toBe('20.5')
  })

  it('maps 1% management fee to ManagementFeeRate 1000', () => {
    expect(percentToTenthsOfBps(1)).toBe(1000)
    expect(tenthsOfBpsToPercent(1000)).toBe('1.00%')
    expect(percentToTenthsOfBps(8)).toBe(8000)
  })
})
