export type XrplHint = {
  code: string
  meaning: string
  action: string
}

const HINTS: Record<string, Omit<XrplHint, 'code'>> = {
  tecNO_AUTH: {
    meaning: 'The account is not authorized for this action.',
    action:
      'Confirm the account is allowed to hold or send this asset, then retry the same step.'
  },
  tecNO_PERMISSION: {
    meaning: 'This account does not have permission to change that ledger object.',
    action: 'Sign with the vault owner / Loan Broker account — not the depositor or borrower.'
  },
  tecUNFUNDED: {
    meaning: 'The account does not have enough XRP to send this transaction.',
    action: 'Fund or re-fund the wallet, then retry. DevNet faucet balances are limited.'
  },
  tecINSUFFICIENT_RESERVE: {
    meaning: 'The account would fall below the XRP reserve required by the ledger.',
    action: 'Leave extra XRP in the wallet for reserves and fees, then retry with a smaller amount.'
  },
  tecNO_DST: {
    meaning: 'The destination account does not exist on the ledger.',
    action: 'Fund the destination wallet first. XRPL accounts are not created until they are funded.'
  },
  tecNO_ENTRY: {
    meaning: 'The vault, loan, or Loan Broker object was not found on the ledger.',
    action: 'Confirm the ID is from this DevNet session. Resetting the Lab clears local IDs only.'
  },
  tecTOO_SOON: {
    meaning: 'The ledger rejected the action because a required waiting period has not elapsed.',
    action: 'Wait for the next payment window or grace period, then retry.'
  },
  temMALFORMED: {
    meaning: 'The transaction was not well-formed.',
    action: 'Check amounts, IDs, and required fields. Do not resubmit the same malformed payload.'
  },
  tefPAST_SEQ: {
    meaning: 'This transaction sequence was already used.',
    action: 'Do not resubmit a signed blob. Create a fresh transaction from the current sequence.'
  },
  tesSUCCESS: {
    meaning: 'The transaction was validated on the ledger.',
    action: 'No action needed. Refresh the object to see the new state.'
  }
}

const CODE_RE = /\b(t[eis][a-z]{1,20}|tec[A-Z0-9_]+|tem[A-Z0-9_]+|tef[A-Z0-9_]+|ter[A-Z0-9_]+)\b/i

export function parseXrplCode(message: string): string | null {
  const m = message.match(CODE_RE)
  return m ? m[1] : null
}

export function explainXrplError(message: string): XrplHint {
  const code = parseXrplCode(message) ?? 'UNKNOWN'
  const hint = HINTS[code]
  if (hint) return { code, ...hint }
  return {
    code,
    meaning: 'The XRP Ledger rejected this transaction.',
    action: 'Read the result code, confirm the previous step completed on-ledger, then retry.'
  }
}

export class XrplLabError extends Error {
  code: string
  txType: string

  constructor(txType: string, code: string) {
    super(`${txType} failed: ${code}`)
    this.name = 'XrplLabError'
    this.txType = txType
    this.code = code
  }
}
