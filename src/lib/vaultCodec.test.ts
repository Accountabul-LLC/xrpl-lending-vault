import { describe, expect, it } from 'vitest'
import { encode, encodeForSigning, hashes, Wallet } from 'xrpl'
import {
  HASH_PREFIX_COUNTERPARTY_TX_SIGN,
  HASH_PREFIX_TX_SIGN,
  VAULT_KIND_CLOSED_ENDED,
  decodeWithLendingDefs,
  encodeWithLendingDefs,
  hashSignedBlob,
  signLoanSetByBorrower,
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

  it('computes the same transaction hash as xrpl.js for stock blobs', () => {
    const wallet = Wallet.generate()
    const signed = wallet.sign({
      TransactionType: 'AccountSet',
      Account: wallet.address,
      Fee: '12',
      Sequence: 1,
      SigningPubKey: wallet.publicKey
    } as any)
    expect(hashSignedBlob(signed.tx_blob)).toBe(hashes.hashSignedTx(signed.tx_blob).toUpperCase())
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

  it('signs LoanSet counterparty data with the CPT prefix, not STX (DEVNET-002)', () => {
    const broker = Wallet.generate()
    const borrower = Wallet.generate()
    const unsigned = {
      TransactionType: 'AccountSet',
      Account: broker.address,
      Fee: '12',
      Sequence: 1,
      SigningPubKey: broker.publicKey
    }
    const stx = encodeForSigning(unsigned as any)
    expect(stx.toUpperCase().startsWith(HASH_PREFIX_TX_SIGN)).toBe(true)
    const brokerSigned = broker.sign({
      TransactionType: 'AccountSet',
      Account: broker.address,
      Fee: '12',
      Sequence: 1
    } as any)
    const fully = signLoanSetByBorrower(borrower, brokerSigned.tx_blob)
    const sig = (fully.tx.CounterpartySignature as { SigningPubKey: string; TxnSignature: string })
    expect(sig.SigningPubKey).toBe(borrower.publicKey)
    expect(sig.TxnSignature).toBeTruthy()
    expect(HASH_PREFIX_COUNTERPARTY_TX_SIGN).toBe('43505400')
  })
})
