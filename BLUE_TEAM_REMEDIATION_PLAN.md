# BLUE TEAM REMEDIATION PLAN

```text
SECURITY PERSONA
Application:
Educational XRPL lending academy + in-browser Devnet wallet lab
Primary Role:
Wallet Security Engineer
Specializations:
Secret handling
Frontend persistence
Identity of faucet wallets
Reason:
The operator asked to remediate RT-001. The failed property is
confidentiality of family seeds at rest in Web Storage.
Priority:
Stop persisting extractable signing material; purge legacy plaintext seeds.
```

## Scope

In-scope: **BT-001 / RT-001 only** (operator-selected).

Out of scope this pass: RT-002 in-memory colocation, RT-004 dual-sign, CSP, LAN bind, amount validation. Adjacent same-class work is limited to **not hydrating `Wallet.fromSeed` from storage** (closes the persistence half of RT-012) and **stripping already-written `seeds` blobs**.

Authorized environment: local SPA. Synthetic seeds only in tests.

## Independent profile note

Agree with Red Team: this SPA is a Devnet signing client; durable seed storage is ASSET-001. Academy simulation is unrelated. No backend exists, so the control must live in the lab session layer — there is no cookie/httpOnly option.

## Root cause (not the symptom)

Symptom: `localStorage['jrpu-devnet-session']` contains `seeds.owner|depositor|borrower`.

Root cause: the persist effect treats `wallet.seed` as session state equivalent to public ledger IDs. Refresh convenience was implemented by writing extractable signing material to Web Storage.

## Design (disagreement with wrap-in-place)

Red Team listed wrap / external wallet / memory-only as options. **Wrapping ciphertext in `localStorage` with a key also in JS memory does not survive refresh without putting the key back in storage**, and XSS can still decrypt while the tab is open.

Chosen boundary: **do not persist secrets at all.**

| Persisted | Not persisted |
| --- | --- |
| `vaultId`, `loanBrokerId`, `loanId` (public ledger indexes) | family seeds, private keys, mnemonics |

Wallets remain in React state for the tab lifetime. Refresh discards signing keys; users re-fund. Ledger IDs still restore so the vault can be inspected.

This is a classroom UX change. It is the minimum control that makes `localStorage.getItem` unable to reconstruct a signing key.

## Tasks

- BT-001 ← RT-001: session module + DevnetLab + tests + copy/README

## Tests

- Authorized: persist/load public IDs still round-trips
- Original attack: after a funded-wallet persist, storage JSON has no seed material
- Adjacent: legacy payload with three `sEd…` seeds is purged on load and is not passed to `Wallet.fromSeed`
- Clear session removes the key

## Residual (do not claim CLOSED)

In-tab JS memory still holds `Wallet` objects (inherent to in-browser signing). Independent Red Team retest required.
