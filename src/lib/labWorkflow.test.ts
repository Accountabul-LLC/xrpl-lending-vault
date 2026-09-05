import { describe, expect, it } from 'vitest'
import {
  checksForStep,
  computeStepStatus,
  emptySnapshot,
  isReady,
  isStepComplete,
  nextActionFor
} from './labWorkflow'

describe('lab workflow prerequisites', () => {
  it('keeps originate-loan NOT READY until the loan broker exists', () => {
    const snap = emptySnapshot({
      ownerFunded: true,
      depositorFunded: true,
      borrowerFunded: true,
      ownerAddress: 'rOwner',
      depositorAddress: 'rDep',
      borrowerAddress: 'rBor',
      vaultExists: true,
      vaultKind: 1,
      vaultPhase: 'investment',
      assetsTotal: 20,
      depositorShares: 20,
      brokerExists: false
    })
    const checks = checksForStep(5, snap)
    expect(checks.find((c) => c.id === 'broker')?.met).toBe(false)
    expect(isReady(checks)).toBe(false)
    expect(computeStepStatus(5, snap, null, null)).toBe('NOT READY')
    expect(nextActionFor(5, 'NOT READY', snap)).toMatch(/Loan Broker/)
  })

  it('does not allow deposit into a private vault without credentials', () => {
    const snap = emptySnapshot({
      depositorFunded: true,
      depositorXrp: 80,
      vaultExists: true,
      vaultPrivate: true,
      vaultKind: 1,
      vaultPhase: 'subscription',
      vaultAsset: 'XRP',
      assetsMaximum: 100000,
      depositAmount: 20
    })
    const cred = checksForStep(3, snap).find((c) => c.id === 'cred')
    expect(cred?.met).toBe(false)
    expect(cred?.detail).toBe('MISSING')
  })

  it('blocks withdrawal above assets available', () => {
    const snap = emptySnapshot({
      vaultExists: true,
      depositorShares: 20,
      assetsAvailable: 2,
      withdrawAmount: 5,
      vaultKind: 1,
      vaultPhase: 'redemption'
    })
    expect(checksForStep(7, snap).find((c) => c.id === 'avail')?.met).toBe(false)
    expect(isStepComplete(7, snap)).toBe(false)
  })

  it('blocks origination until the closed-ended vault is in investment phase', () => {
    const snap = emptySnapshot({
      ownerFunded: true,
      depositorFunded: true,
      borrowerFunded: true,
      ownerAddress: 'rOwner',
      borrowerAddress: 'rBor',
      vaultExists: true,
      vaultKind: 1,
      vaultPhase: 'subscription',
      assetsTotal: 20,
      depositorShares: 20,
      brokerExists: true
    })
    expect(checksForStep(5, snap).find((c) => c.id === 'phase')?.met).toBe(false)
    expect(isReady(checksForStep(5, snap))).toBe(false)
  })

  it('blocks withdrawal during the investment phase', () => {
    const snap = emptySnapshot({
      vaultExists: true,
      vaultKind: 1,
      vaultPhase: 'investment',
      depositorShares: 20,
      assetsAvailable: 10,
      withdrawAmount: 3
    })
    expect(checksForStep(7, snap).find((c) => c.id === 'phase')?.met).toBe(false)
  })

  it('marks fund step complete only after all three wallets are ledger-funded', () => {
    const partial = emptySnapshot({ ownerFunded: true, depositorFunded: true, borrowerFunded: false })
    expect(isStepComplete(1, partial)).toBe(false)
    const full = emptySnapshot({ ownerFunded: true, depositorFunded: true, borrowerFunded: true })
    expect(isStepComplete(1, full)).toBe(true)
  })
})
