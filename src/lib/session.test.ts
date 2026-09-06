import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  RESET_DISCLAIMER,
  STORAGE_KEY,
  clearSessionStorage,
  emptySession,
  loadSession,
  saveSession
} from './session'

const store: Record<string, string> = {}

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key]
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v)
      },
      removeItem: (k: string) => {
        delete store[k]
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key]
      }
    }
  })
})

describe('lab session reset', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('clears cached vault/broker/loan ids without claiming to rewind DevNet', () => {
    saveSession({
      ...emptySession(),
      vaultId: 'VAULT',
      loanBrokerId: 'BROKER',
      loanId: 'LOAN',
      paymentMade: true
    })
    expect(loadSession().vaultId).toBe('VAULT')
    clearSessionStorage()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(loadSession().vaultId).toBe('')
    expect(RESET_DISCLAIMER).toMatch(/does not undo transactions already validated on XRPL DevNet/)
  })
})
