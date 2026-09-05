export type FailureCategory =
  | 'APPLICATION'
  | 'XRPL TRANSACTION CONSTRUCTION'
  | 'WALLET / SIGNING'
  | 'INVALID STATE'
  | 'STALE STATE'
  | 'UI'
  | 'DEVNET'
  | 'NETWORK'
  | 'PROTOCOL PRECONDITION'
  | 'EXTERNAL DEVNET FAILURE'

export interface ErrorGuidance {
  code: string
  meaning: string
  fix: string
  category: FailureCategory
}

const CODES: Record<string, Omit<ErrorGuidance, 'code'>> = {
  tesSUCCESS: {
    meaning: 'The transaction was applied and validated on XRPL DevNet.',
    fix: 'No action needed.',
    category: 'APPLICATION'
  },
  tecINSUFFICIENT_FUNDS: {
    meaning: 'The submitting account does not have enough of the required asset, or the vault does not have enough available liquidity.',
    fix: 'Check the account DevNet XRP balance, vault Assets Available, and the requested amount. Fund the wallet or lower the amount.',
    category: 'PROTOCOL PRECONDITION'
  },
  tecWRONG_ASSET: {
    meaning: 'The asset in the transaction does not match the vault or loan asset.',
    fix: 'This lab vault holds native XRP. Submit the amount as XRP drops, not a trust-line token or MPT.',
    category: 'XRPL TRANSACTION CONSTRUCTION'
  },
  tecNO_AUTH: {
    meaning: 'The account is not authorized for this private vault (missing credential / permissioned domain).',
    fix: 'Use a public vault, or create and attach the required credential before depositing.',
    category: 'PROTOCOL PRECONDITION'
  },
  tecNO_PERMISSION: {
    meaning: 'The submitting account is not allowed to perform this operation.',
    fix: 'LoanBrokerSet must be signed by the vault owner and the vault must be closed-ended. LoanPay must be signed by the borrower.',
    category: 'PROTOCOL PRECONDITION'
  },
  tecNO_ENTRY: {
    meaning: 'The referenced Vault, LoanBroker, or Loan object does not exist on the validated ledger.',
    fix: 'Reset the lab session and create a new vault and loan broker. Cached IDs from a previous session may be stale.',
    category: 'STALE STATE'
  },
  tecOBJECT_NOT_FOUND: {
    meaning: 'A ledger object specified in the transaction was not found.',
    fix: 'Refresh vault / broker / loan IDs from the ledger, or start a new lab session with new objects.',
    category: 'STALE STATE'
  },
  tecLIMIT_EXCEEDED: {
    meaning: 'The deposit would push vault Assets Total above AssetsMaximum.',
    fix: 'Lower the deposit amount or increase maximum capacity with VaultSet.',
    category: 'PROTOCOL PRECONDITION'
  },
  tecINSUFFICIENT_RESERVE: {
    meaning: 'The account does not have enough XRP to meet the reserve for the new ledger objects.',
    fix: 'Fund the vault owner / broker wallet with additional DevNet XRP, then retry.',
    category: 'PROTOCOL PRECONDITION'
  },
  tecTOO_SOON: {
    meaning: 'The protocol time condition is not yet met.',
    fix: 'For a closed-ended vault, wait until after SubscriptionDate to originate a loan, and until RedemptionDate to withdraw. For defaults, wait until the grace period elapses.',
    category: 'PROTOCOL PRECONDITION'
  },
  tecEXPIRED: {
    meaning: 'This action is no longer allowed at the current vault or loan phase.',
    fix: 'Deposits are only allowed during subscription. New loans are not allowed after RedemptionDate. Late LoanPay needs the late-payment flag.',
    category: 'PROTOCOL PRECONDITION'
  },
  tecKILLED: {
    meaning: 'The loan is already fully paid, so no further payment is allowed.',
    fix: 'Refresh the loan from the ledger. Next step is vault withdrawal or final verification.',
    category: 'PROTOCOL PRECONDITION'
  },
  tecFROZEN: {
    meaning: 'The asset is frozen for the sender, destination, or vault pseudo-account.',
    fix: 'This public XRP vault should not freeze. If it persists, reset the session and create a new vault.',
    category: 'PROTOCOL PRECONDITION'
  },
  tecLOCKED: {
    meaning: 'An MPT involved in the transaction is locked.',
    fix: 'Confirm the vault share issuance is not locked. Reset and create a new public XRP vault if needed.',
    category: 'PROTOCOL PRECONDITION'
  },
  temMALFORMED: {
    meaning: 'The transaction JSON is not validly formatted.',
    fix: 'Ensure VaultID / LoanBrokerID / LoanID are 64-character hex strings and required fields are present.',
    category: 'XRPL TRANSACTION CONSTRUCTION'
  },
  temDISABLED: {
    meaning: 'The Single Asset Vault or Lending Protocol amendment is not enabled on this network.',
    fix: 'Confirm you are connected to XRPL DevNet (wss://s.devnet.rippletest.net:51233), not Testnet or Mainnet.',
    category: 'DEVNET'
  },
  temBAD_AMOUNT: {
    meaning: 'The Amount field is invalid (zero, negative, fractional, or wrong encoding).',
    fix: 'Enter a positive whole-drop amount. LoanPay must not use the fractional PeriodicPayment STNumber; round it up to integer drops.',
    category: 'XRPL TRANSACTION CONSTRUCTION'
  },
  temINVALID: {
    meaning: 'A field value is outside the allowed range, or a fixed field was modified.',
    fix: 'Check ManagementFeeRate (0–10000 tenths of a basis point) and other protocol field limits.',
    category: 'XRPL TRANSACTION CONSTRUCTION'
  },
  telINSUF_FEE_P: {
    meaning: 'The transaction fee is too low for this operation. VaultCreate / LoanBrokerSet create extra ledger objects.',
    fix: 'The lab now requests a higher fee automatically. Retry the transaction.',
    category: 'XRPL TRANSACTION CONSTRUCTION'
  },
  tefPAST_SEQ: {
    meaning: 'The account sequence has already been consumed by another transaction.',
    fix: 'Retry. The client will autofill a fresh sequence.',
    category: 'NETWORK'
  },
  terRETRY: {
    meaning: 'The server asked the client to retry (ledger busy or not ready).',
    fix: 'Retry after a short delay. This is usually transient DevNet load.',
    category: 'DEVNET'
  },
  terQUEUED: {
    meaning: 'The transaction was queued and has not yet been validated.',
    fix: 'Wait for validation and query the transaction hash before treating it as complete.',
    category: 'DEVNET'
  },
  terNO_ACCOUNT: {
    meaning: 'The submitting account does not exist on the ledger.',
    fix: 'Fund the wallet from the DevNet faucet and confirm the account with account_info before submitting.',
    category: 'PROTOCOL PRECONDITION'
  }
}

const TX_CODE_OVERRIDES: Record<string, Record<string, Partial<ErrorGuidance>>> = {
  LoanBrokerSet: {
    tecNO_PERMISSION: {
      meaning:
        'LendingProtocolV1_1 only allows a LoanBroker to attach to a closed-ended vault. An open-ended vault (VaultKind omitted or 0) is rejected even when the signer is the vault owner.',
      fix: 'Create a public closed-ended vault (VaultKind=1) with future SubscriptionDate and RedemptionDate (gap ≥ 180 seconds), then submit LoanBrokerSet as the vault owner.',
      category: 'PROTOCOL PRECONDITION'
    }
  },
  VaultDeposit: {
    tecEXPIRED: {
      meaning:
        'Deposits are only allowed during the closed-ended vault subscription phase. The subscription window has closed (investment or redemption).',
      fix: 'Reset the lab session and create a new closed-ended vault, then deposit before SubscriptionDate.',
      category: 'PROTOCOL PRECONDITION'
    }
  },
  VaultWithdraw: {
    tecTOO_SOON: {
      meaning: 'Withdrawals are blocked during the closed-ended vault investment phase.',
      fix: 'Wait until RedemptionDate, then submit VaultWithdraw from the depositor.',
      category: 'PROTOCOL PRECONDITION'
    }
  },
  LoanPay: {
    temBAD_AMOUNT: {
      meaning:
        'LoanPay Amount is an STAmount and must be integer drops. PeriodicPayment on the Loan object is an STNumber and can have a fractional drop component (for example 8000001.217…). Submitting that fraction is rejected as an illegal amount.',
      fix: 'Round PeriodicPayment up to the next whole drop, then submit that integer as LoanPay Amount.',
      category: 'XRPL TRANSACTION CONSTRUCTION'
    },
    tecEXPIRED: {
      meaning:
        'A regular (on-time) LoanPay is not allowed after NextPaymentDueDate. Waiting until the due timestamp makes the installment late.',
      fix: 'Pay before Next Payment Due for a regular installment. If the due time has already passed, resubmit with tfLoanLatePayment (0x00040000). Late payments may also require late interest on top of PeriodicPayment.',
      category: 'PROTOCOL PRECONDITION'
    }
  },
  LoanSet: {
    tecTOO_SOON: {
      meaning: 'Loan origination is not allowed while the vault is still in the subscription phase.',
      fix: 'Wait until after SubscriptionDate (investment phase), then have the broker and borrower cosign LoanSet.',
      category: 'PROTOCOL PRECONDITION'
    },
    tecEXPIRED: {
      meaning: 'The vault has entered the redemption phase, so new loans are not allowed.',
      fix: 'Reset the session and create a new closed-ended vault if you still need to originate a loan.',
      category: 'PROTOCOL PRECONDITION'
    },
    tecNO_PERMISSION: {
      meaning:
        'The loan schedule (final payment + 60s redemption buffer) extends past the vault RedemptionDate, or a signer is not the broker/borrower.',
      fix: 'Use a 60-second payment interval and a single payment so the loan fits the 180-second investment window.',
      category: 'PROTOCOL PRECONDITION'
    }
  }
}

const NETWORK_HINTS = [
  'websocket',
  'disconnected',
  'econn',
  'etimedout',
  'network',
  'fetch failed',
  'socket',
  'timeout',
  'connection'
]

export function extractResultCode(error: unknown): string {
  if (!error) return 'unknown'
  const message = error instanceof Error ? error.message : String(error)
  if (/illegal amount/i.test(message)) return 'temBAD_AMOUNT'
  const fromCode = message.match(
    /\b(t(?:es|ec|em|ef|el|er)[A-Z0-9_]+)\b/
  )
  if (fromCode) return fromCode[1]
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code: unknown }).code)
  }
  return message.slice(0, 80) || 'unknown'
}

export function interpretXrplError(
  error: unknown,
  txType = 'Transaction'
): ErrorGuidance & { whatFailed: string; raw: string } {
  const raw = error instanceof Error ? error.message : String(error)
  const code = extractResultCode(error)
  const lower = raw.toLowerCase()
  const known = CODES[code]
  const isNetwork = NETWORK_HINTS.some((h) => lower.includes(h))
  const isExternal =
    isNetwork ||
    lower.includes('faucet') ||
    code === 'temDISABLED' ||
    lower.includes('unavailable')

  if (known) {
    const override = TX_CODE_OVERRIDES[txType]?.[code]
    return { code, whatFailed: txType, raw, ...known, ...override }
  }
  if (isExternal) {
    return {
      code,
      whatFailed: txType,
      raw,
      meaning: 'The XRPL DevNet endpoint or faucet did not complete the request.',
      fix: 'Wait and retry. Do not treat this as an application pass until DevNet responds.',
      category: isNetwork ? 'NETWORK' : 'EXTERNAL DEVNET FAILURE'
    }
  }
  return {
    code,
    whatFailed: txType,
    raw,
    meaning: raw || 'The transaction did not return tesSUCCESS.',
    fix: 'Inspect the technical details panel for the XRPL result code and the submitted JSON.',
    category: 'APPLICATION'
  }
}

export function formatErrorReport(guidance: ReturnType<typeof interpretXrplError>): string {
  return [
    `WHAT FAILED? ${guidance.whatFailed}`,
    `WHY? ${guidance.code}`,
    `WHAT DOES THAT MEAN? ${guidance.meaning}`,
    `HOW DO I FIX IT? ${guidance.fix}`
  ].join('\n')
}

export class XrplLabError extends Error {
  readonly guidance: ReturnType<typeof interpretXrplError>
  readonly txType: string
  readonly resultCode: string
  readonly receipt?: Record<string, unknown>

  constructor(txType: string, cause: unknown, receipt?: Record<string, unknown>) {
    const guidance = interpretXrplError(cause, txType)
    super(`${txType} failed: ${guidance.code}`)
    this.name = 'XrplLabError'
    this.guidance = guidance
    this.txType = txType
    this.resultCode = guidance.code
    this.receipt = receipt
  }
}
