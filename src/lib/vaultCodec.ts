import { encode, encodeForSigning, decode, XrplDefinitions } from 'ripple-binary-codec'
import { sign as signKeypair } from 'ripple-keypairs'
import { sha512 } from '@xrplf/isomorphic/sha512'
import { bytesToHex, hexToBytes } from '@xrplf/isomorphic/utils'
import type { Wallet } from 'xrpl'
import bundled from 'ripple-binary-codec/dist/enums/definitions.json'

/**
 * LendingProtocolV1_1 fields that xrpl.js 4.x / ripple-binary-codec do not yet
 * ship. Wire codes match rippled `sfields.macro` on develop:
 *   VaultKind         UINT8  nth 22
 *   SubscriptionDate  UINT32 nth 75
 *   RedemptionDate    UINT32 nth 76
 */
export const VAULT_KIND_OPEN_ENDED = 0
export const VAULT_KIND_CLOSED_ENDED = 1

const EXTRA_FIELDS: Array<
  [
    string,
    {
      nth: number
      isVLEncoded: boolean
      isSerialized: boolean
      isSigningField: boolean
      type: string
    }
  ]
> = [
  [
    'VaultKind',
    {
      nth: 22,
      isVLEncoded: false,
      isSerialized: true,
      isSigningField: true,
      type: 'UInt8'
    }
  ],
  [
    'SubscriptionDate',
    {
      nth: 75,
      isVLEncoded: false,
      isSerialized: true,
      isSigningField: true,
      type: 'UInt32'
    }
  ],
  [
    'RedemptionDate',
    {
      nth: 76,
      isVLEncoded: false,
      isSerialized: true,
      isSigningField: true,
      type: 'UInt32'
    }
  ]
]

let cached: XrplDefinitions | null = null

export function lendingDefinitions(): XrplDefinitions {
  if (cached) return cached
  const names = new Set((bundled.FIELDS as Array<[string, unknown]>).map(([name]) => name))
  const fields = [...(bundled.FIELDS as Array<[string, unknown]>)]
  for (const extra of EXTRA_FIELDS) {
    if (!names.has(extra[0])) fields.push(extra)
  }
  cached = new XrplDefinitions({
    ...(bundled as object),
    FIELDS: fields
  } as unknown as ConstructorParameters<typeof XrplDefinitions>[0])
  return cached
}

export function encodeWithLendingDefs(tx: Record<string, unknown>): string {
  return encode(tx, lendingDefinitions())
}

export function decodeWithLendingDefs(blob: string): Record<string, unknown> {
  return decode(blob, lendingDefinitions()) as Record<string, unknown>
}

/**
 * Sign a transaction that includes fields the stock xrpl.js Wallet.sign
 * validator / codec would drop (notably closed-ended VaultCreate).
 */
export function signWithLendingDefs(
  wallet: Wallet,
  tx: Record<string, unknown>
): { tx_blob: string; tx: Record<string, unknown> } {
  const definitions = lendingDefinitions()
  const txToSign: Record<string, unknown> = { ...tx }
  for (const key of Object.keys(txToSign)) {
    if (txToSign[key] == null) delete txToSign[key]
  }
  txToSign.SigningPubKey = wallet.publicKey
  const signature = signKeypair(encodeForSigning(txToSign, definitions), wallet.privateKey)
  txToSign.TxnSignature = signature
  return {
    tx_blob: encode(txToSign, definitions),
    tx: txToSign
  }
}

/** Transaction ID (same as xrpl hashes.hashSignedTx) without decoding through the stock codec. */
export function hashSignedBlob(txBlob: string): string {
  const prefix = '54584E00'
  const digest = sha512(hexToBytes(prefix + txBlob))
  return bytesToHex(digest.slice(0, 32)).toUpperCase()
}

export const HASH_PREFIX_TX_SIGN = '53545800'
/** rippled HashPrefix::CounterpartyTxSign ('CPT') */
export const HASH_PREFIX_COUNTERPARTY_TX_SIGN = '43505400'

/**
 * LoanSet counterparty (borrower) signatures use a dedicated hash prefix (CPT),
 * not the broker's STX prefix. xrpl.js signLoanSetByCounterparty still signs
 * with STX, which DevNet rejects as "Counterparty: Invalid signature".
 */
export function signLoanSetByBorrower(
  borrower: Wallet,
  brokerSignedTx: Record<string, unknown> | string
): { tx: Record<string, unknown>; tx_blob: string } {
  const tx = {
    ...(typeof brokerSignedTx === 'string'
      ? (decode(brokerSignedTx) as Record<string, unknown>)
      : brokerSignedTx)
  }
  delete tx.CounterpartySignature
  const stx = encodeForSigning(tx)
  if (!stx.toUpperCase().startsWith(HASH_PREFIX_TX_SIGN)) {
    throw new Error(`encodeForSigning expected STX prefix, got ${stx.slice(0, 8)}`)
  }
  const cpt = HASH_PREFIX_COUNTERPARTY_TX_SIGN + stx.slice(8)
  tx.CounterpartySignature = {
    SigningPubKey: borrower.publicKey,
    TxnSignature: signKeypair(cpt, borrower.privateKey)
  }
  return { tx, tx_blob: encode(tx) }
}
