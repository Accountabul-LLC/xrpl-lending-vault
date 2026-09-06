export type StepStatus =
  | 'NOT READY'
  | 'READY'
  | 'SUBMITTING'
  | 'VALIDATING'
  | 'COMPLETE'
  | 'FAILED'

export type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export const STEP_META: Record<
  StepId,
  { name: string; short: string; wallet: string; explanation: string; txType: string }
> = {
  1: {
    name: 'Fund Wallets',
    short: 'FUND WALLETS',
    wallet: 'Vault Owner / Broker, Depositor, Borrower',
    explanation:
      'XRPL transactions require funded accounts. Before creating the vault or loan, the DevNet accounts participating in the transaction must exist and have sufficient DevNet XRP for reserves and transaction fees.',
    txType: 'DevNet faucet + account_info'
  },
  2: {
    name: 'Create Lending Vault',
    short: 'CREATE VAULT',
    wallet: 'Vault Owner / Loan Broker',
    explanation:
      'The vault is the on-ledger pool that holds one asset and receives deposits from liquidity providers. This lab creates a public closed-ended XRP vault (VaultKind=1). LendingProtocolV1_1 only allows a LoanBroker to attach to a closed-ended vault.',
    txType: 'VaultCreate'
  },
  3: {
    name: 'Deposit Into Vault',
    short: 'DEPOSIT',
    wallet: 'Depositor',
    explanation:
      "The depositor supplies the asset used by the vault. In return, the vault issues shares representing the depositor's proportional position.",
    txType: 'VaultDeposit'
  },
  4: {
    name: 'Create Loan Broker',
    short: 'LOAN BROKER',
    wallet: 'Vault Owner / Loan Broker',
    explanation:
      '“Protocol Loan Book” is the Lab’s view of lending activity for this vault. On XRPL, the native object created here is the LoanBroker. Individual loans are subsequently associated with that LoanBroker.',
    txType: 'LoanBrokerSet'
  },
  5: {
    name: 'Originate Loan',
    short: 'ORIGINATE',
    wallet: 'Loan Broker and Borrower (both must sign)',
    explanation:
      'Origination creates an on-ledger Loan agreement between the Loan Broker and Borrower using liquidity associated with the lending protocol. XRPL currently requires both parties to cosign LoanSet.',
    txType: 'LoanSet'
  },
  6: {
    name: 'Make Loan Payment',
    short: 'PAYMENT',
    wallet: 'Borrower',
    explanation:
      'Only the borrower associated with the active Loan can make payments on that Loan. The native transaction is LoanPay. XRPL supports regular, late, early-full, and overpayment behavior.',
    txType: 'LoanPay'
  },
  7: {
    name: 'Withdraw From Vault',
    short: 'WITHDRAW',
    wallet: 'Depositor',
    explanation:
      'A depositor withdraws by redeeming vault shares for available underlying assets. The native operation is VaultWithdraw. Assets Total and Assets Available are not the same: committed loan capital is not immediately redeemable.',
    txType: 'VaultWithdraw'
  },
  8: {
    name: 'Verify Final State',
    short: 'VERIFY',
    wallet: 'Read-only (any funded account)',
    explanation:
      'Re-query vault, shares, LoanBroker, and Loan objects from the validated ledger. Success means the objects still exist and balances match the lab session — not merely that a submit call returned.',
    txType: 'vault_info / ledger_entry / account_info'
  }
}

export interface Check {
  id: string
  label: string
  met: boolean
  detail?: string
}

export type VaultPhaseState = 'open-ended' | 'subscription' | 'investment' | 'redemption' | 'unknown'

export interface LabSnapshot {
  ownerAddress?: string
  depositorAddress?: string
  borrowerAddress?: string
  ownerFunded: boolean
  depositorFunded: boolean
  borrowerFunded: boolean
  ownerXrp: number
  depositorXrp: number
  borrowerXrp: number
  vaultExists: boolean
  vaultId?: string
  vaultPrivate: boolean
  vaultAsset: string
  vaultKind: number
  vaultPhase: VaultPhaseState
  subscriptionDate?: number
  redemptionDate?: number
  assetsTotal: number
  assetsAvailable: number
  assetsMaximum: number
  depositorShares: number
  brokerExists: boolean
  loanBrokerId?: string
  loanExists: boolean
  loanId?: string
  paymentMade: boolean
  withdrawMade: boolean
  verified: boolean
  depositAmount: number
  withdrawAmount: number
}

export interface StepView {
  id: StepId
  status: StepStatus
  checks: Check[]
  next: string
}

function allFunded(s: LabSnapshot): boolean {
  return s.ownerFunded && s.depositorFunded && s.borrowerFunded
}

export function checksForStep(id: StepId, s: LabSnapshot): Check[] {
  switch (id) {
    case 1:
      return [
        {
          id: 'owner',
          label: 'Vault owner / broker funded',
          met: s.ownerFunded,
          detail: s.ownerFunded ? `${s.ownerXrp} XRP on ledger` : 'Account missing or unfunded'
        },
        {
          id: 'depositor',
          label: 'Depositor funded',
          met: s.depositorFunded,
          detail: s.depositorFunded ? `${s.depositorXrp} XRP on ledger` : 'Account missing or unfunded'
        },
        {
          id: 'borrower',
          label: 'Borrower funded',
          met: s.borrowerFunded,
          detail: s.borrowerFunded ? `${s.borrowerXrp} XRP on ledger` : 'Account missing or unfunded'
        }
      ]
    case 2:
      return [
        { id: 'wallets', label: 'Wallets funded', met: allFunded(s) },
        { id: 'owner', label: 'Vault owner wallet selected', met: Boolean(s.ownerAddress) }
      ]
    case 3:
      return [
        { id: 'vault', label: 'Vault exists', met: s.vaultExists },
        { id: 'depositor', label: 'Depositor funded', met: s.depositorFunded },
        {
          id: 'holds',
          label: 'Depositor holds vault asset',
          met: s.depositorFunded && s.depositorXrp > s.depositAmount + 1,
          detail: `Vault asset is ${s.vaultAsset || 'XRP'}`
        },
        {
          id: 'asset',
          label: 'Correct asset',
          met: !s.vaultAsset || s.vaultAsset === 'XRP'
        },
        {
          id: 'cred',
          label: 'Private vault credential',
          met: !s.vaultPrivate,
          detail: s.vaultPrivate ? 'MISSING' : 'NOT REQUIRED'
        },
        {
          id: 'cap',
          label: 'Deposit amount ≤ available capacity',
          met:
            !s.vaultExists ||
            s.assetsMaximum <= 0 ||
            s.assetsTotal + s.depositAmount <= s.assetsMaximum
        },
        {
          id: 'phase',
          label: 'Vault in subscription phase (or open-ended)',
          met: !s.vaultExists || s.vaultPhase === 'subscription' || s.vaultPhase === 'open-ended',
          detail:
            s.vaultPhase === 'investment'
              ? 'MISSING — deposits close after SubscriptionDate'
              : s.vaultPhase === 'redemption'
                ? 'MISSING — vault is in redemption'
                : s.vaultPhase === 'subscription'
                  ? 'YES'
                  : s.vaultPhase
        }
      ]
    case 4:
      return [
        { id: 'wallets', label: 'Wallets funded', met: allFunded(s) },
        { id: 'vault', label: 'Vault created', met: s.vaultExists },
        {
          id: 'closed',
          label: 'Vault is closed-ended (VaultKind=1)',
          met: !s.vaultExists || s.vaultKind === 1,
          detail: s.vaultKind === 1 ? 'YES' : `NO (VaultKind=${s.vaultKind})`
        },
        { id: 'owner', label: 'Vault owner available to sign LoanBrokerSet', met: Boolean(s.ownerAddress) }
      ]
    case 5:
      return [
        { id: 'wallets', label: 'Wallets funded', met: allFunded(s) },
        { id: 'vault', label: 'Vault created', met: s.vaultExists },
        {
          id: 'liq',
          label: 'Liquidity deposited',
          met: s.assetsTotal > 0 && s.depositorShares > 0
        },
        { id: 'broker', label: 'Loan Broker created', met: s.brokerExists },
        { id: 'borrower', label: 'Borrower wallet ready to cosign', met: Boolean(s.borrowerAddress) },
        {
          id: 'phase',
          label: 'Vault in investment phase',
          met: !s.vaultExists || s.vaultPhase === 'investment' || s.vaultPhase === 'open-ended',
          detail:
            s.vaultPhase === 'subscription'
              ? 'NOT READY — wait until after SubscriptionDate'
              : s.vaultPhase === 'redemption'
                ? 'TOO LATE — vault is in redemption'
                : s.vaultPhase === 'investment'
                  ? 'YES'
                  : s.vaultPhase
        }
      ]
    case 6:
      return [
        { id: 'loan', label: 'Loan originated', met: s.loanExists },
        { id: 'borrower', label: 'Borrower funded', met: s.borrowerFunded }
      ]
    case 7:
      return [
        { id: 'vault', label: 'Vault exists', met: s.vaultExists },
        { id: 'shares', label: 'Depositor holds vault shares', met: s.depositorShares > 0 },
        {
          id: 'avail',
          label: 'Requested withdrawal ≤ assets available',
          met: s.assetsAvailable + 1e-9 >= s.withdrawAmount && s.withdrawAmount > 0,
          detail: `${s.assetsAvailable} XRP available`
        },
        {
          id: 'phase',
          label: 'Vault in redemption phase (or open-ended)',
          met: !s.vaultExists || s.vaultPhase === 'redemption' || s.vaultPhase === 'open-ended',
          detail:
            s.vaultPhase === 'investment'
              ? 'NOT READY — wait until RedemptionDate (tecTOO_SOON during investment)'
              : s.vaultPhase === 'subscription'
                ? 'Wait until redemption (after the investment window)'
                : s.vaultPhase === 'redemption'
                  ? 'YES'
                  : s.vaultPhase
        }
      ]
    case 8:
      return [
        { id: 'vault', label: 'Vault exists on ledger', met: s.vaultExists },
        { id: 'broker', label: 'Loan Broker exists on ledger', met: s.brokerExists },
        { id: 'loan', label: 'Loan exists on ledger', met: s.loanExists }
      ]
  }
}

export function isReady(checks: Check[]): boolean {
  return checks.every((c) => c.met)
}

export function computeStepStatus(
  id: StepId,
  s: LabSnapshot,
  busy: { step?: StepId; phase?: 'SUBMITTING' | 'VALIDATING' } | null,
  failedStep?: StepId | null
): StepStatus {
  if (busy?.step === id) return busy.phase ?? 'SUBMITTING'
  if (failedStep === id) return 'FAILED'
  const complete = isStepComplete(id, s)
  if (complete) return 'COMPLETE'
  return isReady(checksForStep(id, s)) ? 'READY' : 'NOT READY'
}

export function isStepComplete(id: StepId, s: LabSnapshot): boolean {
  switch (id) {
    case 1:
      return allFunded(s)
    case 2:
      return s.vaultExists
    case 3:
      return s.assetsTotal > 0 && s.depositorShares > 0
    case 4:
      return s.brokerExists
    case 5:
      return s.loanExists
    case 6:
      return s.paymentMade
    case 7:
      return s.withdrawMade
    case 8:
      return s.verified
  }
}

export function nextActionFor(id: StepId, status: StepStatus, s: LabSnapshot): string {
  if (status === 'SUBMITTING') return 'Wait for the wallet to sign and the client to submit.'
  if (status === 'VALIDATING') return 'Wait for XRPL DevNet to validate, then the lab will re-query the ledger.'
  if (status === 'FAILED') return 'Read the error below, fix the stated precondition, then retry this step.'
  if (status === 'COMPLETE') {
    const next = (id + 1) as StepId
    if (id === 8) return 'Lifecycle complete. Optionally reset the lab session and run again with new wallets.'
    return `Continue to step ${next}: ${STEP_META[next].name}.`
  }
  const missing = checksForStep(id, s).filter((c) => !c.met)
  if (missing.length) {
    return `Complete first: ${missing.map((c) => c.label).join('; ')}.`
  }
  switch (id) {
    case 1:
      return 'Fund all required DevNet wallets, then confirm balances from the ledger.'
    case 2:
      return 'Configure the public closed-ended XRP vault (VaultKind=1, AssetsMaximum, SubscriptionDate, RedemptionDate) and submit VaultCreate as the vault owner.'
    case 3:
      return 'Submit VaultDeposit from the depositor wallet during the subscription phase.'
    case 4:
      return 'Submit LoanBrokerSet as the vault owner to initialize the protocol loan book on this closed-ended vault.'
    case 5:
      return 'Wait until the investment phase, then have the loan broker sign LoanSet and the borrower cosign.'
    case 6:
      return 'Submit an on-time LoanPay from the borrower before Next Payment Due. Waiting until that timestamp makes the payment late (tecEXPIRED unless tfLoanLatePayment is set).'
    case 7:
      return 'Wait until RedemptionDate, then submit VaultWithdraw from the depositor for an amount ≤ Assets Available.'
    case 8:
      return 'Refresh vault, broker, loan, and balances from the validated ledger.'
  }
}

export function emptySnapshot(partial?: Partial<LabSnapshot>): LabSnapshot {
  return {
    ownerFunded: false,
    depositorFunded: false,
    borrowerFunded: false,
    ownerXrp: 0,
    depositorXrp: 0,
    borrowerXrp: 0,
    vaultExists: false,
    vaultPrivate: false,
    vaultAsset: 'XRP',
    vaultKind: 0,
    vaultPhase: 'unknown',
    assetsTotal: 0,
    assetsAvailable: 0,
    assetsMaximum: 0,
    depositorShares: 0,
    brokerExists: false,
    loanExists: false,
    paymentMade: false,
    withdrawMade: false,
    verified: false,
    depositAmount: 20,
    withdrawAmount: 3,
    ...partial
  }
}
