import { describe, expect, it } from 'vitest'
import {
  lessonStartStep,
  lessonStepRange,
  paymentSplit,
  snapshotAfterStep,
  STORY,
  STORY_STEPS,
  stepHasMotion
} from './story'

describe('lending story snapshots', () => {
  it('has ten named business steps', () => {
    expect(STORY_STEPS).toHaveLength(10)
    expect(STORY_STEPS[0].title).toMatch(/Configure/)
    expect(STORY_STEPS[2].who).toMatch(/Depositor/)
    expect(STORY_STEPS[6].title).toMatch(/Fund/)
    expect(STORY_STEPS[9].what).toMatch(/application policy/)
  })

  it('starts empty so capital origin can be taught', () => {
    const s = snapshotAfterStep(0)
    expect(s.totalCapital).toBe(0)
    expect(s.vaultConfigured).toBe(false)
    expect(s.deposited).toBe(0)
  })

  it('fills the vault after deposit and keeps liquidity available', () => {
    const s = snapshotAfterStep(4)
    expect(s.vaultConfigured).toBe(true)
    expect(s.totalCapital).toBe(STORY.deposit)
    expect(s.availableLiquidity).toBe(STORY.deposit)
    expect(s.outstandingLoans).toBe(0)
  })

  it('funds the loan from vault liquidity', () => {
    const s = snapshotAfterStep(7)
    expect(s.outstandingLoans).toBe(STORY.loan)
    expect(s.availableLiquidity).toBe(STORY.deposit - STORY.loan)
    expect(s.outstandingPrincipal).toBe(STORY.loan)
  })

  it('splits repayment into principal and interest', () => {
    const split = paymentSplit()
    expect(split.principal + split.interest).toBeCloseTo(STORY.payment, 1)
    const after = snapshotAfterStep(9)
    expect(after.interestEarned).toBe(STORY.interestPortion)
    expect(after.outstandingLoans).toBeCloseTo(STORY.loan - STORY.principalPortion, 1)
    expect(after.availableLiquidity).toBeCloseTo(STORY.deposit - STORY.loan + STORY.principalPortion, 1)
  })

  it('accrues depositor yield without implying a native daily cash drop', () => {
    const after = snapshotAfterStep(10)
    expect(after.earnedYield).toBe(STORY.interestPortion)
    expect(after.vaultPosition).toBeCloseTo(STORY.deposit + STORY.interestPortion, 1)
    expect(STORY_STEPS[9].what.toLowerCase()).toContain('not as a native xrpl')
  })

  it('maps lessons onto the shared 10-step world', () => {
    expect(lessonStepRange(1)).toEqual([1, 4])
    expect(lessonStepRange(2)).toEqual([3, 4])
    expect(lessonStepRange(3)).toEqual([5, 7])
    expect(lessonStartStep(6)).toBe(9)
    expect(stepHasMotion(3)).toBe(true)
    expect(stepHasMotion(4)).toBe(false)
    expect(stepHasMotion(6)).toBe(true)
  })
})
