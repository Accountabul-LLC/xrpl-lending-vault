import { describe, expect, it } from 'vitest'
import {
  ADVANCED_ONLY_IDS,
  hopsForStep,
  isEntityVisible,
  LENDING_STAGES,
  lendingStageForStep,
  PROCESS_POSITIONS,
  stageProgress
} from './lendingProcess'

describe('lending process engine', () => {
  it('has seven loan-lifecycle stages', () => {
    expect(LENDING_STAGES).toHaveLength(7)
  })

  it('does not start the loan lifecycle until a request exists', () => {
    expect(lendingStageForStep(1)).toBeNull()
    expect(lendingStageForStep(4)).toBeNull()
    expect(lendingStageForStep(5)).toBe('application')
  })

  it('marks earlier stages done once servicing is active', () => {
    const p = stageProgress(9)
    expect(p.application).toBe('done')
    expect(p.funding).toBe('done')
    expect(p.servicing).toBe('active')
  })

  it('keeps the vault at the origin of the ecosystem', () => {
    expect(PROCESS_POSITIONS.vault).toEqual([0, 0, 0])
  })

  it('hides broker, guarantor, and the ledger until Advanced process is on', () => {
    expect(ADVANCED_ONLY_IDS).toEqual(['broker', 'guarantor', 'protocol'])
    expect(isEntityVisible('originator', false, false)).toBe(true)
    expect(isEntityVisible('custodian', false, false)).toBe(true)
    expect(isEntityVisible('broker', false, false)).toBe(false)
    expect(isEntityVisible('broker', true, false)).toBe(true)
    expect(isEntityVisible('protocol', true, false)).toBe(true)
    expect(isEntityVisible('agreement', true, false)).toBe(false)
  })

  it('routes the loan through desks instead of jumping straight to the vault', () => {
    expect(hopsForStep(5, false).map((h) => `${h.from}->${h.to}`)).toEqual([
      'borrower->originator',
      'originator->vault'
    ])
    expect(hopsForStep(5, true).map((h) => `${h.from}->${h.to}`)).toEqual([
      'borrower->broker',
      'broker->originator',
      'originator->vault'
    ])
    expect(hopsForStep(7, false).map((h) => `${h.from}->${h.to}`)).toEqual([
      'borrower->custodian',
      'custodian->vault',
      'vault->borrower'
    ])
    expect(hopsForStep(6, true).map((h) => `${h.from}->${h.to}`)).toEqual([
      'originator->underwriter',
      'underwriter->guarantor'
    ])
    expect(hopsForStep(9, false).map((h) => `${h.from}->${h.to}`)).toEqual([
      'borrower->servicer',
      'servicer->vault',
      'servicer->vault'
    ])
  })
})
