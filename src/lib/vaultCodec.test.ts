import { describe, expect, it } from 'vitest'
import { encode, decode, Wallet } from 'xrpl'
import {
  VAULT_KIND_CLOSED_ENDED,
  decodeWithLendingDefs,
  encodeWithLendingDefs,
  signWithLendingDefs
} from './vaultCodec'

describe('closed-ended VaultCreate codec (DEVNET-001)', () => {
  const baseTx = {
    TransactionType: 'VaultCreate',
    Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    Asset: { currency: 'XRP' },
    AssetsMaximum: '100000000000',
    WithdrawalPolicy: 1,
    Fee: '400000',
    Sequence: 1,
    VaultKind: VAULT_KIND_CLOSED_ENDED,
    SubscriptionDate: 800000000,
    RedemptionDate: 800000180
  }

  it('stock xrpl.js encode rejects VaultKind because the bundled codec does not know the field', () => {
    expect(() => encode(baseTx as any)).toThrow(/VaultKind is not defined/)
  })

  it('extended definitions keep VaultKind, SubscriptionDate, and RedemptionDate on the wire', () => {
    const blob = encodeWithLendingDefs(baseTx)
    const decoded = decodeWithLendingDefs(blob)
    expect(decoded.VaultKind).toBe(VAULT_KIND_CLOSED_ENDED)
    expect(decoded.SubscriptionDate).toBe(800000000)
    expect(decoded.RedemptionDate).toBe(800000180)
    expect(decoded.TransactionType).toBe('VaultCreate')
  })

  it('signs a closed-ended VaultCreate without Wallet.sign dropping the fields', () => {
    const wallet = Wallet.generate()
    const { tx_blob, tx } = signWithLendingDefs(wallet, {
      ...baseTx,
      Account: wallet.address
    })
    expect(tx.TxnSignature).toBeTruthy()
    const decoded = decodeWithLendingDefs(tx_blob)
    expect(decoded.VaultKind).toBe(VAULT_KIND_CLOSED_ENDED)
    expect(decoded.SubscriptionDate).toBe(800000000)
    expect(decoded.SigningPubKey).toBe(wallet.publicKey)
  })
})
