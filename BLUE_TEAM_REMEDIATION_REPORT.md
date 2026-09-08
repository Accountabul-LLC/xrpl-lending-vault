# BLUE TEAM REMEDIATION REPORT

```text
SECURITY PERSONA
Application:
Educational XRPL lending academy + in-browser Devnet wallet lab
Primary Role:
Wallet Security Engineer
Specializations:
Secret handling; frontend persistence
```

Assessment date: 2026-09-08  
Mode: blue-team (RT-001 / BT-001 only)  
Fix commit: `cc04f3d`  
Red Team commit tested: `e22714d` / report on `fc08557`

## Findings received

Operator selected **RT-001** (HIGH): family seeds persisted as plaintext JSON in `localStorage['jrpu-devnet-session']`.

## Fixed (READY FOR RETEST, not CLOSED)

| Blue | Red | Result |
| --- | --- | --- |
| BT-001 | RT-001 | Signing material is not written to Web Storage. Legacy `seeds` blobs are purged on load. |

## Blocked / deferred

RT-002–RT-012 remain OPEN. In-memory colocation of the three `Wallet` objects (RT-002) is unchanged — in-browser signing still requires keys in JS for the tab lifetime.

## Accepted risk

None for RT-001. Residual: XSS or an extension can still read `Wallet` objects from memory while the tab is open. That is inherent to a page-level signer, not durable storage.

## Root cause

The persist effect treated `wallet.seed` as equivalent to public ledger IDs so a refresh could restore faucet wallets.

## Chosen boundary (vs Red Team wrap advice)

Do not persist secrets. AES-GCM wrapping with a memory-only key cannot restore across refresh without putting the key back in storage, and would still yield to XSS while the tab is open. Memory-only keys + public ID persistence is the control that makes `localStorage.getItem` unable to reconstruct a signing key.

## Files changed

- `src/lab/session.ts` — public-ID session, secret detection, purge-on-load
- `src/lab/session.test.ts` — attack/authorized/legacy cases
- `src/lab/DevnetLab.tsx` — no `Wallet.fromSeed` from storage; persist IDs only
- `README.md`, `package.json` (`npm test` / vitest)

## Tests

`npx vitest run` — 5 passed.

Browser (preview `:4173`):

- Fresh lab storage is `{"vaultId":"","loanBrokerId":"","loanId":""}`
- Planted three `sEd…` seeds + fake vault ID → after Lab mount, storage has vault ID only, no seeds, discard log shown, planted addresses not restored
- Fund protocol operator (Devnet faucet, synthetic) succeeded; storage still had no `"seeds"` / `sEd` blob

## Residual risk

Keys remain in React state until refresh/clear. RT-002, RT-004, RT-005 still apply to that in-tab window. Independent Red Team retest: `READY_FOR_RETEST.md`.
