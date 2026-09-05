# Live DevNet Lending Lab — Test Report

Network: `wss://s.devnet.rippletest.net:51233` (XRPL DevNet)
Generated: 2026-09-05T08:49:28.696Z

Each run starts from a clean in-memory lab session with **new DevNet faucet wallets** and new ledger objects. Success requires `tesSUCCESS` plus an independent ledger query (`vault_info` / `ledger_entry` / `account_info`).

| Run | Fund | Vault | Deposit | Broker | Loan | Payment | Withdraw | Final | Result |
| --- | ---- | ----- | ------- | ------ | ---- | ------- | -------- | ----- | ------ |
| 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 3 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 4 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 5 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 6 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 7 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 8 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 9 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 10 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 11 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 12 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 13 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 14 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 15 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 16 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 17 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 18 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 19 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |
| 20 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS |

## Defects encountered while reaching the pass streak

### DEVNET-001

Run: pre-streak (reproduced while repairing the lab)
Step: LoanBrokerSet
Observed: LoanBrokerSet returned tecNO_PERMISSION on an open-ended vault. xrpl.js 4.x also could not encode VaultKind / SubscriptionDate / RedemptionDate, and submitAndWait decoded those blobs with the stock codec.
Root Cause: PROTOCOL PRECONDITION + XRPL TRANSACTION CONSTRUCTION
Fix: Create public closed-ended vaults (VaultKind=1) with a 45s subscription lead and 180s investment window. Sign/submit VaultCreate through the extended lending codec and submitBlobAndWait so stock decode is never used.
Regression Test: src/lib/vaultCodec.test.ts (closed-ended encode/sign/hash) and src/lib/vaultPhase.test.ts
Retest: PASS — LoanBrokerSet succeeds on closed-ended vaults during subscription

### DEVNET-002

Run: pre-streak (reproduced while repairing the lab)
Step: LoanSet
Observed: LoanSet rejected with Counterparty: Invalid signature
Root Cause: WALLET / SIGNING
Fix: xrpl.js signLoanSetByCounterparty signs with the STX prefix. rippled verifies CounterpartySignature with HashPrefix::CounterpartyTxSign (CPT / 43505400). signLoanSetByBorrower now rewrites STX→CPT before signing.
Regression Test: src/lib/vaultCodec.test.ts — signs LoanSet counterparty data with the CPT prefix
Retest: PASS — LoanSet validates with broker+borrower cosign

### DEVNET-003

Run: pre-streak (reproduced while repairing the lab)
Step: LoanPay
Observed: 8000001.217659692176 is an illegal amount
Root Cause: XRPL TRANSACTION CONSTRUCTION
Fix: PeriodicPayment is an STNumber that can include a fractional drop. LoanPay Amount is an STAmount and must be integer drops. roundUpDrops() ceils the ledger value before submit.
Regression Test: src/lib/amounts.test.ts and src/lib/loanPayAmount.test.ts
Retest: PASS — amount encoding no longer throws; live payment still requires on-time timing (DEVNET-004)

### DEVNET-004

Run: pre-streak (reproduced while repairing the lab)
Step: LoanPay
Observed: LoanPay returned tecEXPIRED after the lab waited until NextPaymentDueDate. A regular (unflagged) installment is not allowed once that timestamp is reached.
Root Cause: PROTOCOL PRECONDITION
Fix: Submit on-time LoanPay immediately after origination, before NextPaymentDueDate. If ledger time is already past due, set tfLoanLatePayment (0x00040000).
Regression Test: src/lib/loanPayAmount.test.ts (isLoanPayLate / loanPayFlags) and src/lib/xrplErrors.test.ts
Retest: PASS — 20 consecutive live DevNet runs paid on time before NextPaymentDueDate

## Final score

```
Wallet Funding            100%
Vault Creation            100%
Capacity Configuration    100%
Deposit                   100%
Loan Broker Creation      100%
Loan Origination          100%
Loan Payment              100%
Vault Withdrawal          100%
Ledger Verification       100%
Session Reset             100%
User Guidance             100%
```

```
LIVE DEVNET LAB
20 / 20 CONSECUTIVE RUNS PASSED
SUCCESS RATE:
100%
STATUS:
READY
```
