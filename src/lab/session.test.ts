import { Wallet } from 'xrpl'
import { describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  clearLabSession,
  loadLabSession,
  persistLabSession,
  publicSessionFromUnknown,
  serializePersistedSession,
  sessionContainsExtractableSecret
} from './session'

function memoryStorage(initial?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(initial ?? {}))
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null
    },
    setItem(key: string, value: string) {
      map.set(key, String(value))
    },
    removeItem(key: string) {
      map.delete(key)
    }
  }
}

describe('lab session persistence (BT-001 / RT-001)', () => {
  it('round-trips public ledger IDs only', () => {
    const storage = memoryStorage()
    persistLabSession(storage, {
      vaultId: 'VAULT',
      loanBrokerId: 'BROKER',
      loanId: 'LOAN'
    })
    const loaded = loadLabSession(storage)
    expect(loaded.session).toEqual({ vaultId: 'VAULT', loanBrokerId: 'BROKER', loanId: 'LOAN' })
    expect(loaded.purgedSecrets).toBe(false)
    expect(sessionContainsExtractableSecret(storage.getItem(STORAGE_KEY))).toBe(false)
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({
      vaultId: 'VAULT',
      loanBrokerId: 'BROKER',
      loanId: 'LOAN'
    })
  })

  it('does not persist family seeds after a funded-wallet write (original attack)', () => {
    const owner = Wallet.generate()
    const depositor = Wallet.generate()
    const borrower = Wallet.generate()
    const storage = memoryStorage()

    persistLabSession(storage, {
      vaultId: 'VAULT',
      loanBrokerId: '',
      loanId: ''
    })

    const raw = storage.getItem(STORAGE_KEY)
    expect(raw).not.toContain(owner.seed)
    expect(raw).not.toContain(depositor.seed)
    expect(raw).not.toContain(borrower.seed)
    expect(sessionContainsExtractableSecret(raw)).toBe(false)
  })

  it('purges legacy plaintext seeds and does not return them', () => {
    const owner = Wallet.generate()
    const depositor = Wallet.generate()
    const borrower = Wallet.generate()
    const legacy = JSON.stringify({
      seeds: {
        owner: owner.seed,
        depositor: depositor.seed,
        borrower: borrower.seed
      },
      vaultId: 'ATTACKER_VAULT',
      loanBrokerId: 'BROKER',
      loanId: 'LOAN'
    })
    const storage = memoryStorage({ [STORAGE_KEY]: legacy })
    expect(sessionContainsExtractableSecret(storage.getItem(STORAGE_KEY))).toBe(true)

    const loaded = loadLabSession(storage)
    expect(loaded.purgedSecrets).toBe(true)
    expect(loaded.session.vaultId).toBe('ATTACKER_VAULT')
    expect(loaded.session.loanBrokerId).toBe('BROKER')
    expect(loaded.session.loanId).toBe('LOAN')

    const after = storage.getItem(STORAGE_KEY)
    expect(sessionContainsExtractableSecret(after)).toBe(false)
    expect(after).not.toContain(owner.seed!)
    expect(after).not.toContain(depositor.seed!)
    expect(after).not.toContain(borrower.seed!)
    expect(after).not.toMatch(/"seeds"/)
    expect(publicSessionFromUnknown(JSON.parse(legacy))).toEqual(loaded.session)
  })

  it('ignores foreign seed fields instead of hydrating wallets', () => {
    const planted = Wallet.generate()
    const parsed = publicSessionFromUnknown({
      seeds: { owner: planted.seed },
      privateKey: planted.privateKey,
      vaultId: 'ID'
    })
    expect(parsed).toEqual({ vaultId: 'ID', loanBrokerId: '', loanId: '' })
    expect(serializePersistedSession(parsed)).not.toContain(planted.seed)
  })

  it('clears the session key', () => {
    const storage = memoryStorage()
    persistLabSession(storage, { vaultId: 'X', loanBrokerId: '', loanId: '' })
    clearLabSession(storage)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })
})
