import { describe, expect, it } from 'vitest'
import {
  CLOSED_ENDED_MIN_INVESTMENT_SECONDS,
  LAB_PAYMENT_INTERVAL_SECONDS,
  LAB_PAYMENT_TOTAL,
  LOAN_REDEMPTION_BUFFER_SECONDS,
  VAULT_KIND_CLOSED_ENDED,
  VAULT_KIND_OPEN_ENDED,
  classifyVaultPhase,
  isValidClosedEndedGap,
  loanFitsRedemption
} from './vaultPhase'

describe('closed-ended vault phases', () => {
  const sub = 1000
  const red = sub + CLOSED_ENDED_MIN_INVESTMENT_SECONDS

  it('treats VaultKind 0 / omitted as open-ended', () => {
    expect(
      classifyVaultPhase({ vaultKind: VAULT_KIND_OPEN_ENDED, nowRippleTime: sub - 1 })
    ).toBe('open-ended')
    expect(classifyVaultPhase({ nowRippleTime: sub })).toBe('open-ended')
  })

  it('classifies subscription, investment, and redemption like rippled getVaultPhase', () => {
    const base = {
      vaultKind: VAULT_KIND_CLOSED_ENDED,
      subscriptionDate: sub,
      redemptionDate: red
    }
    expect(classifyVaultPhase({ ...base, nowRippleTime: sub })).toBe('subscription')
    expect(classifyVaultPhase({ ...base, nowRippleTime: sub - 1 })).toBe('subscription')
    expect(classifyVaultPhase({ ...base, nowRippleTime: sub + 1 })).toBe('investment')
    expect(classifyVaultPhase({ ...base, nowRippleTime: red - 1 })).toBe('investment')
    expect(classifyVaultPhase({ ...base, nowRippleTime: red })).toBe('redemption')
  })

  it('rejects a closed-ended gap shorter than 180 seconds', () => {
    expect(isValidClosedEndedGap(sub, sub + 179)).toBe(false)
    expect(isValidClosedEndedGap(sub, sub + 180)).toBe(true)
  })

  it('fits a 60s / 1-payment lab loan in the 180s investment window', () => {
    const origination = sub + 1
    expect(
      loanFitsRedemption({
        originationRippleTime: origination,
        paymentIntervalSeconds: LAB_PAYMENT_INTERVAL_SECONDS,
        paymentTotal: LAB_PAYMENT_TOTAL,
        redemptionDate: red
      })
    ).toBe(true)
    expect(origination + LAB_PAYMENT_INTERVAL_SECONDS + LOAN_REDEMPTION_BUFFER_SECONDS).toBeLessThanOrEqual(
      red
    )
  })

  it('rejects a 30-day / 12-payment loan that overruns RedemptionDate', () => {
    expect(
      loanFitsRedemption({
        originationRippleTime: sub + 1,
        paymentIntervalSeconds: 2592000,
        paymentTotal: 12,
        redemptionDate: red
      })
    ).toBe(false)
  })
})
