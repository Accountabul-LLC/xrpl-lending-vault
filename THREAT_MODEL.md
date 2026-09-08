# THREAT MODEL — Implemented JRPU SPA

This model describes the **running application** (Academy + Live Devnet Lab), not the pre-implementation protocol design in `JRPU_THREAT_MODEL.md`. Design-doc threats (operator indexer, escrow finish ordering, EVM reentrancy) are recorded as Not Applicable to this codebase unless a matching component exists.

Authorized environment: local SPA + XRPL Devnet test assets. Impact of unauthorized signing is currently Devnet XRP, **except** if a mainnet-capable seed is introduced into the same storage path.

---

## Critical assets — abuse questions

### ASSET-001 Secret seeds

| Question | Answer |
| --- | --- |
| Who should access it? | Only the browser profile that funded the faucet wallets, for the lifetime of that lab session |
| Who should not? | Other origins, extensions without grant, other OS users, XSS, LAN visitors, Academy lesson code |
| Who can modify it? | Any script on the origin; any party with `localStorage` write; Re-fund button |
| What validates modification? | `Wallet.fromSeed` try/catch only; no integrity MAC, no origin-bound wrapping |
| If validation fails? | Seed skipped (`null` wallet); no alert that storage was tampered |
| Boundaries? | Same-origin policy only. No CSP. No httpOnly (cannot be; there is no server cookie). |

### ASSET-002 Transaction signing

| Question | Answer |
| --- | --- |
| Who should access it? | The role that owns the account, after intentional UI confirmation |
| Who should not? | Other roles, injected scripts, automated dual-sign without borrower intent |
| Who can modify tx fields? | Any caller of `src/lib/xrpl.ts` helpers; UI passes raw strings into `xrpToDrops` |
| What validates modification? | XRPL autofill + ledger te-codes after sign; **no client schema** on amounts/IDs |
| If validation fails? | Error string in activity log; key still in storage |
| Boundaries? | Ledger checks signatures; it cannot tell a user-intended click from XSS-driven `wallet.sign` |

### ASSET-003 Object IDs (VaultID / LoanBrokerID / LoanID)

| Question | Answer |
| --- | --- |
| Who should access it? | Session that created or was given those objects |
| Who should not? | An attacker steering deposits to their vault |
| Who can modify it? | `localStorage` JSON, React state, Restore-on-load |
| What validates? | `ledger_entry` fetch; **no binding** that vault owner seed matches vault Account |
| If validation fails? | Restore error in log; IDs still persisted |
| Boundaries? | Public ledger IDs plus local persistence |

### ASSET-006 Dual-signed LoanSet

| Question | Answer |
| --- | --- |
| Who should access it? | Broker and borrower as **separate** principals |
| Who should not? | A single page that silently applies both signatures |
| Who can modify it? | `createLoan()` holds both `Wallet` objects and cosigns in one function |
| What validates? | XRPL requires both signatures; the app supplies both from one origin |
| If validation fails? | LoanSet error; both keys remain |
| Boundaries? | Collapsed. Demo UX is the threat. |

---

## Realistic abuse scenarios

### T-01 XSS or script gadget steals all three seeds

A future DOM sink, compromised dependency, or malicious extension reads `localStorage['jrpu-devnet-session']` and exfiltrates `seeds.owner`, `seeds.depositor`, `seeds.borrower`. Attacker signs VaultWithdraw / LoanManage / LoanPay as any role.

### T-02 Shared or LAN browser dumps the lab session

`npm run dev` binds `0.0.0.0:5173`. A workstation on a café/LAN, or a shared computer that did not hit Clear session, exposes funded wallets. Physical/shared-access also reads DevTools → Application → Local Storage.

### T-03 Vault ID substitution (confused deputy)

Attacker writes `{ vaultId: "<attacker vault>", seeds: { depositor: "<victim seed>" } }`. Victim’s next Deposit sends XRP to the attacker-controlled vault. No check that `wallets.owner` created `vaultId`.

### T-04 One-click dual signature

Malicious or accidental `createLoan` uses operator + borrower keys already in memory. Borrower never sees a separate approval. XSS does not need a second origin to forge borrower consent.

### T-05 Unvalidated amounts / flags

Operator or XSS sets `depositAmount` / `principal` / `aprPercent` to extreme or non-numeric values. Client signs whatever `xrpToDrops` / flag packing accepts. Ledger may reject or may move unexpected value.

### T-06 Mainnet seed in Devnet storage

User (or malware) places a mainnet-capable family seed in `jrpu-devnet-session`. App will load it (`Wallet.fromSeed` is network-agnostic). Devnet submits do not spend mainnet XRP, but **the seed is now plaintext on disk/profile** and stolen by T-01.

### T-07 Clickjacking the signing UI

No `X-Frame-Options` / CSP `frame-ancestors`. If the SPA is hosted on a framable origin, an overlay could trick clicks on Fund / Deposit / Originate / Default.

### T-08 Faucet exhaustion (public host)

`fundRole` has no client rate limit. A public deployment can hammer `client.fundWallet()` against Ripple’s Devnet faucet.

### T-09 Error / console disclosure

`fetchVault` / `fetchLoan` / `fetchLoanBroker` `console.error` the exception object. Activity log interpolates `e.message`. Unlikely to print seeds today; increases recon for ledger IDs and te-codes.

### T-10 Dependency / prototype in the signing bundle

`xrpl` + `vite-plugin-node-polyfills` (Buffer, process, global) ship in the client. A compromised or vulnerable dependency runs with seed access.

### T-11 Academy is not a security boundary

Academy XSS (if introduced) is same-origin with the lab. Lesson query params are currently numeric/enum-safe; that is a control, not isolation.

### T-12 Irreversible lab actions without confirm

Default, cover withdraw, vault withdraw, Re-fund (orphans previous seed) execute on first click. Matches demo speed; fails “intentional authorization” for financial signing.

---

## Explicitly not modeled as this app’s bugs

- EVM reentrancy, flash loans, oracle manipulation — no EVM, no price oracle in code
- Custom smart-contract upgrade keys — no app-authored contract
- Off-ledger operator indexer / Payment Channel claims / SignerListSet — documented as unbuilt
- SQL / JWT / IDOR against a REST API — no backend
- Classroom simulation insolvency (`SimulationContext` reducer) — not ledger-affecting
